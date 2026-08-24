import { create } from "zustand";
import { blendImages, deleteBlendingPreview, type BlendingOperation, type BlendingResponse } from "@/services/blending/blendingService";
import type { Asset, UploadError } from "@/types/asset";

type BlendingParameters = { operation: BlendingOperation; opacity: number; weight_a: number; weight_b: number };
type BlendingHistoryEntry = { parameters: BlendingParameters; firstAsset: Asset; secondAsset: Asset; nextAsset: Asset };
type BlendingState = { parameters: BlendingParameters; status: "idle" | "loading" | "success" | "error"; error: UploadError | null; result: BlendingResponse | null; previewAsset: Asset | null; secondAsset: Asset | null; history: BlendingHistoryEntry[]; setParameter: <K extends keyof BlendingParameters>(key: K, value: BlendingParameters[K]) => void; setSecondAsset: (asset: Asset | null) => void; preview: (asset: Asset) => void; apply: (asset: Asset) => Promise<Asset | null>; cancel: () => void; reset: () => void };

const initialParameters: BlendingParameters = { operation: "alpha", opacity: 0.5, weight_a: 0.5, weight_b: 0.5 };
const previewTimer = { current: undefined as ReturnType<typeof setTimeout> | undefined };
let requestSequence = 0;

const clientError = (message: string): UploadError => ({ code: "BLENDING_FAILED", message, request_id: "client", field_errors: [] });

export const useBlendingStore = create<BlendingState>((set, get) => ({
  parameters: initialParameters,
  status: "idle",
  error: null,
  result: null,
  previewAsset: null,
  secondAsset: null,
  history: [],
  setParameter: (key, value) => set((state) => ({ parameters: { ...state.parameters, [key]: value }, status: "idle", error: null })),
  setSecondAsset: (asset) => set({ secondAsset: asset, status: "idle", error: null }),
  preview: (asset) => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    const state = get();
    const secondAssetId = state.secondAsset?.asset_id;
    if (!secondAssetId) {
      set({ status: "error", error: clientError("يرجى اختيار الصورة الثانية أولاً."), result: null });
      return;
    }
    const previousPreview = state.previewAsset?.asset_id;
    const requestId = ++requestSequence;
    set({ status: "loading", error: null });
    previewTimer.current = setTimeout(async () => {
      try {
        const response = await blendImages({ asset_id: asset.asset_id, second_asset_id: secondAssetId, ...get().parameters, preview: true, previous_preview_asset_id: previousPreview });
        if (requestId === requestSequence) set({ result: response, previewAsset: response.processed_asset, status: "success" });
        else void deleteBlendingPreview(response.processed_asset.asset_id);
      } catch (error) {
        if (requestId === requestSequence) set({ status: "error", error: (error as UploadError).message ? error as UploadError : clientError("تعذر دمج الصورتين.") });
      }
    }, 250);
  },
  apply: async (asset) => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    const state = get();
    if (!state.secondAsset) {
      set({ status: "error", error: clientError("يرجى اختيار الصورة الثانية أولاً.") });
      return null;
    }
    set({ status: "loading", error: null });
    try {
      const response = await blendImages({ asset_id: asset.asset_id, second_asset_id: state.secondAsset.asset_id, ...get().parameters, preview: false, previous_preview_asset_id: get().previewAsset?.asset_id });
      const nextAsset = response.processed_asset;
      set((current) => ({ result: response, previewAsset: null, status: "success", history: [...current.history, { parameters: current.parameters, firstAsset: asset, secondAsset: state.secondAsset!, nextAsset }] }));
      return nextAsset;
    } catch (error) {
      set({ status: "error", error: (error as UploadError).message ? error as UploadError : clientError("تعذر تطبيق دمج الصور.") });
      return null;
    }
  },
  cancel: () => { if (previewTimer.current) clearTimeout(previewTimer.current); ++requestSequence; const previewAsset = get().previewAsset; if (previewAsset) void deleteBlendingPreview(previewAsset.asset_id); set({ result: null, previewAsset: null, status: "idle", error: null }); },
  reset: () => { if (previewTimer.current) clearTimeout(previewTimer.current); ++requestSequence; const previewAsset = get().previewAsset; if (previewAsset) void deleteBlendingPreview(previewAsset.asset_id); set({ parameters: initialParameters, secondAsset: null, result: null, previewAsset: null, status: "idle", error: null }); }
}));
