import { create } from "zustand";
import { deleteBackgroundPreview, removeBackground, type BackgroundMode, type BackgroundRemovalResponse } from "@/services/background/backgroundService";
import type { Asset, UploadError } from "@/types/asset";

type BackgroundParameters = { background_mode: BackgroundMode; background_color: string; background_asset_id?: string; foreground_scale: number; position_x: number; position_y: number; opacity: number };
type BackgroundHistoryEntry = { parameters: BackgroundParameters; previousAsset: Asset; nextAsset: Asset };
type BackgroundState = { parameters: BackgroundParameters; status: "idle" | "loading" | "success" | "error"; error: UploadError | null; result: BackgroundRemovalResponse | null; previewAsset: Asset | null; backgroundAsset: Asset | null; history: BackgroundHistoryEntry[]; setParameter: <K extends keyof BackgroundParameters>(key: K, value: BackgroundParameters[K]) => void; setBackgroundAsset: (asset: Asset | null) => void; preview: (asset: Asset) => void; apply: (asset: Asset) => Promise<Asset | null>; cancel: () => void; reset: () => void };

const initialParameters: BackgroundParameters = { background_mode: "transparent", background_color: "#ffffff", foreground_scale: 1, position_x: 0, position_y: 0, opacity: 1 };
const previewTimer = { current: undefined as ReturnType<typeof setTimeout> | undefined };
let requestSequence = 0;

const clientError = (message: string): UploadError => ({ code: "BACKGROUND_REMOVAL_FAILED", message, request_id: "client", field_errors: [] });

export const useBackgroundStore = create<BackgroundState>((set, get) => ({
  parameters: initialParameters,
  status: "idle",
  error: null,
  result: null,
  previewAsset: null,
  backgroundAsset: null,
  history: [],
  setParameter: (key, value) => set((state) => ({ parameters: { ...state.parameters, [key]: value, ...(key === "background_mode" && value !== "image" ? { background_asset_id: undefined } : {}) }, status: "idle", error: null })),
  setBackgroundAsset: (asset) => set((state) => ({ backgroundAsset: asset, parameters: { ...state.parameters, background_asset_id: asset?.asset_id }, status: "idle", error: null })),
  preview: (asset) => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    const state = get();
    const previousPreview = state.previewAsset?.asset_id;
    if (state.parameters.background_mode === "image" && !state.backgroundAsset) {
      set({ status: "error", error: clientError("يرجى اختيار صورة خلفية أولاً."), result: null });
      return;
    }
    const requestId = ++requestSequence;
    set({ status: "loading", error: null });
    previewTimer.current = setTimeout(async () => {
      try {
        const response = await removeBackground({ asset_id: asset.asset_id, ...get().parameters, preview: true, previous_preview_asset_id: previousPreview });
        if (requestId === requestSequence) set({ result: response, previewAsset: response.processed_asset, status: "success" });
        else void deleteBackgroundPreview(response.processed_asset.asset_id);
      } catch (error) {
        if (requestId === requestSequence) set({ status: "error", error: (error as UploadError).message ? error as UploadError : clientError("تعذر إزالة الخلفية.") });
      }
    }, 250);
  },
  apply: async (asset) => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    const state = get();
    if (state.parameters.background_mode === "image" && !state.backgroundAsset) {
      set({ status: "error", error: clientError("يرجى اختيار صورة خلفية أولاً.") });
      return null;
    }
    set({ status: "loading", error: null });
    try {
      const response = await removeBackground({ asset_id: asset.asset_id, ...get().parameters, preview: false, previous_preview_asset_id: get().previewAsset?.asset_id });
      const nextAsset = response.processed_asset;
      set((current) => ({ result: response, previewAsset: null, status: "success", history: [...current.history, { parameters: current.parameters, previousAsset: asset, nextAsset }] }));
      return nextAsset;
    } catch (error) {
      set({ status: "error", error: (error as UploadError).message ? error as UploadError : clientError("تعذر تطبيق إزالة الخلفية.") });
      return null;
    }
  },
  cancel: () => { if (previewTimer.current) clearTimeout(previewTimer.current); ++requestSequence; const previewAsset = get().previewAsset; if (previewAsset) void deleteBackgroundPreview(previewAsset.asset_id); set({ result: null, previewAsset: null, status: "idle", error: null }); },
  reset: () => { if (previewTimer.current) clearTimeout(previewTimer.current); ++requestSequence; const previewAsset = get().previewAsset; if (previewAsset) void deleteBackgroundPreview(previewAsset.asset_id); set({ parameters: initialParameters, backgroundAsset: null, result: null, previewAsset: null, status: "idle", error: null }); }
}));
