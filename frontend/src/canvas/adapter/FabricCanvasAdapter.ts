import { Canvas, Ellipse, FabricImage, Line, Path, Rect } from "fabric";
import type { CanvasSize, Point } from "@/canvas/types/canvas";

export type DrawingMode = "direct" | "freehand" | "sine" | "line" | "rectangle" | "ellipse";

type DrawingOptions = {
  mode?: DrawingMode;
  amplitude?: number;
  frequency?: number;
  opacity?: number;
};

type DrawingPoint = { x: number; y: number };

type DrawingObject = {
  set: (properties: Record<string, unknown>) => void;
  setCoords?: () => void;
};

export type CanvasAdapter = {
  mount: (element: HTMLCanvasElement) => void;
  loadImage: (url: string, size: CanvasSize) => Promise<void>;
  setViewport: (zoom: number, pan: Point) => void;
  resize: (size: CanvasSize) => void;
  setRotation: (angle: number) => void;
  setDrawing: (enabled: boolean, color?: string, width?: number, options?: DrawingOptions) => void;
  clearDrawing: () => void;
  drawingDataUrl: () => string | null;
  dispose: () => Promise<void>;
};

export class FabricCanvasAdapter implements CanvasAdapter {
  private canvas: Canvas | null = null;
  private baseScale = 1;
  private drawingMode: DrawingMode = "freehand";
  private drawingEnabled = false;
  private drawingColor = "#ff3b30";
  private drawingWidth = 8;
  private drawingOpacity = 1;
  private sineAmplitude = 20;
  private sineFrequency = 2;
  private strokeStart: DrawingPoint | null = null;
  private strokeObject: DrawingObject | null = null;
  private strokePoints: DrawingPoint[] = [];

  private readonly onMouseDown = (event: any): void => {
    if (!this.canvas || !this.drawingEnabled) return;
    const point = this.canvasPoint(event.e);
    if (!point) return;
    this.strokeStart = point;
    this.strokePoints = [point];
    if (this.drawingMode === "direct" || this.drawingMode === "freehand") {
      this.strokeObject = new Path(this.freehandPath(this.strokePoints), this.strokeStyle()) as unknown as DrawingObject;
    } else {
      this.strokeObject = this.createShape(point, point);
    }
    if (this.strokeObject) {
      this.canvas.add(this.strokeObject as any);
      this.canvas.renderAll();
    }
  };

  private readonly onMouseMove = (event: any): void => {
    if (!this.canvas || !this.drawingEnabled || !this.strokeStart || !this.strokeObject) return;
    const point = this.canvasPoint(event.e);
    if (!point) return;
    if (this.drawingMode === "direct" || this.drawingMode === "freehand") {
      this.strokePoints.push(point);
      this.replaceStrokeObject(new Path(this.freehandPath(this.strokePoints), this.strokeStyle()) as unknown as DrawingObject);
    } else if (this.drawingMode === "sine") {
      this.replaceStrokeObject(new Path(this.sinePath(this.strokeStart, point), this.strokeStyle()) as unknown as DrawingObject);
    } else {
      const nextShape = this.createShape(this.strokeStart, point);
      if (nextShape) this.replaceStrokeObject(nextShape);
    }
    this.canvas.renderAll();
  };

  private readonly onMouseUp = (): void => {
    this.strokeStart = null;
    this.strokeObject = null;
    this.strokePoints = [];
    this.canvas?.renderAll();
  };

  mount(element: HTMLCanvasElement): void {
    this.canvas = new Canvas(element, { preserveObjectStacking: true, selection: false });
    this.canvas.on("mouse:down", this.onMouseDown);
    this.canvas.on("mouse:move", this.onMouseMove);
    this.canvas.on("mouse:up", this.onMouseUp);
  }

  async loadImage(url: string, size: CanvasSize): Promise<void> {
    if (!this.canvas) return;
    this.canvas.clear();
    const response = await fetch(url);
    if (!response.ok) throw new Error("CANVAS_IMAGE_LOAD_FAILED");
    const blobUrl = URL.createObjectURL(await response.blob());
    try {
      const image = await FabricImage.fromURL(blobUrl);
      const scale = Math.min(size.width / (image.width || size.width), size.height / (image.height || size.height));
      image.set({ left: size.width / 2, top: size.height / 2, originX: "center", originY: "center", angle: 0, selectable: false, evented: false });
      image.scale(scale);
      this.baseScale = scale;
      this.canvas.add(image);
      this.canvas.renderAll();
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  setViewport(zoom: number, pan: Point): void {
    this.canvas?.setViewportTransform([zoom, 0, 0, zoom, pan.x, pan.y]);
    this.canvas?.renderAll();
  }

  resize(size: CanvasSize): void {
    this.canvas?.setDimensions(size);
    this.canvas?.renderAll();
  }

  setDrawing(enabled: boolean, color = "#ff3b30", width = 8, options: DrawingOptions = {}): void {
    if (!this.canvas) return;
    this.drawingEnabled = enabled;
    this.drawingColor = color;
    this.drawingWidth = Math.max(1, width);
    this.drawingOpacity = Math.max(0, Math.min(1, options.opacity ?? 1));
    this.drawingMode = options.mode ?? this.drawingMode;
    this.sineAmplitude = Math.max(1, options.amplitude ?? this.sineAmplitude);
    this.sineFrequency = Math.max(0.1, options.frequency ?? this.sineFrequency);
    this.canvas.isDrawingMode = false;
    if (!enabled) {
      this.strokeStart = null;
      this.strokeObject = null;
    }
    this.canvas.renderAll();
  }

  clearDrawing(): void {
    if (!this.canvas) return;
    this.canvas.getObjects().slice(1).forEach((object) => this.canvas?.remove(object));
    this.canvas.renderAll();
  }

  drawingDataUrl(): string | null {
    if (!this.canvas) return null;
    this.canvas.isDrawingMode = false;
    const image = this.canvas.getObjects()[0];
    if (!image) return this.canvas.toDataURL({ format: "png", multiplier: 1 });
    const width = image.getScaledWidth();
    const height = image.getScaledHeight();
    const left = Math.max(0, (image.left ?? 0) - width / 2);
    const top = Math.max(0, (image.top ?? 0) - height / 2);
    const previousTransform: [number, number, number, number, number, number] = this.canvas.viewportTransform ? [...this.canvas.viewportTransform] as [number, number, number, number, number, number] : [1, 0, 0, 1, 0, 0];
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    try {
      return this.canvas.toDataURL({ format: "png", left, top, width, height, multiplier: 1 });
    } finally {
      this.canvas.setViewportTransform(previousTransform);
      this.canvas.renderAll();
    }
  }

  setRotation(angle: number): void {
    const image = this.canvas?.getObjects()[0];
    if (!image) return;
    const angleRadians = Math.abs(angle % 360) * Math.PI / 180;
    const baseWidth = (image.width || 0) * this.baseScale;
    const baseHeight = (image.height || 0) * this.baseScale;
    const boundsWidth = Math.abs(baseWidth * Math.cos(angleRadians)) + Math.abs(baseHeight * Math.sin(angleRadians));
    const boundsHeight = Math.abs(baseWidth * Math.sin(angleRadians)) + Math.abs(baseHeight * Math.cos(angleRadians));
    const canvasWidth = this.canvas?.getWidth() || boundsWidth;
    const canvasHeight = this.canvas?.getHeight() || boundsHeight;
    const containScale = Math.min(1, canvasWidth / Math.max(1, boundsWidth), canvasHeight / Math.max(1, boundsHeight));
    image.set({ angle, left: canvasWidth / 2, top: canvasHeight / 2 });
    image.scale(this.baseScale * containScale);
    image.setCoords();
    this.canvas?.renderAll();
  }

  private imageBounds(): { left: number; top: number; right: number; bottom: number } | null {
    const image = this.canvas?.getObjects()[0];
    if (!image) return null;
    const width = image.getScaledWidth();
    const height = image.getScaledHeight();
    return {
      left: (image.left ?? 0) - width / 2,
      top: (image.top ?? 0) - height / 2,
      right: (image.left ?? 0) + width / 2,
      bottom: (image.top ?? 0) + height / 2
    };
  }

  private canvasPoint(event: any): DrawingPoint | null {
    if (!this.canvas) return null;
    const element = this.canvas.upperCanvasEl;
    const rect = element.getBoundingClientRect();
    const viewport = this.canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
    const scaleX = this.canvas.getWidth() / Math.max(1, rect.width);
    const scaleY = this.canvas.getHeight() / Math.max(1, rect.height);
    const viewportX = (event.clientX - rect.left) * scaleX;
    const viewportY = (event.clientY - rect.top) * scaleY;
    const point = { x: (viewportX - viewport[4]) / viewport[0], y: (viewportY - viewport[5]) / viewport[3] };
    const bounds = this.imageBounds();
    if (!bounds) return point;
    return {
      x: Math.max(bounds.left, Math.min(bounds.right, point.x)),
      y: Math.max(bounds.top, Math.min(bounds.bottom, point.y))
    };
  }

  private strokeStyle(): Record<string, unknown> {
    return { fill: "", stroke: this.drawingColor, strokeWidth: this.drawingWidth, opacity: this.drawingOpacity, selectable: false, evented: false, strokeLineCap: "round", strokeLineJoin: "round" };
  }

  private createShape(start: DrawingPoint, end: DrawingPoint): DrawingObject | null {
    const style = this.strokeStyle();
    if (this.drawingMode === "line") return new Line([start.x, start.y, end.x, end.y], style) as unknown as DrawingObject;
    if (this.drawingMode === "rectangle") return new Rect({ ...style, left: Math.min(start.x, end.x), top: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) }) as unknown as DrawingObject;
    if (this.drawingMode === "ellipse") return new Ellipse({ ...style, left: Math.min(start.x, end.x), top: Math.min(start.y, end.y), rx: Math.abs(end.x - start.x) / 2, ry: Math.abs(end.y - start.y) / 2 }) as unknown as DrawingObject;
    if (this.drawingMode === "sine") return new Path(this.sinePath(start, end), style) as unknown as DrawingObject;
    return null;
  }

  private updateShape(object: DrawingObject, start: DrawingPoint, end: DrawingPoint): void {
    if (this.drawingMode === "line") object.set({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
    else if (this.drawingMode === "rectangle") object.set({ left: Math.min(start.x, end.x), top: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) });
    else if (this.drawingMode === "ellipse") object.set({ left: Math.min(start.x, end.x), top: Math.min(start.y, end.y), rx: Math.abs(end.x - start.x) / 2, ry: Math.abs(end.y - start.y) / 2 });
    else if (this.drawingMode === "sine") object.set({ path: new Path(this.sinePath(start, end), this.strokeStyle()).path });
    object.setCoords?.();
  }

  private replaceStrokeObject(nextObject: DrawingObject): void {
    if (!this.canvas) return;
    if (this.strokeObject) this.canvas.remove(this.strokeObject as any);
    this.strokeObject = nextObject;
    this.canvas.add(nextObject as any);
  }

  private freehandPath(points: DrawingPoint[]): string {
    if (!points.length) return "M 0 0";
    if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  }

  private sinePath(start: DrawingPoint, end: DrawingPoint): string {
    const dx = end.x - start.x;
    const length = Math.max(1, Math.abs(dx));
    const direction = dx < 0 ? -1 : 1;
    const steps = Math.max(16, Math.ceil(length / 6));
    const points: string[] = [];
    for (let index = 0; index <= steps; index += 1) {
      const progress = index / steps;
      const x = start.x + direction * length * progress;
      const baseline = start.y + (end.y - start.y) * progress;
      const y = baseline + this.sineAmplitude * Math.sin(2 * Math.PI * this.sineFrequency * progress);
      points.push(`${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return points.join(" ");
  }

  async dispose(): Promise<void> {
    if (!this.canvas) return;
    this.canvas.off("mouse:down", this.onMouseDown);
    this.canvas.off("mouse:move", this.onMouseMove);
    this.canvas.off("mouse:up", this.onMouseUp);
    await this.canvas.dispose();
    this.canvas = null;
    this.drawingEnabled = false;
  }
}

export type { DrawingOptions };
