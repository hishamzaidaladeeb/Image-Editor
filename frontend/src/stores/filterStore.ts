import { create } from "zustand";
import { applyFilter, deleteFilterPreview, type FilterOperation, type FilterParameters } from "@/services/filter/filterService";
import type { Asset, UploadError } from "@/types/asset";
import { useAssetStore } from "@/stores/assetStore";

const defaults: FilterParameters = { kernel_size: 3, sigma: 1, diameter: 5, sigma_color: 75, sigma_space: 75, amount: 1, threshold: 0, axis: "both", low_threshold: 50, high_threshold: 150, aperture_size: 3, l2_gradient: false, shape: "rect", iterations: 1 };
const previewTimers = { current: undefined as ReturnType<typeof setTimeout> | undefined };
let requestSequence = 0;

type FilterState = { operation: FilterOperation; parameters: FilterParameters; status: "idle" | "previewing" | "applying" | "success" | "error"; error: UploadError | null; previewAsset: Asset | null; history: Array<{ operation: FilterOperation; parameters: FilterParameters; previousAsset: Asset; nextAsset: Asset }>; setOperation: (operation: FilterOperation) => void; setParameter: <Key extends keyof FilterParameters>(key: Key, value: FilterParameters[Key]) => void; preview: (asset: Asset) => void; apply: (asset: Asset) => Promise<Asset | null>; cancel: () => void; reset: () => void };

export const useFilterStore = create<FilterState>((set, get) => ({
  operation: "gaussian_blur",
  parameters: defaults,
  status: "idle",
  error: null,
  previewAsset: null,
  history: [],
  setOperation: (operation) => { set({ operation, parameters: defaults, error: null }); const asset = useAssetStore.getState().asset; if (asset) get().preview(asset); },
  setParameter: (key, value) => { set((state) => ({ parameters: { ...state.parameters, [key]: value }, error: null })); const asset = useAssetStore.getState().asset; if (asset) get().preview(asset); },
  preview: (asset) => {
    if (previewTimers.current) clearTimeout(previewTimers.current);
    const previousPreview = get().previewAsset?.asset_id;
    const requestId = ++requestSequence;
    set({ status: "previewing", error: null });
    previewTimers.current = setTimeout(async () => {
      try {
        const state = get();
        const previewAsset = await applyFilter({ asset_id: asset.asset_id, operation: state.operation, ...state.parameters, preview: true, previous_preview_asset_id: previousPreview });
        if (requestId === requestSequence) set({ previewAsset, status: "success" });
        else void deleteFilterPreview(previewAsset.asset_id);
      } catch (error) {
        if (requestId === requestSequence) set({ status: "error", error: (error as UploadError).message ? error as UploadError : { code: "FILTER_PREVIEW_FAILED", message: "تعذر عرض معاينة الفلتر.", request_id: "client", field_errors: [] } });
      }
    }, 220);
  },
  apply: async (asset) => {
    if (previewTimers.current) clearTimeout(previewTimers.current);
    set({ status: "applying", error: null });
    try {
      const state = get();
      const nextAsset = await applyFilter({ asset_id: asset.asset_id, operation: state.operation, ...state.parameters, preview: false, previous_preview_asset_id: state.previewAsset?.asset_id });
      set((current) => ({ previewAsset: null, status: "success", history: [...current.history, { operation: state.operation, parameters: state.parameters, previousAsset: asset, nextAsset }] }));
      return nextAsset;
    } catch (error) {
      set({ status: "error", error: (error as UploadError).message ? error as UploadError : { code: "FILTER_APPLY_FAILED", message: "تعذر تطبيق الفلتر.", request_id: "client", field_errors: [] } });
      return null;
    }
  },
  cancel: () => { if (previewTimers.current) clearTimeout(previewTimers.current); ++requestSequence; const previewAsset = get().previewAsset; if (previewAsset) void deleteFilterPreview(previewAsset.asset_id); set({ previewAsset: null, status: "idle", error: null }); },
  reset: () => { if (previewTimers.current) clearTimeout(previewTimers.current); ++requestSequence; const previewAsset = get().previewAsset; if (previewAsset) void deleteFilterPreview(previewAsset.asset_id); set({ parameters: defaults, previewAsset: null, status: "idle", error: null }); }
}));
