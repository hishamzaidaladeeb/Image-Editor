import { create } from "zustand";
import { createExport, deleteExportPreview, type ExportFormat, type ExportResponse } from "@/services/export/exportService";
import type { Asset, UploadError } from "@/types/asset";

export type ExportStatus = "idle" | "previewing" | "exporting" | "ready" | "error";

type ExportState = {
  format: ExportFormat;
  quality: number;
  width: number;
  height: number;
  filename: string;
  preserveTransparency: boolean;
  status: ExportStatus;
  error: UploadError | null;
  previewResult: ExportResponse | null;
  result: ExportResponse | null;
  history: ExportResponse[];
  setFormat: (format: ExportFormat) => void;
  setQuality: (quality: number) => void;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setFilename: (filename: string) => void;
  setPreserveTransparency: (preserve: boolean) => void;
  preview: (asset: Asset) => void;
  apply: (asset: Asset) => Promise<ExportResponse | null>;
  cancel: () => void;
  reset: (asset: Asset) => void;
};

let previewTimer: ReturnType<typeof setTimeout> | undefined;
let requestSequence = 0;

export const useExportStore = create<ExportState>((set, get) => ({
  format: "png",
  quality: 95,
  width: 1,
  height: 1,
  filename: "export",
  preserveTransparency: true,
  status: "idle",
  error: null,
  previewResult: null,
  result: null,
  history: [],
  setFormat: (format) => set({ format, error: null }),
  setQuality: (quality) => set({ quality: clampInteger(quality, 1, 100), error: null }),
  setWidth: (width) => set({ width: clampInteger(width, 1, 12000), error: null }),
  setHeight: (height) => set({ height: clampInteger(height, 1, 12000), error: null }),
  setFilename: (filename) => set({ filename, error: null }),
  setPreserveTransparency: (preserveTransparency) => set({ preserveTransparency, error: null }),
  preview: (asset) => {
    if (previewTimer) clearTimeout(previewTimer);
    const previousPreview = get().previewResult?.export_id;
    const sequence = ++requestSequence;
    set({ status: "previewing", error: null });
    previewTimer = setTimeout(async () => {
      try {
        const result = await createExport(buildPayload(asset, get(), true, previousPreview));
        if (sequence === requestSequence) set({ previewResult: result, status: "ready", error: null });
        else void deleteExportPreview(result.export_id);
      } catch (error) {
        if (sequence === requestSequence) set({ status: "error", error: toUploadError(error) });
      }
    }, 220);
  },
  apply: async (asset) => {
    if (previewTimer) clearTimeout(previewTimer);
    const sequence = ++requestSequence;
    set({ status: "exporting", error: null });
    try {
      const state = get();
      const result = await createExport(buildPayload(asset, state, false, state.previewResult?.export_id));
      if (sequence !== requestSequence) return null;
      set((current) => ({ previewResult: null, result, status: "ready", error: null, history: [...current.history, result] }));
      return result;
    } catch (error) {
      if (sequence === requestSequence) set({ status: "error", error: toUploadError(error) });
      return null;
    }
  },
  cancel: () => {
    if (previewTimer) clearTimeout(previewTimer);
    ++requestSequence;
    const preview = get().previewResult;
    if (preview) void deleteExportPreview(preview.export_id);
    set({ previewResult: null, status: "idle", error: null });
  },
  reset: (asset) => {
    if (previewTimer) clearTimeout(previewTimer);
    ++requestSequence;
    const preview = get().previewResult;
    if (preview) void deleteExportPreview(preview.export_id);
    set({ format: "png", quality: 95, width: asset.metadata.width, height: asset.metadata.height, filename: "export", preserveTransparency: true, previewResult: null, result: null, status: "idle", error: null });
  }
}));

function buildPayload(asset: Asset, state: ExportState, preview: boolean, previousPreview?: string) {
  return {
    asset_id: asset.asset_id,
    format: state.format,
    quality: state.quality,
    width: state.width,
    height: state.height,
    filename: state.filename,
    preserve_transparency: state.preserveTransparency,
    preview,
    previous_preview_export_id: previousPreview
  };
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

function toUploadError(error: unknown): UploadError {
  if (error && typeof error === "object" && "message" in error) return error as UploadError;
  return { code: "EXPORT_REQUEST_FAILED", message: "تعذر تجهيز ملف التصدير.", request_id: "client", field_errors: [] };
}
