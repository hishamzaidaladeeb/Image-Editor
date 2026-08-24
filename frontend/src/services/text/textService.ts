import { getApiBaseUrl } from "@/services/apiConfig";
import type { Asset } from "@/types/asset";

export type TextFont = "dejavu_sans" | "dejavu_sans_bold" | "liberation_sans" | "liberation_sans_bold";
export type TextWeight = "regular" | "bold";
export type TextStyle = "normal" | "italic";
export type TextAlign = "left" | "center" | "right";
export type TextDirection = "auto" | "ltr" | "rtl";

export type TextPayload = {
  asset_id: string;
  text: string;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  font_family: TextFont;
  font_size: number;
  font_weight: TextWeight;
  font_style: TextStyle;
  color: string;
  opacity: number;
  alignment: TextAlign;
  direction: TextDirection;
  rotation: number;
  preview: boolean;
  previous_preview_asset_id?: string;
};

export async function applyText(payload: TextPayload): Promise<Asset> {
  const response = await fetch(`${getApiBaseUrl()}/advanced/text`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw await response.json();
  return response.json() as Promise<Asset>;
}

export async function deleteTextPreview(assetId: string): Promise<void> {
  await fetch(`${getApiBaseUrl()}/assets/${assetId}/preview`, { method: "DELETE" });
}
