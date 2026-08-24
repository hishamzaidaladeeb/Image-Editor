import { create } from "zustand";
import { applyCreative, deleteCreativePreview, sampleCreativePixel, type CreativeAsset, type CreativeLook, type CreativeOperation, type CreativePayload, type CreativePreset, type CreativeSampleMode, type PixelSample } from "@/services/creative/creativeService";
import type { Asset, UploadError } from "@/types/asset";
import { useAssetStore } from "@/stores/assetStore";

export type CreativeParameters = { temperature: number; tint: number; shadows: number; highlights: number };
type CreativeState = {
  operation: CreativeOperation;
  preset: CreativePreset;
  look: CreativeLook;
  parameters: CreativeParameters;
  status: "idle" | "previewing" | "applying" | "sampling" | "success" | "error";
  error: UploadError | null;
  previewAsset: CreativeAsset | null;
  appliedParameters: Record<string, number | string> | null;
  sample: PixelSample | null;
  sampleMode: CreativeSampleMode;
  history: Array<{ operation: CreativeOperation; target: string; parameters: CreativeParameters; previousAsset: Asset; nextAsset: Asset }>;
  setOperation: (operation: CreativeOperation) => void;
  setPreset: (preset: CreativePreset) => void;
  setLook: (look: CreativeLook) => void;
  setParameter: <Key extends keyof CreativeParameters>(key: Key, value: CreativeParameters[Key]) => void;
  preview: (asset: Asset) => void;
  apply: (asset: Asset) => Promise<CreativeAsset | null>;
  samplePixel: (asset: Asset, x: number, y: number, mode: CreativeSampleMode) => Promise<PixelSample | null>;
  setSampleMode: (mode: CreativeSampleMode) => void;
  cancel: () => void;
  reset: () => void;
};

const defaults: CreativeParameters = { temperature: 0, tint: 0, shadows: 0, highlights: 0 };
let previewTimer: ReturnType<typeof setTimeout> | undefined;
let requestSequence = 0;

export const useCreativeStore = create<CreativeState>((set, get) => ({
  operation: "look",
  preset: "vivid",
  look: "vintage",
  parameters: { ...defaults },
  status: "idle",
  error: null,
  previewAsset: null,
  appliedParameters: null,
  sample: null,
  sampleMode: "pixel_inspector",
  history: [],
  setOperation: (operation) => { set({ operation, error: null, sample: null }); const asset = useAssetSnapshot(); if (asset) get().preview(asset); },
  setPreset: (preset) => { set({ operation: "preset", preset, error: null, sample: null }); const asset = useAssetSnapshot(); if (asset) get().preview(asset); },
  setLook: (look) => { set({ operation: "look", look, error: null, sample: null }); const asset = useAssetSnapshot(); if (asset) get().preview(asset); },
  setParameter: (key, value) => { set((state) => ({ operation: "tonal", parameters: { ...state.parameters, [key]: value }, error: null, sample: null })); const asset = useAssetSnapshot(); if (asset) get().preview(asset); },
  preview: (asset) => {
    if (previewTimer) clearTimeout(previewTimer);
    const previousPreview = get().previewAsset?.asset_id;
    const sequence = ++requestSequence;
    set({ status: "previewing", error: null });
    previewTimer = setTimeout(async () => {
      try {
        const state = get();
        const result = await applyCreative(buildPayload(asset, state, true, previousPreview));
        if (sequence === requestSequence) set({ previewAsset: result, appliedParameters: result.applied_parameters ?? null, status: "success" });
        else void deleteCreativePreview(result.asset_id);
      } catch (error) {
        if (sequence === requestSequence) set({ status: "error", error: toUploadError(error, "تعذر عرض معاينة الميزة الإبداعية.") });
      }
    }, 220);
  },
  apply: async (asset) => {
    if (previewTimer) clearTimeout(previewTimer);
    const sequence = ++requestSequence;
    set({ status: "applying", error: null });
    try {
      const state = get();
      const result = await applyCreative(buildPayload(asset, state, false, state.previewAsset?.asset_id));
      if (sequence !== requestSequence) return null;
      set((current) => ({ previewAsset: null, appliedParameters: result.applied_parameters ?? null, status: "success", history: [...current.history, { operation: state.operation, target: state.operation === "preset" ? state.preset : state.operation === "look" ? state.look : state.operation, parameters: { ...state.parameters }, previousAsset: asset, nextAsset: result }] }));
      return result;
    } catch (error) {
      if (sequence === requestSequence) set({ status: "error", error: toUploadError(error, "تعذر تطبيق الميزة الإبداعية.") });
      return null;
    }
  },
  setSampleMode: (sampleMode) => set({ sampleMode, sample: null, error: null }),
  samplePixel: async (asset, x, y, mode) => {
    set({ status: "sampling", error: null });
    try {
      const result = await sampleCreativePixel({ asset_id: asset.asset_id, x, y, mode });
      set({ sample: result, status: "success" });
      return result;
    } catch (error) {
      set({ status: "error", error: toUploadError(error, "تعذر قراءة قيمة البكسل من الصورة.") });
      return null;
    }
  },
  cancel: () => { if (previewTimer) clearTimeout(previewTimer); ++requestSequence; const previewAsset = get().previewAsset; if (previewAsset) void deleteCreativePreview(previewAsset.asset_id); set({ previewAsset: null, appliedParameters: null, sample: null, status: "idle", error: null }); },
  reset: () => { if (previewTimer) clearTimeout(previewTimer); ++requestSequence; const previewAsset = get().previewAsset; if (previewAsset) void deleteCreativePreview(previewAsset.asset_id); set({ operation: "look", preset: "vivid", look: "vintage", parameters: { ...defaults }, previewAsset: null, appliedParameters: null, sample: null, status: "idle", error: null }); }
}));

function buildPayload(asset: Asset, state: CreativeState, preview: boolean, previousPreview?: string): CreativePayload {
  return { asset_id: asset.asset_id, operation: state.operation, preset: state.operation === "preset" ? state.preset : undefined, look: state.operation === "look" ? state.look : undefined, ...state.parameters, preview, previous_preview_asset_id: previousPreview };
}

function useAssetSnapshot(): Asset | null {
  return useAssetStore.getState().asset;
}

function toUploadError(error: unknown, fallback: string): UploadError {
  if (error && typeof error === "object" && "message" in error) return error as UploadError;
  return { code: "CREATIVE_REQUEST_FAILED", message: fallback, request_id: "client", field_errors: [] };
}
