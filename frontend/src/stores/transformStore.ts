import { create } from "zustand";
import { applyTransform, deleteTransformPreview, type TransformOperation, type TransformPayload } from "@/services/transform/transformService";
import type { Asset, UploadError } from "@/types/asset";

type TransformParameters = Omit<TransformPayload, "asset_id" | "operation">;
type TransformHistoryEntry = { operation: TransformOperation; parameters: TransformParameters; previousAsset: Asset; nextAsset: Asset };
type TransformState = { operation: TransformOperation; status: "idle" | "previewing" | "applying" | "success" | "error"; error: UploadError | null; previewAsset: Asset | null; history: TransformHistoryEntry[]; setOperation: (operation: TransformOperation) => void; preview: (asset: Asset, payload: TransformParameters) => void; apply: (asset: Asset, payload: TransformParameters) => Promise<Asset | null>; cancel: () => void; reset: () => void; clearError: () => void };

const previewTimers = { current: undefined as ReturnType<typeof setTimeout> | undefined };
let requestSequence = 0;

export const useTransformStore = create<TransformState>((set, get) => ({
  operation: "crop",
  status: "idle",
  error: null,
  previewAsset: null,
  history: [],
  setOperation: (operation) => set({ operation, status: "idle", error: null }),
  preview: (asset, payload) => {
    if (previewTimers.current) clearTimeout(previewTimers.current);
    const previousPreview = get().previewAsset?.asset_id;
    const requestId = ++requestSequence;
    set({ status: "previewing", error: null });
    previewTimers.current = setTimeout(async () => {
      try {
        const previewAsset = await applyTransform({ ...payload, asset_id: asset.asset_id, operation: get().operation, preview: true, previous_preview_asset_id: previousPreview });
        if (requestId === requestSequence) set({ previewAsset, status: "success" });
        else void deleteTransformPreview(previewAsset.asset_id);
      } catch (error) {
        if (requestId === requestSequence) set({ status: "error", error: (error as UploadError).message ? error as UploadError : { code: "TRANSFORM_PREVIEW_FAILED", message: "تعذر عرض معاينة التحويل.", request_id: "client", field_errors: [] } });
      }
    }, 220);
  },
  apply: async (asset, payload) => {
    if (previewTimers.current) clearTimeout(previewTimers.current);
    set({ status: "applying", error: null });
    try {
      const nextAsset = await applyTransform({ ...payload, asset_id: asset.asset_id, operation: get().operation, preview: false, previous_preview_asset_id: get().previewAsset?.asset_id });
      set((state) => ({ previewAsset: null, status: "success", history: [...state.history, { operation: get().operation, parameters: payload, previousAsset: asset, nextAsset }] }));
      return nextAsset;
    } catch (error) {
      set({ status: "error", error: (error as UploadError).message ? error as UploadError : { code: "TRANSFORM_APPLY_FAILED", message: "تعذر تنفيذ التحويل.", request_id: "client", field_errors: [] } });
      return null;
    }
  },
  cancel: () => { if (previewTimers.current) clearTimeout(previewTimers.current); ++requestSequence; const previewAsset = get().previewAsset; if (previewAsset) void deleteTransformPreview(previewAsset.asset_id); set({ previewAsset: null, status: "idle", error: null }); },
  reset: () => { if (previewTimers.current) clearTimeout(previewTimers.current); ++requestSequence; const previewAsset = get().previewAsset; if (previewAsset) void deleteTransformPreview(previewAsset.asset_id); set({ previewAsset: null, status: "idle", error: null }); },
  clearError: () => set({ error: null, status: "idle" })
}));
