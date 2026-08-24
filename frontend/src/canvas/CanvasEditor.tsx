import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart3, Combine, Eraser, FileDown, Filter, Image as ImageIcon, Maximize, Minus, Move, Pencil, Plus, RotateCcw, SlidersHorizontal, Sparkles, Trash2, Type } from "lucide-react";
import { FabricCanvasAdapter } from "@/canvas/adapter/FabricCanvasAdapter";
import type { DrawingMode } from "@/canvas/adapter/FabricCanvasAdapter";
import { useCanvasStore } from "@/stores/canvasStore";
import { useAssetStore } from "@/stores/assetStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useTransformStore } from "@/stores/transformStore";
import { usePixelStore } from "@/stores/pixelStore";
import { useUiStore } from "@/stores/uiStore";
import { TransformPanel } from "@/features/transform/TransformPanel";
import { PixelPanel } from "@/features/pixel/PixelPanel";
import { FilterPanel } from "@/features/filter/FilterPanel";
import { HistogramPanel } from "@/features/histogram/HistogramPanel";
import { BackgroundRemovalPanel } from "@/features/background/BackgroundRemovalPanel";
import { BackgroundLibraryPanel } from "@/features/backgroundLibrary/BackgroundLibraryPanel";
import { BlendingPanel } from "@/features/blending/BlendingPanel";
import { CreativePanel } from "@/features/creative/CreativePanel";
import { ExportPanel } from "@/features/export/ExportPanel";
import { BlurAreaPanel } from "@/features/blur/BlurAreaPanel";
import { WatermarkPanel } from "@/features/watermark/WatermarkPanel";
import { TextPanel, type TextObjectState } from "@/features/text/TextPanel";
import { LayersPanel } from "@/features/layers/LayersPanel";
import { useFilterStore } from "@/stores/filterStore";
import { useHistogramStore } from "@/stores/histogramStore";
import { useBackgroundStore } from "@/stores/backgroundStore";
import { useBlendingStore } from "@/stores/blendingStore";
import { useCreativeStore } from "@/stores/creativeStore";
import { useExportStore } from "@/stores/exportStore";
import { useBlurStore } from "@/stores/blurStore";
import { useWatermarkStore } from "@/stores/watermarkStore";
import { useTextStore, type TextParameters } from "@/stores/textStore";
import { getApiOrigin } from "@/services/apiConfig";
import { useLayersStore } from "@/stores/layersStore";
import type { Asset } from "@/types/asset";
import { ProcessingComparison } from "@/components/ProcessingComparison";
import { uploadAsset } from "@/services/assets/uploadService";

const apiOrigin = getApiOrigin();

function ToolPanelPortal({ children }: { children: React.ReactNode }) {
  const host = typeof document === "undefined" ? null : document.getElementById("properties-tool-root");
  return host ? createPortal(children, host) : null;
}

function contentUrl(asset: Asset): string {
  return asset.content_url.startsWith("http") ? asset.content_url : `${apiOrigin}${asset.content_url}`;
}

export function CanvasEditor({ asset }: { asset: Asset }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const adapterRef = useRef<FabricCanvasAdapter | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const setInteractiveRotation = (angle: number) => { adapterRef.current?.setRotation(angle); };
  const [transformOpen, setTransformOpen] = useState(false);
  const [pixelOpen, setPixelOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [histogramOpen, setHistogramOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [blendingOpen, setBlendingOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [creativeOpen, setCreativeOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [blurOpen, setBlurOpen] = useState(false);
  const [watermarkOpen, setWatermarkOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [drawingColor, setDrawingColor] = useState("#ff3b30");
  const [drawingWidth, setDrawingWidth] = useState(8);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("freehand");
  const [drawingAmplitude, setDrawingAmplitude] = useState(20);
  const [drawingFrequency, setDrawingFrequency] = useState(2);
  const [drawingError, setDrawingError] = useState<string | null>(null);
  const [textObject, setTextObject] = useState<TextObjectState | null>(null);
  const [textDrag, setTextDrag] = useState(false);
  const [layerDrag, setLayerDrag] = useState<string | null>(null);
  const [perspectivePoints, setPerspectivePoints] = useState<Array<[number, number]>>([[0, 0], [asset.metadata.width, 0], [asset.metadata.width, asset.metadata.height], [0, asset.metadata.height]]);
  const [perspectiveDrag, setPerspectiveDrag] = useState<number | null>(null);
  const { t, activeTool, setActiveTool } = useUiStore();
  const viewport = useCanvasStore();
  const previewAsset = usePixelStore((state) => state.previewAsset);
  const filterPreviewAsset = useFilterStore((state) => state.previewAsset);
  const transformPreviewAsset = useTransformStore((state) => state.previewAsset);
  const histogramPreviewAsset = useHistogramStore((state) => state.previewAsset);
  const backgroundPreviewAsset = useBackgroundStore((state) => state.previewAsset);
  const blendingPreviewAsset = useBlendingStore((state) => state.previewAsset);
  const blendingSecondAsset = useBlendingStore((state) => state.secondAsset);
  const creativePreviewAsset = useCreativeStore((state) => state.previewAsset);
  const blurPreviewAsset = useBlurStore((state) => state.previewAsset);
  const watermarkPreviewAsset = useWatermarkStore((state) => state.previewAsset);
  const textPreviewAsset = useTextStore((state) => state.previewAsset);
  const layerItems = useLayersStore((state) => state.layers);
  const selectedLayerId = useLayersStore((state) => state.selectedId);
  const creativeSampleMode = useCreativeStore((state) => state.sampleMode);
  const pixelStatus = usePixelStore((state) => state.status);
  const filterStatus = useFilterStore((state) => state.status);
  const transformStatus = useTransformStore((state) => state.status);
  const histogramStatus = useHistogramStore((state) => state.status);
  const backgroundStatus = useBackgroundStore((state) => state.status);
  const blendingStatus = useBlendingStore((state) => state.status);
  const creativeStatus = useCreativeStore((state) => state.status);
  const blurStatus = useBlurStore((state) => state.status);
  const watermarkStatus = useWatermarkStore((state) => state.status);
  const textStatus = useTextStore((state) => state.status);
  const layersStatus = useLayersStore((state) => state.status);
  const displayAsset = textPreviewAsset ?? watermarkPreviewAsset ?? blurPreviewAsset ?? creativePreviewAsset ?? blendingPreviewAsset ?? backgroundPreviewAsset ?? histogramPreviewAsset ?? transformPreviewAsset ?? filterPreviewAsset ?? previewAsset ?? asset;
  const previewComparisonAsset = textPreviewAsset ?? watermarkPreviewAsset ?? blurPreviewAsset ?? creativePreviewAsset ?? blendingPreviewAsset ?? backgroundPreviewAsset ?? histogramPreviewAsset ?? transformPreviewAsset ?? filterPreviewAsset ?? previewAsset;
  const isProcessing = [pixelStatus, filterStatus, transformStatus, histogramStatus, backgroundStatus, blendingStatus, creativeStatus, blurStatus, watermarkStatus, textStatus, layersStatus].some((status) => ["loading", "previewing", "applying"].includes(status));
  const showComparison = Boolean(asset);
  // The live Canvas must stay bound to the committed Current Asset. Preview assets are comparison-only.
  const imageSize = { width: asset.metadata.width, height: asset.metadata.height };
  const [cropPreview, setCropPreview] = useState({ x: 0, y: 0, width: imageSize.width, height: imageSize.height });
  const [cropDrag, setCropDrag] = useState<"nw" | "ne" | "sw" | "se" | null>(null);
  const [blurRegion, setBlurRegion] = useState({ x: 0, y: 0, width: imageSize.width, height: imageSize.height });
  const [blurDrag, setBlurDrag] = useState<"nw" | "ne" | "sw" | "se" | null>(null);
  const transformOperation = useTransformStore((state) => state.operation);
  const closeTransform = () => { useTransformStore.getState().cancel(); setTransformOpen(false); setCropPreview({ x: 0, y: 0, width: imageSize.width, height: imageSize.height }); setActiveTool(null); };
  const closePixel = () => { usePixelStore.getState().cancel(); setPixelOpen(false); setActiveTool(null); };
  const closeFilter = () => { useFilterStore.getState().cancel(); setFilterOpen(false); setActiveTool(null); };
  const closeHistogram = () => { useHistogramStore.getState().cancel(); setHistogramOpen(false); setActiveTool(null); };
  const closeBackground = () => { useBackgroundStore.getState().cancel(); setBackgroundOpen(false); setActiveTool(null); };
  const closeBlending = () => { useBlendingStore.getState().cancel(); setBlendingOpen(false); setActiveTool(null); };
  const closeLibrary = () => { setLibraryOpen(false); setActiveTool(null); };
  const closeCreative = () => { useCreativeStore.getState().cancel(); setCreativeOpen(false); setActiveTool(null); };
  const closeExport = () => { useExportStore.getState().cancel(); setExportOpen(false); setActiveTool(null); };
  const closeBlur = () => { useBlurStore.getState().cancel(); setBlurOpen(false); setBlurRegion({ x: 0, y: 0, width: imageSize.width, height: imageSize.height }); setActiveTool(null); };
  const closeWatermark = () => { useWatermarkStore.getState().cancel(); setWatermarkOpen(false); setActiveTool(null); };
  const closeText = () => { useTextStore.getState().cancel(); setTextOpen(false); setTextObject(null); setTextDrag(false); setActiveTool(null); };
  const closeLayers = () => { useLayersStore.getState().cancel(); setLayersOpen(false); setLayerDrag(null); setActiveTool(null); };
  const closeDrawing = () => { adapterRef.current?.setDrawing(false); adapterRef.current?.clearDrawing(); setDrawingOpen(false); setDrawingError(null); setActiveTool(null); };
  const applyDrawing = async () => { const dataUrl = adapterRef.current?.drawingDataUrl(); if (!dataUrl) return; try { const blob = await (await fetch(dataUrl)).blob(); const nextAsset = await uploadAsset(new File([blob], `${asset.filename.replace(/\.[^.]+$/, "")}-drawing.png`, { type: "image/png" })); useAssetStore.getState().setAsset(nextAsset, { tool: "drawing", operation: "draw", parameters: { mode: drawingMode, color: drawingColor, width: drawingWidth, amplitude: drawingAmplitude, frequency: drawingFrequency } }); setDrawingOpen(false); setDrawingError(null); setActiveTool(null); } catch { setDrawingError("DRAWING_APPLY_FAILED"); } };
  const deleteCurrentImage = () => { useTransformStore.getState().cancel(); usePixelStore.getState().cancel(); useFilterStore.getState().cancel(); useHistogramStore.getState().cancel(); useBackgroundStore.getState().cancel(); useBlendingStore.getState().cancel(); useCreativeStore.getState().cancel(); useExportStore.getState().cancel(); useBlurStore.getState().cancel(); useWatermarkStore.getState().cancel(); useTextStore.getState().cancel(); useLayersStore.getState().cancel(); adapterRef.current?.setDrawing(false); useAssetStore.getState().reset(); setActiveTool(null); };
  const createText = (parameters: TextParameters) => { const object = { ...parameters, id: crypto.randomUUID() }; setTextObject(object); useTextStore.getState().preview(asset, parameters); };
  const updateText = (parameters: TextParameters) => { if (!textObject) return; setTextObject({ ...parameters, id: textObject.id }); useTextStore.getState().preview(asset, parameters); };
  const deleteText = () => { useTextStore.getState().cancel(); setTextObject(null); setTextDrag(false); };
  const useLibraryBackground = (backgroundAsset: Asset) => { useBackgroundStore.getState().setParameter("background_mode", "image"); useBackgroundStore.getState().setBackgroundAsset(backgroundAsset); setLibraryOpen(false); setBackgroundOpen(true); setActiveTool("background"); };

  useEffect(() => {
    setCropPreview({ x: 0, y: 0, width: imageSize.width, height: imageSize.height });
    setPerspectivePoints([[0, 0], [imageSize.width, 0], [imageSize.width, imageSize.height], [0, imageSize.height]]);
    setBlurRegion({ x: 0, y: 0, width: imageSize.width, height: imageSize.height });
  }, [asset.asset_id]);

  useEffect(() => {
    const unregisterApplier = useHistoryStore.getState().registerAssetApplier((nextAsset) => useAssetStore.getState().setAsset(nextAsset));
    const unregisterValidator = useHistoryStore.getState().registerAssetValidator(async (nextAsset) => { try { const response = await fetch(contentUrl(nextAsset)); await response.body?.cancel(); return response.ok; } catch { return false; } });
    const unregisterNavigation = useHistoryStore.getState().registerBeforeNavigation(() => {
      useTransformStore.getState().cancel();
      usePixelStore.getState().cancel();
      useFilterStore.getState().cancel();
      useHistogramStore.getState().cancel();
      useBackgroundStore.getState().cancel();
      useBlendingStore.getState().cancel();
      useCreativeStore.getState().cancel();
      useExportStore.getState().cancel();
      useBlurStore.getState().cancel();
      useWatermarkStore.getState().cancel();
      useTextStore.getState().cancel();
      useLayersStore.getState().cancel();
      setActiveTool(null);
    });
    return () => { unregisterApplier(); unregisterValidator(); unregisterNavigation(); };
  }, []);

  useEffect(() => {
    setTransformOpen(activeTool === "transform");
    setPixelOpen(activeTool === "pixel");
    setFilterOpen(activeTool === "filters");
    setHistogramOpen(activeTool === "histogram");
    setBackgroundOpen(activeTool === "background");
    setBlendingOpen(activeTool === "blending");
    setLibraryOpen(activeTool === "background-library");
    setCreativeOpen(activeTool === "creative");
    setExportOpen(activeTool === "export");
    setBlurOpen(activeTool === "blur");
    setWatermarkOpen(activeTool === "watermark");
    setTextOpen(activeTool === "advanced-text");
    setLayersOpen(activeTool === "image-layers");
    setDrawingOpen(activeTool === "drawing");
  }, [activeTool]);

  useEffect(() => { adapterRef.current?.setDrawing(drawingOpen, drawingColor, drawingWidth, { mode: drawingMode, amplitude: drawingAmplitude, frequency: drawingFrequency }); }, [drawingOpen, drawingColor, drawingWidth, drawingMode, drawingAmplitude, drawingFrequency]);

  useEffect(() => {
    if (!canvasRef.current) return;
    setLoadError(false);
    const adapter = new FabricCanvasAdapter();
    let active = true;
    try {
      adapter.mount(canvasRef.current);
      adapterRef.current = adapter;
      void adapter.loadImage(contentUrl(asset), imageSize).then(() => { if (active) { setLoadError(false); useCanvasStore.getState().fitToScreen(imageSize); const nextViewport = useCanvasStore.getState(); adapter.setViewport(nextViewport.zoom, nextViewport.pan); requestAnimationFrame(() => requestAnimationFrame(() => { if (!active) return; const stableViewport = useCanvasStore.getState(); adapter.setViewport(stableViewport.zoom, stableViewport.pan); })); } }).catch(() => { if (active) setLoadError(true); });
    } catch {
      if (active) setLoadError(true);
    }
    return () => { active = false; void adapter.dispose(); adapterRef.current = null; };
  }, [asset.asset_id]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const measurementTarget = wrapper;
    const applyContainerSize = (size: { width: number; height: number }) => { const currentViewport = useCanvasStore.getState(); const containerChanged = currentViewport.container.width !== size.width || currentViewport.container.height !== size.height; viewport.setContainer(size); adapterRef.current?.resize(size); if (containerChanged && size.width > 1 && size.height > 1) { useCanvasStore.getState().fitToScreen(imageSize); const nextViewport = useCanvasStore.getState(); adapterRef.current?.setViewport(nextViewport.zoom, nextViewport.pan); requestAnimationFrame(() => { const stableViewport = useCanvasStore.getState(); adapterRef.current?.setViewport(stableViewport.zoom, stableViewport.pan); }); } };
    const initialRect = measurementTarget.getBoundingClientRect();
    applyContainerSize({ width: initialRect.width, height: initialRect.height });
    const frame = requestAnimationFrame(() => { const rect = measurementTarget.getBoundingClientRect(); applyContainerSize({ width: rect.width, height: rect.height }); });
    const observer = new ResizeObserver(([entry]) => { const size = { width: entry.contentRect.width, height: entry.contentRect.height }; applyContainerSize(size); });
    observer.observe(measurementTarget);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  useEffect(() => { adapterRef.current?.setViewport(viewport.zoom, viewport.pan); }, [viewport.zoom, viewport.pan.x, viewport.pan.y]);

  const onPointerDown = (event: React.PointerEvent) => { if (event.button !== 0 || drawingOpen) return; if (creativeOpen) { const wrapper = wrapperRef.current; if (!wrapper) return; const bounds = wrapper.getBoundingClientRect(); const x = Math.floor((event.clientX - bounds.left - viewport.pan.x) / viewport.zoom); const y = Math.floor((event.clientY - bounds.top - viewport.pan.y) / viewport.zoom); if (x >= 0 && x < asset.metadata.width && y >= 0 && y < asset.metadata.height) void useCreativeStore.getState().samplePixel(asset, x, y, creativeSampleMode); return; } setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); };
    const onPointerMove = (event: React.PointerEvent) => { if (creativeOpen || drawingOpen) return; if (layerDrag) { const layer = useLayersStore.getState().layers.find((item) => item.id === layerDrag); if (layer) { useLayersStore.getState().updateLayer(layer.id, { x: Math.round(layer.x + event.movementX / viewport.zoom), y: Math.round(layer.y + event.movementY / viewport.zoom) }); } return; } if (textDrag && textObject) {
 const dx = event.movementX / viewport.zoom; const dy = event.movementY / viewport.zoom; const { id: _textId, ...currentParameters } = textObject; updateText({ ...currentParameters, x: Math.max(0, Math.min(imageSize.width - 1, Math.round(textObject.x + dx))), y: Math.max(0, Math.min(imageSize.height - 1, Math.round(textObject.y + dy))) }); return; } if (perspectiveDrag !== null) { const dx = event.movementX / viewport.zoom; const dy = event.movementY / viewport.zoom; setPerspectivePoints((current) => current.map((point, index) => index === perspectiveDrag ? [Math.max(0, Math.min(imageSize.width, point[0] + dx)), Math.max(0, Math.min(imageSize.height, point[1] + dy))] : point)); return; } if (cropDrag) { const dx = event.movementX / viewport.zoom; const dy = event.movementY / viewport.zoom; setCropPreview((current) => { const next = { ...current }; if (cropDrag.includes("e")) next.width = Math.min(imageSize.width - next.x, Math.max(1, next.width + dx)); if (cropDrag.includes("s")) next.height = Math.min(imageSize.height - next.y, Math.max(1, next.height + dy)); if (cropDrag.includes("w")) { const nextX = Math.max(0, Math.min(current.x + dx, current.x + current.width - 1)); next.width = current.width - (nextX - current.x); next.x = nextX; } if (cropDrag.includes("n")) { const nextY = Math.max(0, Math.min(current.y + dy, current.y + current.height - 1)); next.height = current.height - (nextY - current.y); next.y = nextY; } return next; }); return; } if (blurDrag) { const dx = event.movementX / viewport.zoom; const dy = event.movementY / viewport.zoom; setBlurRegion((current) => { const next = { ...current }; if (blurDrag.includes("e")) next.width = Math.min(imageSize.width - next.x, Math.max(1, current.width + dx)); if (blurDrag.includes("s")) next.height = Math.min(imageSize.height - next.y, Math.max(1, current.height + dy)); if (blurDrag.includes("w")) { const nextX = Math.max(0, Math.min(current.x + dx, current.x + current.width - 1)); next.width = current.width - (nextX - current.x); next.x = nextX; } if (blurDrag.includes("n")) { const nextY = Math.max(0, Math.min(current.y + dy, current.y + current.height - 1)); next.height = current.height - (nextY - current.y); next.y = nextY; } return next; }); return; } if (dragging) viewport.panBy({ x: event.movementX, y: event.movementY }); };
  const onPointerUp = () => { if (creativeOpen || drawingOpen) return; setDragging(false); setTextDrag(false); setLayerDrag(null); setCropDrag(null); setBlurDrag(null); setPerspectiveDrag(null); };
  const controls = [
    [t("zoomOut"), <Minus size={16} />, viewport.zoomOut],
    [t("zoomIn"), <Plus size={16} />, viewport.zoomIn],
    [t("fitToScreen"), <Maximize size={16} />, () => viewport.fitToScreen(imageSize)],
    [t("actualSize"), <span className="text-xs font-bold">1:1</span>, () => viewport.actualSize(imageSize)],
    [t("resetView"), <RotateCcw size={16} />, () => viewport.resetView(imageSize)]
  ] as const;
  const handles = [{ key: "nw", left: 0, top: 0 }, { key: "ne", left: 100, top: 0 }, { key: "sw", left: 0, top: 100 }, { key: "se", left: 100, top: 100 }] as const;
  return <section className="canvas-editor-shell relative flex h-full min-h-[calc(100vh-112px)] flex-col" aria-label={t("canvasArea")}><div className="canvas-editor-toolbar flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2"><div className="flex min-w-0 items-center gap-2 text-xs text-[var(--color-text-secondary)]"><Move size={15} /><span className="truncate">{displayAsset.filename}</span><span className="text-[var(--color-success)]">{watermarkPreviewAsset ? t("watermarkProcessing") : blurPreviewAsset ? t("blurAreaPreview") : blendingPreviewAsset ? t("blending") : backgroundPreviewAsset ? t("backgroundRemoval") : histogramPreviewAsset ? t("histogramAfter") : transformPreviewAsset ? t("transformPreview") : filterPreviewAsset ? t("filterPreview") : previewAsset ? t("pixelPreview") : t("uploadSuccess")}</span><span>{displayAsset.metadata.width}px × {displayAsset.metadata.height}px</span></div><div className="toolbar-actions flex min-w-0 items-center gap-1 overflow-x-auto"><button onClick={() => { setTransformOpen((open) => !open); setPixelOpen(false); setActiveTool("transform"); }} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={t("transform")} title={t("transform")}><SlidersHorizontal size={16} /></button><button onClick={() => { setPixelOpen((open) => !open); setFilterOpen(false); setTransformOpen(false); setActiveTool("pixel"); }} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={t("pixelOperations")} title={t("pixelOperations")}><Sparkles size={16} /></button><button onClick={() => { setFilterOpen((open) => !open); setHistogramOpen(false); setPixelOpen(false); setTransformOpen(false); setActiveTool("filters"); }} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={t("filters")} title={t("filters")}><Filter size={16} /></button><button onClick={() => { setBlurOpen((open) => !open); setWatermarkOpen(false); setFilterOpen(false); setHistogramOpen(false); setPixelOpen(false); setTransformOpen(false); setActiveTool("blur"); }} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={t("blurAreaTitle")} title={t("blurAreaTitle")}><Eraser size={16} /></button><button onClick={() => { setWatermarkOpen(true); setBlurOpen(false); setFilterOpen(false); setHistogramOpen(false); setPixelOpen(false); setTransformOpen(false); setActiveTool("watermark"); }} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={t("watermark")} title={t("watermark")}><Type size={16} /></button><button onClick={() => { setTextOpen(true); setWatermarkOpen(false); setBlurOpen(false); setActiveTool("advanced-text"); }} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={t("advancedText")} title={t("advancedText")}><Type size={16} /></button><button onClick={() => { setHistogramOpen((open) => !open); setBackgroundOpen(false); setFilterOpen(false); setPixelOpen(false); setTransformOpen(false); setActiveTool("histogram"); }} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={t("histogram")} title={t("histogram")}><BarChart3 size={16} /></button><button onClick={() => { setBackgroundOpen(true); setBlendingOpen(false); setHistogramOpen(false); setFilterOpen(false); setPixelOpen(false); setTransformOpen(false); setActiveTool("background"); }} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={t("backgroundRemoval")} title={t("backgroundRemoval")}><Eraser size={16} /></button><button onClick={() => { setBlendingOpen((open) => !open); setBackgroundOpen(false); setHistogramOpen(false); setFilterOpen(false); setPixelOpen(false); setTransformOpen(false); setLibraryOpen(false); setActiveTool("blending"); }} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={t("blending")} title={t("blending")}><Combine size={16} /></button><button onClick={() => { setLibraryOpen((open) => !open); setBackgroundOpen(false); setBlendingOpen(false); setHistogramOpen(false); setFilterOpen(false); setPixelOpen(false); setTransformOpen(false); setCreativeOpen(false); setActiveTool("background-library"); }} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={t("backgroundLibrary")} title={t("backgroundLibrary")}><ImageIcon size={16} /></button><button onClick={() => { setCreativeOpen((open) => !open); setLibraryOpen(false); setBackgroundOpen(false); setBlendingOpen(false); setHistogramOpen(false); setFilterOpen(false); setPixelOpen(false); setTransformOpen(false); setExportOpen(false); setActiveTool("creative"); }} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={t("creative")} title={t("creative")}><Sparkles size={16} /></button><button onClick={() => { setExportOpen((open) => !open); setCreativeOpen(false); setLibraryOpen(false); setBackgroundOpen(false); setBlendingOpen(false); setHistogramOpen(false); setFilterOpen(false); setPixelOpen(false); setTransformOpen(false); setActiveTool("export"); }} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={t("export")} title={t("export")}><FileDown size={16} /></button><button onClick={() => { setLayersOpen((open) => !open); setTextOpen(false); setWatermarkOpen(false); setBlurOpen(false); setCreativeOpen(false); setLibraryOpen(false); setBackgroundOpen(false); setBlendingOpen(false); setExportOpen(false); setActiveTool("image-layers"); }} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={t("imageLayers")} title={t("imageLayers")}><ImageIcon size={16} /></button>{controls.map(([label, icon, action]) => <button key={label} onClick={action} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={label} title={label}>{icon}</button>)}<button onClick={() => { setDrawingOpen(true); setActiveTool("drawing"); setTransformOpen(false); setPixelOpen(false); }} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-panel)]" aria-label={t("drawing")} title={t("drawing")}><Pencil size={16} /></button><button onClick={deleteCurrentImage} className="grid size-8 place-items-center rounded-lg text-[var(--color-error)] hover:bg-[var(--color-panel)]" aria-label={t("deleteImage")} title={t("deleteImage")}><Trash2 size={16} /></button><span className="min-w-12 text-center text-xs font-semibold">{Math.round(viewport.zoom * 100)}%</span></div></div><div className="canvas-content-grid flex min-h-0 flex-1"><div className="main-canvas-wrapper"><div ref={wrapperRef} className="canvas-stage relative min-h-0 flex-1 overflow-hidden bg-[#0b1220]" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}><canvas ref={canvasRef} className="absolute inset-0" />{showComparison ? <div className="processing-comparison-dock"><ProcessingComparison title={activeTool === "blending" ? t("blendingComparison") : t("processingComparison")} processing={isProcessing} processingLabel={t("processingOverlay")} items={activeTool === "blending" && blendingSecondAsset ? [{ label: t("imageOne"), url: contentUrl(asset), alt: t("imageOne") }, { label: t("imageTwo"), url: contentUrl(blendingSecondAsset), alt: t("imageTwo") }, { label: t("mergedResult"), url: contentUrl(previewComparisonAsset ?? asset), alt: t("mergedResult") }] : [{ label: t("originalImage"), url: contentUrl(asset), alt: t("originalImage") }, { label: t("processedImage"), url: contentUrl(previewComparisonAsset ?? asset), alt: t("processedImage") }]} /></div> : null}{loadError ? <div className="absolute inset-0 grid place-items-center bg-[var(--color-background)] text-sm text-[var(--color-error)]">{t("canvasLoadError")}</div> : null}{transformOpen && transformOperation === "crop" ? <div className="pointer-events-none absolute border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-primary)]/10" style={{ left: viewport.pan.x + cropPreview.x * viewport.zoom, top: viewport.pan.y + cropPreview.y * viewport.zoom, width: cropPreview.width * viewport.zoom, height: cropPreview.height * viewport.zoom }} /> : null}{transformOpen && transformOperation === "crop" ? handles.map((handle) => <button key={handle.key} type="button" aria-label={`${t("cropHandle")} ${handle.key}`} className="absolute z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--color-primary)]" style={{ left: viewport.pan.x + (cropPreview.x + cropPreview.width * handle.left / 100) * viewport.zoom, top: viewport.pan.y + (cropPreview.y + cropPreview.height * handle.top / 100) * viewport.zoom }} onPointerDown={(event) => { event.stopPropagation(); setCropDrag(handle.key); event.currentTarget.setPointerCapture(event.pointerId); }} />) : null}{blurOpen ? <div className="pointer-events-none absolute border-2 border-dashed border-[var(--color-accent)] bg-[var(--color-accent)]/10" style={{ left: viewport.pan.x + blurRegion.x * viewport.zoom, top: viewport.pan.y + blurRegion.y * viewport.zoom, width: blurRegion.width * viewport.zoom, height: blurRegion.height * viewport.zoom }} /> : null}{blurOpen ? handles.map((handle) => <button key={`blur-${handle.key}`} type="button" aria-label={`${t("blurAreaTitle")} ${handle.key}`} className="absolute z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--color-accent)]" style={{ left: viewport.pan.x + (blurRegion.x + blurRegion.width * handle.left / 100) * viewport.zoom, top: viewport.pan.y + (blurRegion.y + blurRegion.height * handle.top / 100) * viewport.zoom }} onPointerDown={(event) => { event.stopPropagation(); setBlurDrag(handle.key); event.currentTarget.setPointerCapture(event.pointerId); }} />) : null}{transformOpen && transformOperation === "perspective" ? perspectivePoints.map((point, index) => <button key={index} type="button" aria-label={`${t("point")} ${index + 1}`} className="absolute z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--color-accent)]" style={{ left: viewport.pan.x + point[0] * viewport.zoom, top: viewport.pan.y + point[1] * viewport.zoom }} onPointerDown={(event) => { event.stopPropagation(); setPerspectiveDrag(index); event.currentTarget.setPointerCapture(event.pointerId); }} />) : null}{layersOpen ? layerItems.map((layer) => <img key={layer.id} src={contentUrl(layer.source)} alt={layer.name} className={`absolute z-10 origin-top-left cursor-move border-2 ${selectedLayerId === layer.id ? "border-[var(--color-primary)]" : "border-transparent"}`} style={{ left: viewport.pan.x + layer.x * viewport.zoom, top: viewport.pan.y + layer.y * viewport.zoom, width: layer.source.metadata.width * layer.scale * viewport.zoom, height: layer.source.metadata.height * layer.scale * viewport.zoom, opacity: layer.visible ? layer.opacity / 100 : 0, transform: `rotate(${layer.rotation}deg)` }} onPointerDown={(event) => { event.stopPropagation(); useLayersStore.getState().selectLayer(layer.id); setLayerDrag(layer.id); event.currentTarget.setPointerCapture(event.pointerId); }} aria-label={layer.name} />) : null}{textOpen && textObject ? <div className="absolute z-10 cursor-move whitespace-pre-wrap border-2 border-dashed border-[var(--color-primary)] bg-transparent p-2 text-transparent" style={{ left: viewport.pan.x + textObject.x * viewport.zoom, top: viewport.pan.y + textObject.y * viewport.zoom, width: textObject.width ? textObject.width * viewport.zoom : undefined, height: textObject.height ? textObject.height * viewport.zoom : undefined, opacity: textObject.opacity / 100, transform: `rotate(${textObject.rotation}deg)`, direction: textObject.direction === "auto" ? undefined : textObject.direction }} onPointerDown={(event) => { event.stopPropagation(); setTextDrag(true); event.currentTarget.setPointerCapture(event.pointerId); }} aria-label={t("advancedText")}>{textObject.text}</div> : null}</div></div>{<ToolPanelPortal>{pixelOpen ? <aside className="tool-control-panel shrink-0 overflow-y-auto border-s border-[var(--color-border)] bg-[var(--color-panel)] p-4"><button type="button" className="tool-back-button mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-background)]" onClick={closePixel}>{t("backToMainMenu")}</button><PixelPanel onClose={closePixel} /></aside> : null}{filterOpen ? <aside className="tool-control-panel shrink-0 overflow-y-auto border-s border-[var(--color-border)] bg-[var(--color-panel)] p-4"><button type="button" className="tool-back-button mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-background)]" onClick={closeFilter}>{t("backToMainMenu")}</button><FilterPanel onClose={closeFilter} /></aside> : null}{histogramOpen ? <aside className="tool-control-panel shrink-0 overflow-y-auto border-s border-[var(--color-border)] bg-[var(--color-panel)] p-4"><button type="button" className="tool-back-button mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-background)]" onClick={closeHistogram}>{t("backToMainMenu")}</button><HistogramPanel onClose={closeHistogram} /></aside> : null}{(backgroundOpen || activeTool === "background") ? <aside className="tool-control-panel shrink-0 overflow-y-auto border-s border-[var(--color-border)] bg-[var(--color-panel)] p-4"><button type="button" className="tool-back-button mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-background)]" onClick={closeBackground}>{t("backToMainMenu")}</button><BackgroundRemovalPanel onClose={closeBackground} /></aside> : null}{(blendingOpen || activeTool === "blending") ? <aside className="tool-control-panel shrink-0 overflow-y-auto border-s border-[var(--color-border)] bg-[var(--color-panel)] p-4"><button type="button" className="tool-back-button mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-background)]" onClick={closeBlending}>{t("backToMainMenu")}</button><BlendingPanel onClose={closeBlending} /></aside> : null}{libraryOpen ? <aside className="tool-control-panel shrink-0 overflow-y-auto border-s border-[var(--color-border)] bg-[var(--color-panel)] p-4"><button type="button" className="tool-back-button mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-background)]" onClick={closeLibrary}>{t("backToMainMenu")}</button><BackgroundLibraryPanel onUse={useLibraryBackground} onClose={closeLibrary} /></aside> : null}{creativeOpen ? <aside className="tool-control-panel shrink-0 overflow-y-auto border-s border-[var(--color-border)] bg-[var(--color-panel)] p-4"><button type="button" className="tool-back-button mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-background)]" onClick={closeCreative}>{t("backToMainMenu")}</button><CreativePanel onClose={closeCreative} /></aside> : null}{(exportOpen || activeTool === "export") ? <aside className="tool-control-panel shrink-0 overflow-y-auto border-s border-[var(--color-border)] bg-[var(--color-panel)] p-4"><button type="button" className="tool-back-button mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-background)]" onClick={closeExport}>{t("backToMainMenu")}</button><ExportPanel asset={asset} onClose={closeExport} /></aside> : null}{transformOpen ? <aside className="tool-control-panel shrink-0 overflow-y-auto border-s border-[var(--color-border)] bg-[var(--color-panel)] p-4"><button type="button" className="tool-back-button mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-background)]" onClick={closeTransform}>{t("backToMainMenu")}</button><TransformPanel onClose={closeTransform} onInteractiveRotation={setInteractiveRotation} cropRegion={cropPreview} onCropPreview={setCropPreview} perspectivePoints={perspectivePoints} onPerspectivePreview={setPerspectivePoints} /></aside> : null}{blurOpen ? <aside className="tool-control-panel shrink-0 overflow-y-auto border-s border-[var(--color-border)] bg-[var(--color-panel)] p-4"><button type="button" className="tool-back-button mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-background)]" onClick={closeBlur}>{t("backToMainMenu")}</button><BlurAreaPanel onClose={closeBlur} region={blurRegion} onRegionPreview={setBlurRegion} /></aside> : null}{(watermarkOpen || activeTool === "watermark") ? <aside className="tool-control-panel shrink-0 overflow-y-auto border-s border-[var(--color-border)] bg-[var(--color-panel)] p-4"><button type="button" className="tool-back-button mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-background)]" onClick={closeWatermark}>{t("backToMainMenu")}</button><WatermarkPanel onClose={closeWatermark} /></aside> : null}{(textOpen || activeTool === "advanced-text") ? <aside className="tool-control-panel shrink-0 overflow-y-auto border-s border-[var(--color-border)] bg-[var(--color-panel)] p-4"><button type="button" className="tool-back-button mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-background)]" onClick={closeText}>{t("backToMainMenu")}</button><TextPanel onClose={closeText} textObject={textObject} onCreate={createText} onUpdate={updateText} onDelete={deleteText} /></aside> : null}{drawingOpen ? <aside className="tool-control-panel shrink-0 overflow-y-auto border-s border-[var(--color-border)] bg-[var(--color-panel)] p-4"><button type="button" className="tool-back-button mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-background)]" onClick={closeDrawing}>{t("backToMainMenu")}</button><div className="space-y-3" aria-label={t("drawingPanel")}><h2 className="text-base font-semibold">{t("drawingPanel")}</h2><label className="block text-xs"><span className="mb-1 block">{t("drawingToolType")}</span><select value={drawingMode} onChange={(event) => setDrawingMode(event.target.value as DrawingMode)} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2" aria-label={t("drawingToolType")}><option value="direct">{t("drawingDirect")}</option><option value="freehand">{t("drawingFreehand")}</option><option value="sine">{t("drawingSine")}</option><option value="line">{t("drawingLine")}</option><option value="rectangle">{t("drawingRectangle")}</option><option value="ellipse">{t("drawingEllipse")}</option></select></label><label className="block text-xs"><span className="mb-1 block">{t("drawingColor")}</span><input type="color" value={drawingColor} onChange={(event) => setDrawingColor(event.target.value)} className="h-9 w-full rounded-lg" aria-label={t("drawingColor")} /></label><label className="block text-xs"><span className="mb-1 flex justify-between"><span>{t("drawingBrushSize")}</span><output>{drawingWidth}</output></span><input type="range" min={1} max={64} value={drawingWidth} onChange={(event) => setDrawingWidth(Number(event.target.value))} className="w-full accent-[var(--color-primary)]" aria-label={t("drawingBrushSize")} /></label>{drawingMode === "sine" ? <><label className="block text-xs"><span className="mb-1 flex justify-between"><span>{t("drawingAmplitude")}</span><output>{drawingAmplitude}</output></span><input type="range" min={1} max={120} value={drawingAmplitude} onChange={(event) => setDrawingAmplitude(Number(event.target.value))} className="w-full accent-[var(--color-primary)]" aria-label={t("drawingAmplitude")} /></label><label className="block text-xs"><span className="mb-1 flex justify-between"><span>{t("drawingFrequency")}</span><output>{drawingFrequency}</output></span><input type="range" min={0.5} max={8} step={0.5} value={drawingFrequency} onChange={(event) => setDrawingFrequency(Number(event.target.value))} className="w-full accent-[var(--color-primary)]" aria-label={t("drawingFrequency")} /></label></> : null}{drawingError ? <p role="alert" className="text-xs text-[var(--color-error)]">{drawingError}</p> : null}<div className="flex gap-2"><button type="button" className="flex-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white" onClick={() => void applyDrawing()}>{t("apply")}</button><button type="button" className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" onClick={closeDrawing}>{t("cancel")}</button><button type="button" className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" onClick={() => adapterRef.current?.clearDrawing()}>{t("clearDrawing")}</button></div></div></aside> : null}{layersOpen ? <aside className="tool-control-panel shrink-0 overflow-y-auto border-s border-[var(--color-border)] bg-[var(--color-panel)] p-4"><button type="button" className="tool-back-button mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-background)]" onClick={closeLayers}>{t("backToMainMenu")}</button><LayersPanel asset={asset} onClose={closeLayers} /></aside> : null}</ToolPanelPortal>}</div></section>;
}
