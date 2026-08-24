import { getApiBaseUrl } from "@/services/apiConfig";
import type { Asset, UploadError } from "@/types/asset";
import { uploadAsset } from "@/services/assets/uploadService";

export type BlendingOperation = "alpha" | "side_by_side" | "overlay" | "blend" | "difference";
export type BlendingParameters = { operation: BlendingOperation; opacity: number; weight_a: number; weight_b: number; second_asset_id?: string };
export type BlendingPayload = BlendingParameters & { asset_id: string; preview?: boolean; previous_preview_asset_id?: string };
export type BlendingResponse = { asset_id: string; second_asset_id: string; operation: BlendingOperation; processed_asset: Asset };

const apiBaseUrl = getApiBaseUrl();

export async function blendImages(payload: BlendingPayload): Promise<BlendingResponse> {
  const response = await fetch(`${apiBaseUrl}/blending`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw await response.json() as UploadError;
  return await response.json() as BlendingResponse;
}

export async function uploadBlendingAsset(file: File): Promise<Asset> {
  return uploadAsset(file);
}

export async function deleteBlendingPreview(assetId: string): Promise<void> {
  await fetch(`${apiBaseUrl}/assets/${assetId}/preview`, { method: "DELETE" });
}
