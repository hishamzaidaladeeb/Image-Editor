import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreativePanel } from "@/features/creative/CreativePanel";
import { useAssetStore } from "@/stores/assetStore";
import { useCreativeStore } from "@/stores/creativeStore";
import { useUiStore } from "@/stores/uiStore";
import { applyCreative, deleteCreativePreview, sampleCreativePixel } from "@/services/creative/creativeService";
import type { Asset } from "@/types/asset";

vi.mock("@/services/creative/creativeService", async () => {
  const actual = await vi.importActual<typeof import("@/services/creative/creativeService")>("@/services/creative/creativeService");
  return { ...actual, applyCreative: vi.fn(), deleteCreativePreview: vi.fn(), sampleCreativePixel: vi.fn() };
});

const asset: Asset = { asset_id: "asset-1", filename: "sample.png", content_url: "/sample.png", metadata: { width: 16, height: 12, format: "PNG", file_size: 100, channels: 4, color_mode: "RGBA", color_space: "sRGB", has_transparency: true } };
const preview: Asset = { ...asset, asset_id: "preview-1", content_url: "/preview.png" };
const applied: Asset = { ...asset, asset_id: "revision-1", content_url: "/revision.png" };

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(applyCreative).mockReset();
  vi.mocked(deleteCreativePreview).mockReset().mockResolvedValue();
  vi.mocked(sampleCreativePixel).mockReset();
  useAssetStore.setState({ asset, status: "success", error: null });
  useCreativeStore.setState({ operation: "look", preset: "vivid", look: "vintage", parameters: { temperature: 0, tint: 0, shadows: 0, highlights: 0 }, status: "idle", error: null, previewAsset: null, appliedParameters: null, sample: null, sampleMode: "pixel_inspector", history: [] });
  useUiStore.setState({ locale: "en", theme: "dark", sidebarOpen: false, propertiesOpen: true, activeTool: "creative" });
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("CreativePanel", () => {
  it("renders looks and tonal controls from the approved scope", () => {
    render(<CreativePanel onClose={vi.fn()} />);
    expect(screen.getByLabelText("Feature type")).toBeInTheDocument();
    expect(screen.getByLabelText("Creative Look")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Color Picker" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Feature type"), { target: { value: "tonal" } });
    expect(screen.getByRole("slider", { name: "Temperature" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Tint" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Shadows" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Highlights" })).toBeInTheDocument();
  });

  it("sends a debounced preview without changing the committed asset", async () => {
    vi.mocked(applyCreative).mockResolvedValue(preview);
    render(<CreativePanel onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Creative Look"), { target: { value: "cinematic" } });
    expect(useAssetStore.getState().asset?.asset_id).toBe("asset-1");
    await act(async () => { vi.advanceTimersByTime(220); await Promise.resolve(); });
    expect(applyCreative).toHaveBeenCalledWith(expect.objectContaining({ asset_id: "asset-1", operation: "look", look: "cinematic", preview: true }));
    expect(useAssetStore.getState().asset?.asset_id).toBe("asset-1");
  });

  it("applies a revision and records history", async () => {
    vi.mocked(applyCreative).mockResolvedValue(applied);
    const onClose = vi.fn();
    render(<CreativePanel onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await act(async () => { await Promise.resolve(); });
    expect(applyCreative).toHaveBeenCalledWith(expect.objectContaining({ asset_id: "asset-1", operation: "look", preview: false }));
    expect(useAssetStore.getState().asset?.asset_id).toBe("revision-1");
    expect(useCreativeStore.getState().history).toHaveLength(1);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("cancels without history and restores tonal defaults on reset", () => {
    const onClose = vi.fn();
    render(<CreativePanel onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Feature type"), { target: { value: "tonal" } });
    fireEvent.change(screen.getByRole("slider", { name: "Temperature" }), { target: { value: "60" } });
    expect(useCreativeStore.getState().parameters.temperature).toBe(60);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(useCreativeStore.getState().previewAsset).toBeNull();
    expect(useCreativeStore.getState().history).toHaveLength(0);
    cleanup();
    render(<CreativePanel onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Feature type"), { target: { value: "tonal" } });
    fireEvent.change(screen.getByRole("slider", { name: "Temperature" }), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(useCreativeStore.getState().parameters.temperature).toBe(0);
    expect(useCreativeStore.getState().parameters.tint).toBe(0);
    expect(useCreativeStore.getState().parameters.shadows).toBe(0);
    expect(useCreativeStore.getState().parameters.highlights).toBe(0);
  });

  it("renders a real sample returned by the sampling service", async () => {
    vi.mocked(sampleCreativePixel).mockResolvedValue({ asset_id: "asset-1", mode: "pixel_inspector", x: 4, y: 5, red: 12, green: 34, blue: 56, alpha: 200, luminance: 30, hex_color: "#0C2238", color_mode: "RGBA", channels: 4 });
    await act(async () => { await useCreativeStore.getState().samplePixel(asset, 4, 5, "pixel_inspector"); });
    expect(sampleCreativePixel).toHaveBeenCalledWith({ asset_id: "asset-1", x: 4, y: 5, mode: "pixel_inspector" });
    expect(useCreativeStore.getState().sample?.hex_color).toBe("#0C2238");
    expect(useCreativeStore.getState().sample?.alpha).toBe(200);
  });
});
