import { create } from "zustand";
import { clampZoom, fitViewport, actualViewport, centeredPan } from "@/canvas/viewport/viewportMath";
import type { CanvasSize, Point, ViewportState } from "@/canvas/types/canvas";

type CanvasState = ViewportState & {
  setContainer: (container: CanvasSize) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  panBy: (delta: Point) => void;
  fitToScreen: (image: CanvasSize) => void;
  actualSize: (image: CanvasSize) => void;
  resetView: (image: CanvasSize) => void;
};

export const useCanvasStore = create<CanvasState>((set) => ({
  zoom: 1,
  pan: { x: 0, y: 0 },
  container: { width: 1, height: 1 },
  setContainer: (container) => set({ container }),
  setZoom: (zoom) => set((state) => ({ zoom: clampZoom(zoom), pan: state.pan })),
  zoomIn: () => set((state) => ({ zoom: clampZoom(state.zoom * 1.2) })),
  zoomOut: () => set((state) => ({ zoom: clampZoom(state.zoom / 1.2) })),
  panBy: (delta) => set((state) => ({ pan: { x: state.pan.x + delta.x, y: state.pan.y + delta.y } })),
  fitToScreen: (image) => set((state) => fitViewport(image, state.container)),
  actualSize: (image) => set((state) => actualViewport(image, state.container)),
  resetView: (image) => set((state) => ({ zoom: 1, pan: centeredPan(image, state.container, 1) }))
}));
