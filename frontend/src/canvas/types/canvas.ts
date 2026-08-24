import type { Asset } from "@/types/asset";

export type CanvasSize = { width: number; height: number };
export type Point = { x: number; y: number };
export type ViewportState = { zoom: number; pan: Point; container: CanvasSize };
export type CanvasDocument = { asset: Asset; imageSize: CanvasSize };

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const DEFAULT_ZOOM = 1;
