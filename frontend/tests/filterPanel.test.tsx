import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FilterPanel } from "@/features/filter/FilterPanel";
import { useAssetStore } from "@/stores/assetStore";
import { useFilterStore } from "@/stores/filterStore";
import { useUiStore } from "@/stores/uiStore";
import type { Asset } from "@/types/asset";
import { applyFilter, deleteFilterPreview } from "@/services/filter/filterService";

vi.mock("@/services/filter/filterService", async () => {
  const actual = await vi.importActual<typeof import("@/services/filter/filterService")>("@/services/filter/filterService");
  return { ...actual, applyFilter: vi.fn(), deleteFilterPreview: vi.fn() };
});

const asset: Asset = { asset_id: "asset-1", filename: "sample.png", content_url: "/sample.png", metadata: { width: 16, height: 12, format: "PNG", file_size: 100, channels: 4, color_mode: "RGBA", color_space: "sRGB", has_transparency: true } };
const preview: Asset = { ...asset, asset_id: "preview-1", content_url: "/preview.png" };
const applied: Asset = { ...asset, asset_id: "revision-1", content_url: "/revision.png" };

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(applyFilter).mockReset();
  vi.mocked(deleteFilterPreview).mockReset().mockResolvedValue();
  useAssetStore.setState({ asset, status: "success", error: null });
  useFilterStore.setState({ operation: "gaussian_blur", parameters: { kernel_size: 3, sigma: 1, diameter: 5, sigma_color: 75, sigma_space: 75, amount: 1, threshold: 0, axis: "both", low_threshold: 50, high_threshold: 150, aperture_size: 3, l2_gradient: false, shape: "rect", iterations: 1 }, status: "idle", error: null, previewAsset: null, history: [] });
  useUiStore.setState({ locale: "en", theme: "dark", sidebarOpen: false, propertiesOpen: true, activeTool: "filters" });
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("FilterPanel", () => {
  it("renders operation-specific controls and supports switching operations", () => {
    render(<FilterPanel onClose={vi.fn()} />);
    expect(screen.getByLabelText("Filter operation")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Kernel size" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Sigma" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filter operation"), { target: { value: "canny" } });
    expect(screen.getByRole("slider", { name: "Low threshold" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "High threshold" })).toBeInTheDocument();
    expect(screen.getByLabelText("L2 gradient")).toBeInTheDocument();
  });

  it("sends a debounced real preview request without changing the committed asset", async () => {
    vi.mocked(applyFilter).mockResolvedValue(preview);
    render(<FilterPanel onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole("slider", { name: "Sigma" }), { target: { value: "2.5" } });
    expect(useAssetStore.getState().asset?.asset_id).toBe("asset-1");
    await act(async () => { vi.advanceTimersByTime(220); await Promise.resolve(); });
    expect(applyFilter).toHaveBeenCalledWith(expect.objectContaining({ asset_id: "asset-1", operation: "gaussian_blur", sigma: 2.5, preview: true }));
    expect(useAssetStore.getState().asset?.asset_id).toBe("asset-1");
  });

  it("applies a revision and closes the panel", async () => {
    vi.mocked(applyFilter).mockResolvedValue(applied);
    const onClose = vi.fn();
    render(<FilterPanel onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await act(async () => { await Promise.resolve(); });
    expect(applyFilter).toHaveBeenCalledWith(expect.objectContaining({ asset_id: "asset-1", operation: "gaussian_blur", preview: false }));
    expect(useAssetStore.getState().asset?.asset_id).toBe("revision-1");
    expect(useFilterStore.getState().history).toHaveLength(1);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("cancels the preview without creating history and resets parameters", () => {
    const onClose = vi.fn();
    const firstRender = render(<FilterPanel onClose={onClose} />);
    fireEvent.change(screen.getByRole("slider", { name: "Sigma" }), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(useFilterStore.getState().previewAsset).toBeNull();
    expect(useFilterStore.getState().history).toHaveLength(0);
    firstRender.unmount();
    render(<FilterPanel onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole("slider", { name: "Sigma" }), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("slider", { name: "Sigma" })).toHaveValue("1");
  });
});
