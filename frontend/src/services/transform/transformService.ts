import type { Asset, UploadError } from "@/types/asset";
import { getApiBaseUrl } from "@/services/apiConfig";

const apiBaseUrl = getApiBaseUrl();
export type TransformOperation = "crop" | "resize" | "rotate" | "flip" | "translate" | "scale" | "perspective";
export type TransformPayload = { asset_id: string; operation: TransformOperation; x?: number; y?: number; width?: number; height?: number; percentage?: number; angle?: number; flip_axis?: "horizontal" | "vertical"; scale_x?: number; scale_y?: number; lock_aspect?: boolean; interpolation?: "nearest" | "linear" | "cubic" | "lanczos"; points?: Array<[number, number]>; preview?: boolean; previous_preview_asset_id?: string };

export async function applyTransform(payload: TransformPayload): Promise<Asset> {
  const response = await fetch(`${apiBaseUrl}/operations/transform`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw await response.json() as UploadError;
  return (await response.json()) as Asset;
}

export async function deleteTransformPreview(assetId: string): Promise<void> {
  await fetch(`${apiBaseUrl}/assets/${assetId}/preview`, { method: "DELETE" });
}
