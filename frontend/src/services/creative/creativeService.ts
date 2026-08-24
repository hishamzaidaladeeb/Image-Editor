import type { Asset, UploadError } from "@/types/asset";
import { getApiBaseUrl } from "@/services/apiConfig";

export type CreativeOperation = "preset" | "look" | "auto_enhancement" | "tonal";
export type CreativePreset = "vivid" | "soft_portrait" | "crisp_detail" | "mono_contrast";
export type CreativeLook = "vintage" | "cinematic" | "warm" | "cool" | "black_white" | "dramatic";
export type CreativeSampleMode = "color_picker" | "eyedropper" | "pixel_inspector";

export type CreativePayload = {
  asset_id: string;
  operation: CreativeOperation;
  preset?: CreativePreset;
  look?: CreativeLook;
  temperature: number;
  tint: number;
  shadows: number;
  highlights: number;
  preview?: boolean;
  previous_preview_asset_id?: string;
};

export type CreativeAsset = Asset & { applied_parameters?: Record<string, number | string> };

export type PixelSample = {
  asset_id: string;
  mode: CreativeSampleMode;
  x: number;
  y: number;
  red: number;
  green: number;
  blue: number;
  alpha: number;
  luminance: number;
  hex_color: string;
  color_mode: string;
  channels: number;
};

const baseUrl = getApiBaseUrl();

export async function applyCreative(payload: CreativePayload): Promise<CreativeAsset> {
  const response = await fetch(`${baseUrl}/creative`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw await response.json() as UploadError;
  return await response.json() as CreativeAsset;
}

export async function sampleCreativePixel(payload: { asset_id: string; x: number; y: number; mode: CreativeSampleMode }): Promise<PixelSample> {
  const response = await fetch(`${baseUrl}/creative/sample`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw await response.json() as UploadError;
  return await response.json() as PixelSample;
}

export async function deleteCreativePreview(assetId: string): Promise<void> {
  await fetch(`${baseUrl}/assets/${assetId}/preview`, { method: "DELETE" });
}
