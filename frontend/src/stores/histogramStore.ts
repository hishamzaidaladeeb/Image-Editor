import { create } from "zustand";
import { analyzeHistogram, deleteHistogramPreview, type HistogramOperation, type HistogramPayload, type HistogramResponse } from "@/services/histogram/histogramService";
import type { Asset, UploadError } from "@/types/asset";

type HistogramParameters = { clahe_clip_limit: number; clahe_tile_grid_size: number };
type HistogramHistoryEntry = { operation: Exclude<HistogramOperation, "original">; parameters: HistogramParameters; previousAsset: Asset; nextAsset: Asset };
type HistogramState = { operation: HistogramOperation; parameters: HistogramParameters; status: "idle" | "loading" | "success" | "error"; error: UploadError | null; result: HistogramResponse | null; previewAsset: Asset | null; history: HistogramHistoryEntry[]; setOperation: (operation: HistogramOperation) => void; setParameter: (key: keyof HistogramParameters, value: number) => void; preview: (asset: Asset) => void; apply: (asset: Asset) => Promise<Asset | null>; cancel: () => void; reset: () => void; clearError: () => void };

const previewTimers = { current: undefined as ReturnType<typeof setTimeout> | undefined };
let requestSequence = 0;
const initialParameters: HistogramParameters = { clahe_clip_limit: 2, clahe_tile_grid_size: 8 };

export const useHistogramStore = create<HistogramState>((set, get) => ({
  operation: "original",
  parameters: initialParameters,
  status: "idle",
  error: null,
  result: null,
  previewAsset: null,
  history: [],
  setOperation: (operation) => set({ operation, status: "idle", error: null }),
  setParameter: (key, value) => set((state) => ({ parameters: { ...state.parameters, [key]: value }, status: "idle", error: null })),
  preview: (asset) => {
    if (previewTimers.current) clearTimeout(previewTimers.current);
    const previousPreview = get().previewAsset?.asset_id;
    const requestId = ++requestSequence;
    set({ status: "loading", error: null });
    previewTimers.current = setTimeout(async () => {
      try {
        const response = await analyzeHistogram({ asset_id: asset.asset_id, operation: get().operation, ...get().parameters, preview: get().operation !== "original", previous_preview_asset_id: previousPreview });
        if (requestId === requestSequence) set({ result: response, previewAsset: response.processed_asset, status: "success" });
        else if (response.processed_asset) void deleteHistogramPreview(response.processed_asset.asset_id);
      } catch (error) {
        if (requestId === requestSequence) set({ status: "error", error: (error as UploadError).message ? error as UploadError : { code: "HISTOGRAM_FAILED", message: "تعذر حساب Histogram.", request_id: "client", field_errors: [] } });
      }
    }, 220);
  },
  apply: async (asset) => {
    if (previewTimers.current) clearTimeout(previewTimers.current);
    const operation = get().operation;
    set({ status: "loading", error: null });
    try {
      const response = await analyzeHistogram({ asset_id: asset.asset_id, operation, ...get().parameters, preview: false, previous_preview_asset_id: get().previewAsset?.asset_id });
      if (!response.processed_asset || operation === "original") {
        set({ result: response, previewAsset: null, status: "success" });
        return null;
      }
      const nextAsset = response.processed_asset;
      set((state) => ({ result: response, previewAsset: null, status: "success", history: [...state.history, { operation, parameters: state.parameters, previousAsset: asset, nextAsset }] }));
      return nextAsset;
    } catch (error) {
      set({ status: "error", error: (error as UploadError).message ? error as UploadError : { code: "HISTOGRAM_FAILED", message: "تعذر تطبيق Histogram.", request_id: "client", field_errors: [] } });
      return null;
    }
  },
  cancel: () => { if (previewTimers.current) clearTimeout(previewTimers.current); ++requestSequence; const previewAsset = get().previewAsset; if (previewAsset) void deleteHistogramPreview(previewAsset.asset_id); set({ result: null, previewAsset: null, status: "idle", error: null }); },
  reset: () => { if (previewTimers.current) clearTimeout(previewTimers.current); ++requestSequence; const previewAsset = get().previewAsset; if (previewAsset) void deleteHistogramPreview(previewAsset.asset_id); set({ operation: "original", parameters: initialParameters, result: null, previewAsset: null, status: "idle", error: null }); },
  clearError: () => set({ error: null, status: "idle" })
}));
