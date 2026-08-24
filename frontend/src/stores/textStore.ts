import { create } from "zustand";
import { applyText, deleteTextPreview, type TextPayload } from "@/services/text/textService";
import type { Asset, UploadError } from "@/types/asset";

export type TextParameters = Omit<TextPayload, "asset_id" | "preview" | "previous_preview_asset_id">;

type TextState = {
  status: "idle" | "previewing" | "applying" | "success" | "error";
  error: UploadError | null;
  previewAsset: Asset | null;
  preview: (asset: Asset, parameters: TextParameters) => void;
  apply: (asset: Asset, parameters: TextParameters) => Promise<Asset | null>;
  cancel: () => void;
  reset: () => void;
};

const previewTimer = { current: undefined as ReturnType<typeof setTimeout> | undefined };
let requestSequence = 0;

function asError(error: unknown, fallbackCode: string, fallbackMessage: string): UploadError {
  if (error && typeof error === "object" && "message" in error) return error as UploadError;
  return { code: fallbackCode, message: fallbackMessage, request_id: "client", field_errors: [] };
}

export const useTextStore = create<TextState>((set, get) => ({
  status: "idle",
  error: null,
  previewAsset: null,
  preview: (asset, parameters) => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    const previousPreview = get().previewAsset?.asset_id;
    const requestId = ++requestSequence;
    set({ status: "previewing", error: null });
    previewTimer.current = setTimeout(async () => {
      try {
        const previewAsset = await applyText({ ...parameters, asset_id: asset.asset_id, preview: true, previous_preview_asset_id: previousPreview });
        if (requestId === requestSequence) set({ previewAsset, status: "success" });
        else void deleteTextPreview(previewAsset.asset_id);
      } catch (error) {
        if (requestId === requestSequence) set({ status: "error", error: asError(error, "TEXT_PREVIEW_FAILED", "تعذر عرض معاينة النص المتقدم.") });
      }
    }, 220);
  },
  apply: async (asset, parameters) => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    ++requestSequence;
    set({ status: "applying", error: null });
    try {
      const nextAsset = await applyText({ ...parameters, asset_id: asset.asset_id, preview: false, previous_preview_asset_id: get().previewAsset?.asset_id });
      set({ previewAsset: null, status: "success" });
      return nextAsset;
    } catch (error) {
      set({ status: "error", error: asError(error, "TEXT_APPLY_FAILED", "تعذر تطبيق النص المتقدم.") });
      return null;
    }
  },
  cancel: () => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    ++requestSequence;
    const previewAsset = get().previewAsset;
    if (previewAsset) void deleteTextPreview(previewAsset.asset_id);
    set({ previewAsset: null, status: "idle", error: null });
  },
  reset: () => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    ++requestSequence;
    const previewAsset = get().previewAsset;
    if (previewAsset) void deleteTextPreview(previewAsset.asset_id);
    set({ previewAsset: null, status: "idle", error: null });
  }
}));
