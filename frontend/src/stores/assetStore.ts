import { create } from "zustand";
import { uploadAsset } from "@/services/assets/uploadService";
import type { Asset, UploadError } from "@/types/asset";
import { useHistoryStore } from "@/stores/historyStore";
import type { HistoryCommit } from "@/types/history";

type AssetState = {
  asset: Asset | null;
  status: "idle" | "loading" | "success" | "error";
  error: UploadError | null;
  upload: (file: File) => Promise<void>;
  setAsset: (asset: Asset, commit?: HistoryCommit) => void;
  reset: () => void;
};

export const useAssetStore = create<AssetState>((set, get) => ({
  asset: null,
  status: "idle",
  error: null,
  upload: async (file) => {
    set({ status: "loading", error: null });
    try {
      const asset = await uploadAsset(file);
      useHistoryStore.getState().clear();
      useHistoryStore.getState().setCurrentAsset(asset);
      set({ asset, status: "success", error: null });
    } catch (error) {
      const fallback: UploadError = {
        code: "UPLOAD_FAILED",
        message: "تعذر رفع الصورة. يرجى المحاولة مرة أخرى.",
        request_id: "client",
        field_errors: []
      };
      set({ status: "error", error: (error as UploadError).message ? error as UploadError : fallback });
    }
  },
  setAsset: (asset, commit) => {
    const previousAsset = get().asset;
    set({ asset, status: "success", error: null });
    if (commit && previousAsset) useHistoryStore.getState().recordCommit(commit, previousAsset, asset);
    else useHistoryStore.getState().setCurrentAsset(asset);
  },
  reset: () => {
    useHistoryStore.getState().clear();
    set({ asset: null, status: "idle", error: null });
  }
}));
