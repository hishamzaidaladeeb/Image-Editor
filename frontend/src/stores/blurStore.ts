import { create } from "zustand";
import { applyBlurArea, deleteBlurPreview, type BlurAreaPayload } from "@/services/blur/blurService";
import type { Asset, UploadError } from "@/types/asset";

export type BlurAreaParameters = Omit<BlurAreaPayload, "asset_id" | "preview" | "previous_preview_asset_id">;
type BlurState = {
  status: "idle" | "previewing" | "applying" | "success" | "error";
  error: UploadError | null;
  previewAsset: Asset | null;
  preview: (asset: Asset, parameters: BlurAreaParameters) => void;
  apply: (asset: Asset, parameters: BlurAreaParameters) => Promise<Asset | null>;
  cancel: () => void;
  reset: () => void;
};

const previewTimers = { current: undefined as ReturnType<typeof setTimeout> | undefined };
let requestSequence = 0;

export const useBlurStore = create<BlurState>((set, get) => ({
  status: "idle",
  error: null,
  previewAsset: null,
  preview: (asset, parameters) => {
    if (previewTimers.current) clearTimeout(previewTimers.current);
    const previousPreview = get().previewAsset?.asset_id;
    const requestId = ++requestSequence;
    set({ status: "previewing", error: null });
    previewTimers.current = setTimeout(async () => {
      try {
        const previewAsset = await applyBlurArea({ ...parameters, asset_id: asset.asset_id, preview: true, previous_preview_asset_id: previousPreview });
        if (requestId === requestSequence) set({ previewAsset, status: "success" });
        else void deleteBlurPreview(previewAsset.asset_id);
      } catch (error) {
        if (requestId === requestSequence) set({ status: "error", error: (error as UploadError).message ? error as UploadError : { code: "BLUR_PREVIEW_FAILED", message: "تعذر عرض معاينة Blur Area.", request_id: "client", field_errors: [] } });
      }
    }, 220);
  },
  apply: async (asset, parameters) => {
    if (previewTimers.current) clearTimeout(previewTimers.current);
    set({ status: "applying", error: null });
    try {
      const nextAsset = await applyBlurArea({ ...parameters, asset_id: asset.asset_id, preview: false, previous_preview_asset_id: get().previewAsset?.asset_id });
      set({ previewAsset: null, status: "success" });
      return nextAsset;
    } catch (error) {
      set({ status: "error", error: (error as UploadError).message ? error as UploadError : { code: "BLUR_APPLY_FAILED", message: "تعذر تطبيق Blur Area.", request_id: "client", field_errors: [] } });
      return null;
    }
  },
  cancel: () => {
    if (previewTimers.current) clearTimeout(previewTimers.current);
    ++requestSequence;
    const previewAsset = get().previewAsset;
    if (previewAsset) void deleteBlurPreview(previewAsset.asset_id);
    set({ previewAsset: null, status: "idle", error: null });
  },
  reset: () => {
    if (previewTimers.current) clearTimeout(previewTimers.current);
    ++requestSequence;
    const previewAsset = get().previewAsset;
    if (previewAsset) void deleteBlurPreview(previewAsset.asset_id);
    set({ previewAsset: null, status: "idle", error: null });
  }
}));
