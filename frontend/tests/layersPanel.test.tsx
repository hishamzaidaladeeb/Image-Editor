import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LayersPanel } from "@/features/layers/LayersPanel";
import { useLayersStore } from "@/stores/layersStore";
import { useAssetStore } from "@/stores/assetStore";
import { useHistoryStore } from "@/stores/historyStore";
import { applyLayers, deleteLayersPreview } from "@/services/layers/layersService";
import type { Asset } from "@/types/asset";

vi.mock("@/services/layers/layersService", async () => {
  const actual = await vi.importActual<typeof import("@/services/layers/layersService")>("@/services/layers/layersService");
  return { ...actual, applyLayers: vi.fn(), deleteLayersPreview: vi.fn() };
});

const asset: Asset = { asset_id: "asset-1", filename: "sample.png", content_url: "/sample.png", metadata: { width: 160, height: 100, format: "PNG", file_size: 100, channels: 4, color_mode: "RGBA", color_space: "sRGB", has_transparency: true } };
const applied: Asset = { ...asset, asset_id: "revision-1", content_url: "/revision.png" };

beforeEach(() => {
  vi.mocked(applyLayers).mockReset();
  vi.mocked(deleteLayersPreview).mockReset().mockResolvedValue();
  useAssetStore.setState({ asset, status: "success", error: null });
  useHistoryStore.getState().clear();
  useHistoryStore.getState().setCurrentAsset(asset);
  useLayersStore.setState({ layers: [], selectedId: null, status: "idle", error: null, previewAsset: null });
});

afterEach(() => cleanup());

describe("LayersPanel", () => {
  it("renders layer controls and adds the current asset as an object preview", () => {
    render(<LayersPanel asset={asset} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Add Current" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload Layer" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Current" }));
    expect(screen.getByText("Layer 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Layer X")).toHaveValue("0");
    expect(screen.getByLabelText("Layer Y")).toHaveValue("0");
    expect(screen.getByLabelText("Layer Scale")).toHaveValue("1");
    expect(screen.getByRole("slider", { name: "Layer opacity" })).toBeInTheDocument();
  });

  it("updates layer objects without mutating the committed asset or creating history", () => {
    render(<LayersPanel asset={asset} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add Current" }));
    fireEvent.change(screen.getByLabelText("Layer X"), { target: { value: "32" } });
    fireEvent.change(screen.getByLabelText("Layer Rotation"), { target: { value: "18" } });
    expect(useLayersStore.getState().layers[0].x).toBe(32);
    expect(useLayersStore.getState().layers[0].rotation).toBe(18);
    expect(useAssetStore.getState().asset?.asset_id).toBe("asset-1");
    expect(useHistoryStore.getState().past).toHaveLength(0);
  });

  it("applies one flattened revision and one history entry", async () => {
    vi.mocked(applyLayers).mockResolvedValue(applied);
    const onClose = vi.fn();
    render(<LayersPanel asset={asset} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Add Current" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await act(async () => { await Promise.resolve(); });
    expect(applyLayers).toHaveBeenCalledWith(expect.objectContaining({ asset_id: "asset-1", preview: false, layers: expect.any(Array) }));
    expect(useAssetStore.getState().asset?.asset_id).toBe("revision-1");
    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().past[0].tool).toBe("image-layers");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("enforces the ten-layer limit and cancel/reset do not create history", () => {
    const onClose = vi.fn();
    render(<LayersPanel asset={asset} onClose={onClose} />);
    for (let index = 0; index < 10; index += 1) fireEvent.click(screen.getByRole("button", { name: "Add Current" }));
    expect(useLayersStore.getState().layers).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Add Current" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(useLayersStore.getState().layers).toHaveLength(0);
    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
