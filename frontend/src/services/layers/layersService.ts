import { getApiBaseUrl } from "@/services/apiConfig";
import type { Asset } from "@/types/asset";

export type ImageLayerPayload = {
  asset_id: string;
  name: string;
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type LayersPayload = {
  asset_id: string;
  layers: ImageLayerPayload[];
  preview: boolean;
  previous_preview_asset_id?: string;
};

export async function applyLayers(payload: LayersPayload): Promise<Asset> {
  const response = await fetch(`${getApiBaseUrl()}/advanced/layers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw await response.json();
  return response.json() as Promise<Asset>;
}

export async function deleteLayersPreview(assetId: string): Promise<void> {
  await fetch(`${getApiBaseUrl()}/assets/${assetId}/preview`, { method: "DELETE" });
}
