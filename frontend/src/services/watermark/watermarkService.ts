import { getApiBaseUrl } from "@/services/apiConfig";
import type { Asset } from "@/types/asset";

export type WatermarkFont = "dejavu_sans" | "dejavu_sans_bold" | "liberation_sans" | "liberation_sans_bold";
export type WatermarkAlign = "left" | "center" | "right";
export type WatermarkVerticalAlign = "top" | "middle" | "bottom";

export type WatermarkPayload = {
  asset_id: string;
  text: string;
  x: number;
  y: number;
  font_family: WatermarkFont;
  font_size: number;
  color: string;
  opacity: number;
  rotation: number;
  horizontal_alignment: WatermarkAlign;
  vertical_alignment: WatermarkVerticalAlign;
  preview: boolean;
  previous_preview_asset_id?: string;
};

export async function applyWatermark(payload: WatermarkPayload): Promise<Asset> {
  const response = await fetch(`${getApiBaseUrl()}/advanced/watermark`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw await response.json();
  return response.json() as Promise<Asset>;
}

export async function deleteWatermarkPreview(assetId: string): Promise<void> {
  await fetch(`${getApiBaseUrl()}/assets/${assetId}/preview`, { method: "DELETE" });
}
