import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlurAreaPanel } from "@/features/blur/BlurAreaPanel";
import { applyBlurArea, deleteBlurPreview } from "@/services/blur/blurService";
import { useBlurStore } from "@/stores/blurStore";
import { useAssetStore } from "@/stores/assetStore";
import { useUiStore } from "@/stores/uiStore";
import type { Asset } from "@/types/asset";

vi.mock("@/services/blur/blurService", async () => {
  const actual = await vi.importActual<typeof import("@/services/blur/blurService")>("@/services/blur/blurService");
  return { ...actual, applyBlurArea: vi.fn(), deleteBlurPreview: vi.fn() };
});

const asset: Asset = { asset_id: "asset-1", filename: "sample.png", content_url: "/sample.png", metadata: { width: 16, height: 12, format: "PNG", file_size: 100, channels: 4, color_mode: "RGBA", color_space: "sRGB", has_transparency: true } };
const preview: Asset = { ...asset, asset_id: "preview-1", content_url: "/preview.png" };
const applied: Asset = { ...asset, asset_id: "revision-1", content_url: "/revision.png" };

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(applyBlurArea).mockReset();
  vi.mocked(deleteBlurPreview).mockReset().mockResolvedValue();
  useAssetStore.setState({ asset, status: "success", error: null });
  useBlurStore.setState({ status: "idle", error: null, previewAsset: null });
  useUiStore.setState({ locale: "en", theme: "dark", sidebarOpen: false, propertiesOpen: true, activeTool: "blur" });
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("BlurAreaPanel", () => {
  it("renders one-region Gaussian controls", () => {
    render(<BlurAreaPanel onClose={vi.fn()} region={{ x: 0, y: 0, width: 16, height: 12 }} onRegionPreview={vi.fn()} />);
    expect(screen.getByLabelText("Blur area panel")).toBeInTheDocument();
    expect(screen.getByLabelText("Kernel size")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Sigma" })).toBeInTheDocument();
    expect(screen.getByLabelText("X")).toHaveValue(0);
    expect(screen.getByLabelText("Width")).toHaveValue(16);
  });

  it("sends a debounced preview without changing the committed asset", async () => {
    vi.mocked(applyBlurArea).mockResolvedValue(preview);
    render(<BlurAreaPanel onClose={vi.fn()} region={{ x: 0, y: 0, width: 16, height: 12 }} onRegionPreview={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Sigma"), { target: { value: "5" } });
    expect(useAssetStore.getState().asset?.asset_id).toBe("asset-1");
    await act(async () => { vi.advanceTimersByTime(220); await Promise.resolve(); });
    expect(applyBlurArea).toHaveBeenCalledWith(expect.objectContaining({ asset_id: "asset-1", preview: true, sigma: 5 }));
    expect(useAssetStore.getState().asset?.asset_id).toBe("asset-1");
  });

  it("applies one revision and closes without local history", async () => {
    vi.mocked(applyBlurArea).mockResolvedValue(applied);
    const onClose = vi.fn();
    render(<BlurAreaPanel onClose={onClose} region={{ x: 0, y: 0, width: 16, height: 12 }} onRegionPreview={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await act(async () => { await Promise.resolve(); });
    expect(applyBlurArea).toHaveBeenCalledWith(expect.objectContaining({ asset_id: "asset-1", preview: false }));
    expect(useAssetStore.getState().asset?.asset_id).toBe("revision-1");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("cancels and resets without changing the committed asset", () => {
    const onClose = vi.fn();
    render(<BlurAreaPanel onClose={onClose} region={{ x: 0, y: 0, width: 16, height: 12 }} onRegionPreview={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Sigma"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("slider", { name: "Sigma" })).toHaveValue("3");
    expect(useAssetStore.getState().asset?.asset_id).toBe("asset-1");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(useBlurStore.getState().previewAsset).toBeNull();
  });
});
