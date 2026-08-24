import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WatermarkPanel } from "@/features/watermark/WatermarkPanel";
import { useWatermarkStore } from "@/stores/watermarkStore";
import { useAssetStore } from "@/stores/assetStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useUiStore } from "@/stores/uiStore";
import { applyWatermark, deleteWatermarkPreview } from "@/services/watermark/watermarkService";
import type { Asset } from "@/types/asset";

vi.mock("@/services/watermark/watermarkService", async () => {
  const actual = await vi.importActual<typeof import("@/services/watermark/watermarkService")>("@/services/watermark/watermarkService");
  return { ...actual, applyWatermark: vi.fn(), deleteWatermarkPreview: vi.fn() };
});

const asset: Asset = { asset_id: "asset-1", filename: "sample.png", content_url: "/sample.png", metadata: { width: 160, height: 100, format: "PNG", file_size: 100, channels: 4, color_mode: "RGBA", color_space: "sRGB", has_transparency: true } };
const preview: Asset = { ...asset, asset_id: "preview-1", content_url: "/preview.png" };
const applied: Asset = { ...asset, asset_id: "revision-1", content_url: "/revision.png" };

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(applyWatermark).mockReset();
  vi.mocked(deleteWatermarkPreview).mockReset().mockResolvedValue();
  useAssetStore.setState({ asset, status: "success", error: null });
  useHistoryStore.getState().clear();
  useHistoryStore.getState().setCurrentAsset(asset);
  useWatermarkStore.setState({ status: "idle", error: null, previewAsset: null });
  useUiStore.setState({ locale: "en", theme: "dark", sidebarOpen: false, propertiesOpen: true, activeTool: "watermark" });
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("WatermarkPanel", () => {
  it("renders text, font, color, placement, opacity, rotation, alignment and lifecycle controls", () => {
    render(<WatermarkPanel onClose={vi.fn()} />);
    expect(screen.getByLabelText("Watermark text")).toBeInTheDocument();
    expect(screen.getByLabelText("Font")).toBeInTheDocument();
    expect(screen.getByLabelText("Text color")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Opacity" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Rotation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Horizontal alignment")).toBeInTheDocument();
    expect(screen.getByLabelText("Vertical alignment")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("sends a debounced preview without mutating the committed asset", async () => {
    vi.mocked(applyWatermark).mockResolvedValue(preview);
    render(<WatermarkPanel onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Watermark text"), { target: { value: "Hello" } });
    await act(async () => { vi.advanceTimersByTime(220); await Promise.resolve(); });
    expect(applyWatermark).toHaveBeenCalledWith(expect.objectContaining({ asset_id: "asset-1", text: "Hello", preview: true, font_family: "dejavu_sans" }));
    expect(useAssetStore.getState().asset?.asset_id).toBe("asset-1");
  });

  it("applies one revision and one centralized history entry", async () => {
    vi.mocked(applyWatermark).mockResolvedValue(applied);
    const onClose = vi.fn();
    render(<WatermarkPanel onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await act(async () => { await Promise.resolve(); });
    expect(applyWatermark).toHaveBeenCalledWith(expect.objectContaining({ asset_id: "asset-1", preview: false }));
    expect(useAssetStore.getState().asset?.asset_id).toBe("revision-1");
    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().past[0].tool).toBe("watermark");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("cancels and resets without creating history", () => {
    const onClose = vi.fn();
    const firstRender = render(<WatermarkPanel onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Watermark text"), { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(useWatermarkStore.getState().previewAsset).toBeNull();
    expect(useHistoryStore.getState().past).toHaveLength(0);
    firstRender.unmount();
    render(<WatermarkPanel onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Font size value"), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText("Font size value")).toHaveValue(32);
    expect(useHistoryStore.getState().past).toHaveLength(0);
  });
});
