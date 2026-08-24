import { getApiBaseUrl } from "@/services/apiConfig";
import type { Asset, UploadError } from "@/types/asset";

export type BlurAreaPayload = {
  asset_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kernel_size: number;
  sigma: number;
  preview: boolean;
  previous_preview_asset_id?: string;
};

export async function applyBlurArea(payload: BlurAreaPayload): Promise<Asset> {
  const response = await fetch(`${getApiBaseUrl()}/advanced/blur-area`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw await response.json() as UploadError;
  return await response.json() as Asset;
}

export async function deleteBlurPreview(assetId: string): Promise<void> {
  await fetch(`${getApiBaseUrl()}/assets/${assetId}/preview`, { method: "DELETE" });
}
