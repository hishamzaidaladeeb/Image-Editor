import type { Asset } from "@/types/asset";

export type HistoryTool = "transform" | "pixel" | "filter" | "histogram" | "background" | "blending" | "creative" | "blur" | "watermark" | "advanced-text" | "image-layers" | "drawing";

export type HistoryCommit = {
  tool: HistoryTool;
  operation: string;
  parameters: Record<string, unknown>;
};

export type HistoryEntry = HistoryCommit & {
  id: string;
  previousAsset: Asset;
  nextAsset: Asset;
  createdAt: number;
};

export const HISTORY_LIMIT = 50;
