import { uploadBackgroundAsset } from "@/services/background/backgroundService";
import type { BackgroundLibraryItem } from "@/data/backgroundLibrary";
import type { Asset } from "@/types/asset";

export async function loadLibraryBackground(item: BackgroundLibraryItem): Promise<Asset> {
  const response = await fetch(item.imageUrl);
  if (!response.ok) throw new Error("BACKGROUND_LIBRARY_LOAD_FAILED");
  const blob = await response.blob();
  const file = new File([blob], `${item.id}.png`, { type: "image/png" });
  return uploadBackgroundAsset(file);
}
