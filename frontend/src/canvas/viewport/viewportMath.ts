import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM } from "@/canvas/types/canvas";
import type { CanvasSize, Point, ViewportState } from "@/canvas/types/canvas";

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function fitZoom(image: CanvasSize, container: CanvasSize, padding = 32): number {
  if (image.width <= 0 || image.height <= 0 || container.width <= 0 || container.height <= 0) return DEFAULT_ZOOM;
  const availableWidth = Math.max(1, container.width - padding * 2);
  const availableHeight = Math.max(1, container.height - padding * 2);
  return clampZoom(Math.min(availableWidth / image.width, availableHeight / image.height));
}

export function centeredPan(image: CanvasSize, container: CanvasSize, zoom: number): Point {
  return { x: (container.width - image.width * zoom) / 2, y: (container.height - image.height * zoom) / 2 };
}

export function fitViewport(image: CanvasSize, container: CanvasSize): ViewportState {
  const zoom = fitZoom(image, container);
  return { zoom, pan: { x: (container.width - image.width * zoom) / 2, y: (container.height - image.height * zoom) / 2 }, container };
}

export function actualViewport(image: CanvasSize, container: CanvasSize): ViewportState {
  return { zoom: DEFAULT_ZOOM, pan: centeredPan(image, container, DEFAULT_ZOOM), container };
}
