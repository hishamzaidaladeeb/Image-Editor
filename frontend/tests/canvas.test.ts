import { actualViewport, fitViewport } from "@/canvas/viewport/viewportMath";
import { useCanvasStore } from "@/stores/canvasStore";

describe("canvas viewport foundation", () => {
  const image = { width: 1600, height: 900 };
  const container = { width: 800, height: 600 };

  beforeEach(() => {
    useCanvasStore.setState({ zoom: 1, pan: { x: 0, y: 0 }, container: { width: 1, height: 1 } });
  });

  it("fits without changing the image aspect ratio", () => {
    const viewport = fitViewport(image, container);
    expect(viewport.zoom).toBe(0.46);
    expect(image.width / image.height).toBeCloseTo(16 / 9);
    expect(viewport.pan.x).toBeCloseTo(32);
  });

  it("supports zoom in, zoom out, actual size, reset, and pan", () => {
    const store = useCanvasStore.getState();
    store.setContainer(container);
    store.zoomIn();
    expect(useCanvasStore.getState().zoom).toBeCloseTo(1.2);
    store.zoomOut();
    expect(useCanvasStore.getState().zoom).toBeCloseTo(1);
    store.panBy({ x: 20, y: -10 });
    expect(useCanvasStore.getState().pan).toEqual({ x: 20, y: -10 });
    store.actualSize(image);
    expect(useCanvasStore.getState().zoom).toBe(1);
    store.resetView(image);
    expect(useCanvasStore.getState().pan.x).toBe(-400);
  });

  it("centers the image for actual size", () => {
    const viewport = actualViewport(image, container);
    expect(viewport.zoom).toBe(1);
    expect(viewport.pan).toEqual({ x: -400, y: -150 });
  });
});
