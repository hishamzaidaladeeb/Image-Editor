import { create } from "zustand";
import { loadLibraryBackground } from "@/services/backgroundLibrary/backgroundLibraryService";
import { backgroundLibrary, type BackgroundCategory, type BackgroundLibraryItem } from "@/data/backgroundLibrary";
import type { Asset, UploadError } from "@/types/asset";

type BackgroundLibraryState = { category: "all" | BackgroundCategory; selectedItem: BackgroundLibraryItem | null; selectedAsset: Asset | null; status: "idle" | "loading" | "success" | "error"; error: UploadError | null; setCategory: (category: "all" | BackgroundCategory) => void; selectBackground: (item: BackgroundLibraryItem) => Promise<Asset | null>; clear: () => void };

const libraryError = (message: string): UploadError => ({ code: "BACKGROUND_LIBRARY_LOAD_FAILED", message, request_id: "client", field_errors: [] });
let selectionSequence = 0;

export const useBackgroundLibraryStore = create<BackgroundLibraryState>((set) => ({
  category: "all",
  selectedItem: null,
  selectedAsset: null,
  status: "idle",
  error: null,
  setCategory: (category) => set({ category, error: null }),
  selectBackground: async (item) => {
    const requestId = ++selectionSequence;
    set({ selectedItem: item, status: "loading", error: null });
    try {
      const selectedAsset = await loadLibraryBackground(item);
      if (requestId !== selectionSequence) return null;
      set({ selectedAsset, status: "success", error: null });
      return selectedAsset;
    } catch {
      if (requestId !== selectionSequence) return null;
      const error = libraryError("تعذر تحميل خلفية المكتبة.");
      set({ status: "error", error });
      return null;
    }
  },
  clear: () => { ++selectionSequence; set({ category: "all", selectedItem: null, selectedAsset: null, status: "idle", error: null }); }
}));

export function getBackgroundLibraryItems(category: "all" | BackgroundCategory): BackgroundLibraryItem[] { return category === "all" ? backgroundLibrary : backgroundLibrary.filter((item) => item.category === category); }
