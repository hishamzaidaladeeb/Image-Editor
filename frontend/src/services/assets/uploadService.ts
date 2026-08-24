import type { Asset, UploadError } from "@/types/asset";
import { getApiBaseUrl } from "@/services/apiConfig";

const apiBaseUrl = getApiBaseUrl();

export async function uploadAsset(file: File, signal?: AbortSignal): Promise<Asset> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${apiBaseUrl}/assets`, { method: "POST", body, signal });
  if (!response.ok) {
    const error = (await response.json()) as UploadError;
    throw error;
  }
  return (await response.json()) as Asset;
}
