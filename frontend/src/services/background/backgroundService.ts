import { getApiBaseUrl } from "@/services/apiConfig";
import type { Asset, UploadError } from "@/types/asset";
import { uploadAsset } from "@/services/assets/uploadService";

export type BackgroundMode = "transparent" | "color" | "image";
export type BackgroundRemovalParameters = { background_mode: BackgroundMode; background_color: string; background_asset_id?: string; foreground_scale: number; position_x: number; position_y: number; opacity: number };
export type BackgroundRemovalPayload = BackgroundRemovalParameters & { asset_id: string; preview?: boolean; previous_preview_asset_id?: string };
export type BackgroundRemovalResponse = { asset_id: string; background_mode: BackgroundMode; foreground_coverage: number; processed_asset: Asset };

const apiBaseUrl = getApiBaseUrl();

export async function removeBackground(payload: BackgroundRemovalPayload): Promise<BackgroundRemovalResponse> {
  const response = await fetch(`${apiBaseUrl}/background/remove`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw await response.json() as UploadError;
  return await response.json() as BackgroundRemovalResponse;
}

export async function uploadBackgroundAsset(file: File): Promise<Asset> {
  return uploadAsset(file);
}

export async function deleteBackgroundPreview(assetId: string): Promise<void> {
  await fetch(`${apiBaseUrl}/assets/${assetId}/preview`, { method: "DELETE" });
}
