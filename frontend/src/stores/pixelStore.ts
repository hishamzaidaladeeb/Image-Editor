import { create } from "zustand";
import { applyPixelOperation, deletePixelPreview, type PixelOperation, type PixelPayload, type ThresholdMode } from "@/services/pixel/pixelService";
import type { Asset, UploadError } from "@/types/asset";
import { useAssetStore } from "@/stores/assetStore";

export type PixelParameters = Omit<PixelPayload, "asset_id" | "operation" | "preview" | "previous_preview_asset_id">;

type PixelState = {
  operation: PixelOperation;
  parameters: PixelParameters;
  status: "idle" | "previewing" | "applying" | "success" | "error";
  error: UploadError | null;
  previewAsset: Asset | null;
  history: Array<{ operation: PixelOperation; parameters: PixelParameters; previousAsset: Asset; nextAsset: Asset }>;
  setOperation: (operation: PixelOperation) => void;
  setParameter: <Key extends keyof PixelParameters>(key: Key, value: PixelParameters[Key]) => void;
  preview: (asset: Asset) => void;
  apply: (asset: Asset) => Promise<Asset | null>;
  cancel: () => void;
  reset: () => void;
};

const defaults: PixelParameters = { brightness: 0, contrast: 1, gamma: 1, saturation: 1, hue: 0, exposure: 0, sharpness: 0, threshold_mode: "global" as ThresholdMode, threshold: 128, max_value: 255, block_size: 11, adaptive_c: 2 };
let previewTimer: ReturnType<typeof setTimeout> | undefined;
let previewRequest = 0;

export const usePixelStore = create<PixelState>((set, get) => ({
  operation: "adjust",
  parameters: defaults,
  status: "idle",
  error: null,
  previewAsset: null,
  history: [],
  setOperation: (operation) => { set({ operation, error: null }); const asset = useAssetSnapshot(); if (asset) get().preview(asset); },
  setParameter: (key, value) => { set((state) => ({ parameters: { ...state.parameters, [key]: value }, error: null })); const asset = useAssetSnapshot(); if (asset) get().preview(asset); },
  preview: (asset) => {
    if (previewTimer) clearTimeout(previewTimer);
    const previousPreview = get().previewAsset?.asset_id;
    const requestId = ++previewRequest;
    set({ status: "previewing", error: null });
    previewTimer = setTimeout(async () => {
      try {
        const state = get();
        const previewAsset = await applyPixelOperation({ asset_id: asset.asset_id, operation: state.operation, ...state.parameters, preview: true, previous_preview_asset_id: previousPreview });
        if (requestId === previewRequest) set({ previewAsset, status: "success" });
        else void deletePixelPreview(previewAsset.asset_id);
      } catch (error) {
        if (requestId === previewRequest) set({ status: "error", error: (error as UploadError).message ? error as UploadError : { code: "PIXEL_PREVIEW_FAILED", message: "تعذر عرض معاينة تحسين البكسل.", request_id: "client", field_errors: [] } });
      }
    }, 220);
  },
  apply: async (asset) => {
    if (previewTimer) clearTimeout(previewTimer);
    set({ status: "applying", error: null });
    try {
      const state = get();
      const nextAsset = await applyPixelOperation({ asset_id: asset.asset_id, operation: state.operation, ...state.parameters, preview: false, previous_preview_asset_id: state.previewAsset?.asset_id });
      set((current) => ({ previewAsset: null, status: "success", history: [...current.history, { operation: state.operation, parameters: state.parameters, previousAsset: asset, nextAsset }] }));
      return nextAsset;
    } catch (error) {
      set({ status: "error", error: (error as UploadError).message ? error as UploadError : { code: "PIXEL_APPLY_FAILED", message: "تعذر تطبيق تحسين البكسل.", request_id: "client", field_errors: [] } });
      return null;
    }
  },
  cancel: () => { if (previewTimer) clearTimeout(previewTimer); ++previewRequest; const previewAsset = get().previewAsset; if (previewAsset) void deletePixelPreview(previewAsset.asset_id); set({ previewAsset: null, status: "idle", error: null }); },
  reset: () => { if (previewTimer) clearTimeout(previewTimer); ++previewRequest; const previewAsset = get().previewAsset; if (previewAsset) void deletePixelPreview(previewAsset.asset_id); set({ parameters: defaults, previewAsset: null, status: "idle", error: null }); }
}));

function useAssetSnapshot(): Asset | null {
  return useAssetStore.getState().asset;
}
