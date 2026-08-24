import { getApiBaseUrl } from "@/services/apiConfig";
import type { Asset, UploadError } from "@/types/asset";

export type FilterOperation = "average_blur" | "gaussian_blur" | "median_blur" | "bilateral" | "laplacian" | "unsharp_mask" | "sharpen_kernel" | "sobel" | "scharr" | "canny" | "erosion" | "dilation" | "opening" | "closing" | "morphological_gradient";
export type FilterParameters = { kernel_size: number; sigma: number; diameter: number; sigma_color: number; sigma_space: number; amount: number; threshold: number; axis: "x" | "y" | "both"; low_threshold: number; high_threshold: number; aperture_size: number; l2_gradient: boolean; shape: "rect" | "ellipse" | "cross"; iterations: number };
export type FilterPayload = FilterParameters & { asset_id: string; operation: FilterOperation; preview?: boolean; previous_preview_asset_id?: string };

const baseUrl = getApiBaseUrl();

export async function applyFilter(payload: FilterPayload): Promise<Asset> {
  const response = await fetch(`${baseUrl}/filters`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw await response.json() as UploadError;
  return await response.json() as Asset;
}

export async function deleteFilterPreview(assetId: string): Promise<void> {
  await fetch(`${baseUrl}/assets/${assetId}/preview`, { method: "DELETE" });
}
