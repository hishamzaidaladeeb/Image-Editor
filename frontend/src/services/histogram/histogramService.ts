import { getApiBaseUrl } from "@/services/apiConfig";
import type { Asset, UploadError } from "@/types/asset";

export type HistogramOperation = "original" | "equalize" | "clahe";
export type HistogramChannels = { grayscale: number[]; red: number[]; green: number[]; blue: number[]; alpha: number[] | null };
export type HistogramResponse = { asset_id: string; operation: HistogramOperation; before: HistogramChannels; after: HistogramChannels; processed_asset: Asset | null };
export type HistogramPayload = { asset_id: string; operation: HistogramOperation; clahe_clip_limit?: number; clahe_tile_grid_size?: number; preview?: boolean; previous_preview_asset_id?: string };

const apiBaseUrl = getApiBaseUrl();

export async function analyzeHistogram(payload: HistogramPayload): Promise<HistogramResponse> {
  const response = await fetch(`${apiBaseUrl}/histogram`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw await response.json() as UploadError;
  return await response.json() as HistogramResponse;
}

export async function deleteHistogramPreview(assetId: string): Promise<void> {
  await fetch(`${apiBaseUrl}/assets/${assetId}/preview`, { method: "DELETE" });
}
