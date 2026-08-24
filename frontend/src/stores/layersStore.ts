import { create } from "zustand";
import { applyLayers, type ImageLayerPayload, deleteLayersPreview } from "@/services/layers/layersService";
import type { Asset, UploadError } from "@/types/asset";

export type ImageLayerState = ImageLayerPayload & { id: string; source: Asset; lockAspect: boolean };

type LayersState = {
  layers: ImageLayerState[];
  selectedId: string | null;
  status: "idle" | "previewing" | "applying" | "success" | "error";
  error: UploadError | null;
  previewAsset: Asset | null;
  addLayer: (source: Asset) => boolean;
  updateLayer: (id: string, patch: Partial<ImageLayerPayload> & Partial<Pick<ImageLayerState, "lockAspect">>) => void;
  selectLayer: (id: string | null) => void;
  removeLayer: (id: string) => void;
  moveLayer: (id: string, direction: -1 | 1) => void;
  resetLayer: (id: string) => void;
  preview: () => void;
  apply: (asset: Asset) => Promise<Asset | null>;
  cancel: () => void;
  reset: () => void;
};

let previewTimer: ReturnType<typeof setTimeout> | undefined;
let requestSequence = 0;

function asError(error: unknown): UploadError {
  if (error && typeof error === "object" && "message" in error) return error as UploadError;
  return { code: "LAYERS_FAILED", message: "تعذر تنفيذ طبقات الصور.", request_id: "client", field_errors: [] };
}

function makeLayer(source: Asset, index: number): ImageLayerState {
  return { id: crypto.randomUUID(), asset_id: source.asset_id, name: `Layer ${index + 1}`, visible: true, opacity: 100, x: 0, y: 0, scale: 1, rotation: 0, lockAspect: true, source };
}

function payload(layers: ImageLayerState[]): ImageLayerPayload[] {
  return layers.map(({ id: _id, source: _source, lockAspect: _lockAspect, ...layer }) => layer);
}

export const useLayersStore = create<LayersState>((set, get) => ({
  layers: [],
  selectedId: null,
  status: "idle",
  error: null,
  previewAsset: null,
  addLayer: (source) => {
    const current = get().layers;
    if (current.length >= 10) return false;
    const layer = makeLayer(source, current.length);
    set({ layers: [...current, layer], selectedId: layer.id, error: null });
    get().preview();
    return true;
  },
  updateLayer: (id, patch) => {
    set({ layers: get().layers.map((layer) => layer.id === id ? { ...layer, ...patch } : layer) });
    get().preview();
  },
  selectLayer: (id) => set({ selectedId: id }),
  removeLayer: (id) => {
    const layers = get().layers.filter((layer) => layer.id !== id);
    set({ layers, selectedId: layers[0]?.id ?? null });
    get().preview();
  },
  moveLayer: (id, direction) => {
    const layers = [...get().layers];
    const index = layers.findIndex((layer) => layer.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= layers.length) return;
    [layers[index], layers[next]] = [layers[next], layers[index]];
    set({ layers });
    get().preview();
  },
  resetLayer: (id) => {
    const layer = get().layers.find((item) => item.id === id);
    if (!layer) return;
    get().updateLayer(id, { visible: true, opacity: 100, x: 0, y: 0, scale: 1, rotation: 0, lockAspect: true });
  },
  preview: () => {
    if (previewTimer) clearTimeout(previewTimer);
    ++requestSequence;
    set({ status: get().layers.length ? "previewing" : "idle", error: null });
    previewTimer = setTimeout(() => set({ status: "success" }), 160);
  },
  apply: async (asset) => {
    if (previewTimer) clearTimeout(previewTimer);
    ++requestSequence;
    set({ status: "applying", error: null });
    try {
      const nextAsset = await applyLayers({ asset_id: asset.asset_id, layers: payload(get().layers), preview: false });
      set({ layers: [], selectedId: null, previewAsset: null, status: "success" });
      return nextAsset;
    } catch (error) {
      set({ status: "error", error: asError(error) });
      return null;
    }
  },
  cancel: () => {
    if (previewTimer) clearTimeout(previewTimer);
    ++requestSequence;
    const previewAsset = get().previewAsset;
    if (previewAsset) void deleteLayersPreview(previewAsset.asset_id);
    set({ layers: [], selectedId: null, previewAsset: null, status: "idle", error: null });
  },
  reset: () => {
    if (previewTimer) clearTimeout(previewTimer);
    ++requestSequence;
    const previewAsset = get().previewAsset;
    if (previewAsset) void deleteLayersPreview(previewAsset.asset_id);
    set({ layers: [], selectedId: null, previewAsset: null, status: "idle", error: null });
  }
}));
