import { getApiBaseUrl } from "@/services/apiConfig";
import type { Asset, UploadError } from "@/types/asset";

export type PixelOperation = "adjust" | "invert" | "grayscale" | "threshold";
export type ThresholdMode = "global" | "binary" | "adaptive";

export type PixelPayload = {
  asset_id: string;
  operation: PixelOperation;
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  hue: number;
  exposure: number;
  sharpness: number;
  threshold_mode: ThresholdMode;
  threshold: number;
  max_value: number;
  block_size: number;
  adaptive_c: number;
  preview?: boolean;
  previous_preview_asset_id?: string;
};

const baseUrl = getApiBaseUrl();

export async function applyPixelOperation(payload: PixelPayload): Promise<Asset> {
  const response = await fetch(`${baseUrl}/operations/pixel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw await response.json() as UploadError;
  return await response.json() as Asset;
}

export async function deletePixelPreview(assetId: string): Promise<void> {
  await fetch(`${baseUrl}/assets/${assetId}/preview`, { method: "DELETE" });
}
