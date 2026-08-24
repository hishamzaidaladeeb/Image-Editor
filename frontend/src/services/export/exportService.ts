import { getApiBaseUrl, getApiOrigin } from "@/services/apiConfig";
import type { UploadError } from "@/types/asset";

export type ExportFormat = "png" | "jpg" | "webp";

export type ExportPayload = {
  asset_id: string;
  format: ExportFormat;
  quality: number;
  width: number;
  height: number;
  filename: string;
  preserve_transparency: boolean;
  preview: boolean;
  previous_preview_export_id?: string;
};

export type ExportResponse = {
  export_id: string;
  source_asset_id: string;
  filename: string;
  format: string;
  quality: number;
  width: number;
  height: number;
  file_size: number;
  channels: number;
  color_mode: string;
  has_transparency: boolean;
  preview: boolean;
  preview_url: string;
  download_url: string;
};

const apiBaseUrl = getApiBaseUrl();

function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${getApiOrigin()}${path}`;
}

async function parseError(response: Response): Promise<UploadError> {
  try {
    return await response.json() as UploadError;
  } catch {
    return { code: "EXPORT_REQUEST_FAILED", message: "Export request failed.", request_id: "client", field_errors: [] };
  }
}

export async function createExport(payload: ExportPayload): Promise<ExportResponse> {
  const response = await fetch(`${apiBaseUrl}/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw await parseError(response);
  const result = await response.json() as ExportResponse;
  return { ...result, preview_url: absoluteUrl(result.preview_url), download_url: absoluteUrl(result.download_url) };
}

export async function deleteExportPreview(exportId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/export/${encodeURIComponent(exportId)}/preview`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) throw await parseError(response);
}
