import { useEffect, useRef, useState } from "react";
import { BarChart3, Combine, Eraser, FileDown, Filter, Image, Languages, Loader2, Menu, Moon, PanelRight, Pencil, Sparkles, Sun, Type, Upload, Wrench, X } from "lucide-react";
import { CanvasEditor } from "@/canvas/CanvasEditor";
import { useAssetStore } from "@/stores/assetStore";
import { useUiStore } from "@/stores/uiStore";
import { useHistoryStore } from "@/stores/historyStore";
import { HistoryControls } from "@/features/history/HistoryControls";
import type { TranslationKey } from "@/localization/translations";
import type { Asset } from "@/types/asset";
import { getApiOrigin } from "@/services/apiConfig";
import "@/styles/globals.css";

type Tool = { id: string; label: TranslationKey; icon: typeof Image };
type WorkspaceView = "editor" | "home" | "images";

function contentUrl(asset: Asset): string {
  return asset.content_url.startsWith("http") ? asset.content_url : `${getApiOrigin()}${asset.content_url}`;
}

const tools: Tool[] = [
  { id: "home", label: "home", icon: Image },
  { id: "assets", label: "images", icon: Upload },
  { id: "tools", label: "tools", icon: Wrench },
  { id: "pixel", label: "pixelOperations", icon: Sparkles },
  { id: "filters", label: "filters", icon: Filter },
  { id: "blur", label: "blurAreaTitle", icon: Eraser },
  { id: "watermark", label: "watermark", icon: Type },
  { id: "advanced-text", label: "advancedText", icon: Type },
  { id: "histogram", label: "histogram", icon: BarChart3 },
  { id: "background", label: "backgroundRemoval", icon: Eraser },
  { id: "blending", label: "blending", icon: Combine },
  { id: "background-library", label: "backgroundLibrary", icon: Image },
  { id: "creative", label: "creative", icon: Sparkles },
  { id: "drawing", label: "drawing", icon: Pencil },
  { id: "export", label: "export", icon: FileDown }
];

function TopBar() {
  const { locale, theme, t, toggleTheme, setLocale, toggleSidebar, toggleProperties } = useUiStore();
  return <header className="app-topbar relative shrink-0 sticky top-0 z-30 flex h-16 items-center justify-center border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 md:px-6" aria-label="topbar"><div className="topbar-leading flex items-center gap-3"><button className="rounded-lg p-2 hover:bg-[var(--color-panel)] md:hidden" onClick={toggleSidebar} aria-label={t("menu")}><Menu size={20} /></button><div className="grid size-9 place-items-center rounded-xl bg-[var(--color-primary)] text-white"><Image size={19} /></div><div className="topbar-title"><p className="m-0 text-sm font-bold">{t("appName")}</p><p className="m-0 text-xs text-[var(--color-text-secondary)]">{t("subtitle")}</p></div></div><div className="topbar-actions flex items-center gap-1"><HistoryControls /><button className="rounded-lg p-2 hover:bg-[var(--color-panel)]" onClick={() => setLocale(locale === "ar" ? "en" : "ar")} aria-label={t("language")} title={t("language")}><Languages size={18} /></button><button className="rounded-lg p-2 hover:bg-[var(--color-panel)]" onClick={toggleTheme} aria-label={t("theme")} title={t("theme")}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button><button className="rounded-lg p-2 hover:bg-[var(--color-panel)] md:hidden" onClick={toggleProperties} aria-label={t("propertiesPanel")}><PanelRight size={18} /></button></div></header>;
}

function ToolSidebar({ mobile = false, activeView, onSelect }: { mobile?: boolean; activeView: WorkspaceView; onSelect: (id: string) => void }) {
  const { activeTool, t } = useUiStore();
  return <aside className={`tool-sidebar ${mobile ? "mobile-tool-sidebar" : ""} flex w-20 shrink-0 flex-col items-center gap-2 overflow-y-auto border-e border-[var(--color-border)] bg-[var(--color-surface)] p-3`} aria-label={t("sidebar")}>{tools.map(({ id, label, icon: Icon }) => { const selected = id === "home" ? activeView === "home" : id === "assets" ? activeView === "images" : activeView === "editor" && activeTool === id; return <button key={id} onClick={() => onSelect(id)} className={`flex w-full flex-col items-center gap-1 rounded-xl p-2 text-[10px] ${selected ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-panel)]"}`} aria-pressed={selected}><Icon size={19} /><span>{t(label)}</span></button>; })}</aside>;
}

function ResponsiveNavigation({ activeView, onSelect }: { activeView: WorkspaceView; onSelect: (id: string) => void }) {
  const { sidebarOpen, closeSidebar, t } = useUiStore();
  if (!sidebarOpen) return null;
  return <div className="fixed inset-0 z-30 bg-black/45 md:hidden" onClick={closeSidebar} role="presentation"><div className="h-full w-24 bg-[var(--color-surface)] p-3" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex justify-end"><button onClick={closeSidebar} aria-label={t("close")}><X size={18} /></button></div><ToolSidebar mobile activeView={activeView} onSelect={onSelect} /></div></div>;
}

function UploadCenter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { t } = useUiStore();
  const { asset, status, error, upload } = useAssetStore();
  const selectFile = (file?: File) => { if (file) void upload(file); };
  return <div className="w-full max-w-2xl"><div className={`rounded-3xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10" : "border-[var(--color-border)] bg-[var(--color-surface)]"}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files[0]); }}><div className="mx-auto mb-5 grid size-20 place-items-center rounded-3xl bg-[var(--color-panel)] text-[var(--color-primary)]"><Upload size={34} /></div><h1 className="m-0 text-2xl font-bold">{t("uploadHint")}</h1><p className="mt-3 text-sm text-[var(--color-text-secondary)]">{t("uploadDescription")}</p><input ref={inputRef} aria-label={t("chooseImage")} className="hidden" type="file" accept=".png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff,image/png,image/jpeg,image/webp,image/bmp,image/tiff" onChange={(event) => selectFile(event.target.files?.[0])} /><button className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:brightness-110" onClick={() => inputRef.current?.click()} disabled={status === "loading"}>{status === "loading" ? <Loader2 className="animate-spin" size={17} /> : <Upload size={17} />}{status === "loading" ? t("uploading") : t("chooseImage")}</button>{status === "error" && error ? <p role="alert" className="mt-4 text-sm text-[var(--color-error)]">{error.message}</p> : null}{status === "success" && asset ? <Metadata asset={asset} /> : null}</div></div>;
}

function Metadata({ asset }: { asset: NonNullable<ReturnType<typeof useAssetStore.getState>["asset"]> }) {
  const { t } = useUiStore();
  const metadata = asset.metadata;
  const items = [[t("width"), `${metadata.width}px`], [t("height"), `${metadata.height}px`], [t("format"), metadata.format], [t("fileSize"), `${Math.ceil(metadata.file_size / 1024)} KB`], [t("channels"), String(metadata.channels)], [t("colorMode"), metadata.color_mode]];
  return <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 text-start"><p className="mb-3 text-sm font-semibold text-[var(--color-success)]">{t("uploadSuccess")}</p><p className="mb-3 truncate text-sm font-medium">{asset.filename}</p><dl className="grid grid-cols-2 gap-3 text-xs">{items.map(([label, value]) => <div key={label}><dt className="text-[var(--color-text-secondary)]">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl></div>;
}

function HomeView({ asset, onNavigate }: { asset: NonNullable<ReturnType<typeof useAssetStore.getState>["asset"]> | null; onNavigate: () => void }) {
  const { t } = useUiStore();
  return <section className="grid min-h-[calc(100vh-112px)] place-items-center p-6" aria-label={t("home")}><div className="w-full max-w-2xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center"><div className="mx-auto mb-5 grid size-20 place-items-center rounded-3xl bg-[var(--color-panel)] text-[var(--color-primary)]"><Image size={34} /></div><h1 className="m-0 text-2xl font-bold">{t("home")}</h1><p className="mt-3 text-sm text-[var(--color-text-secondary)]">{t("subtitle")}</p><p className="mt-4 text-sm">{asset ? asset.filename : t("noImage")}</p><button type="button" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:brightness-110" onClick={onNavigate}>{asset ? t("returnToEditor") : t("chooseImage")}</button></div></section>;
}

function ImagesView({ asset, onNavigate }: { asset: NonNullable<ReturnType<typeof useAssetStore.getState>["asset"]> | null; onNavigate: () => void }) {
  const { t } = useUiStore();
  return <section className="grid min-h-[calc(100vh-112px)] place-items-center p-6" aria-label={t("images")}><div className="w-full max-w-3xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8"><div className="flex items-center justify-between gap-3"><h1 className="m-0 text-2xl font-bold">{t("images")}</h1><button type="button" className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold" onClick={onNavigate}>{t("returnToEditor")}</button></div>{asset ? <figure className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4"><img src={contentUrl(asset)} alt={t("originalImage")} className="mx-auto max-h-[55vh] w-full object-contain" /><figcaption className="mt-4 text-center text-sm font-semibold">{asset.filename}</figcaption><p className="mt-2 text-center text-xs text-[var(--color-text-secondary)]">{asset.metadata.width}px × {asset.metadata.height}px · {asset.metadata.format}</p></figure> : <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)] p-10 text-center"><p className="m-0 text-sm text-[var(--color-text-secondary)]">{t("noImage")}</p><button type="button" className="mt-5 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white" onClick={onNavigate}>{t("chooseImage")}</button></div>}</div></section>;
}

function CanvasWorkspace({ view, onNavigate }: { view: WorkspaceView; onNavigate: () => void }) { const { t } = useUiStore(); const { asset } = useAssetStore(); return <main className="canvas-workspace min-h-0 min-w-0 overflow-hidden bg-[var(--color-background)]" aria-label={t("canvasArea")}>{view === "home" ? <HomeView asset={asset} onNavigate={onNavigate} /> : view === "images" ? <ImagesView asset={asset} onNavigate={onNavigate} /> : asset ? <CanvasEditor asset={asset} /> : <div className="grid min-h-[calc(100vh-112px)] place-items-center p-6"><UploadCenter /></div>}</main>; }
function PropertiesPanel() {
  const { activeTool, propertiesOpen, toggleProperties, setActiveTool, t } = useUiStore();
  const selectedTool = tools.find((tool) => tool.id === activeTool);
  const panelTitle = selectedTool?.label ?? ({ transform: "transform", "advanced-text": "advancedText", "background-library": "backgroundLibrary", "image-layers": "imageLayers" } as Partial<Record<string, TranslationKey>>)[activeTool ?? ""];
  if (!propertiesOpen) return null;
  return <aside className="properties-panel flex w-72 shrink-0 flex-col overflow-hidden border-s border-[var(--color-border)] bg-[var(--color-panel)] p-5" aria-label={t("propertiesPanel")}>
    <div className="flex shrink-0 items-center justify-between">
      {activeTool ? null : <h2 className="m-0 text-sm font-bold">{t("properties")}</h2>}
      <button className="rounded-lg p-1 hover:bg-[var(--color-surface)] md:hidden" onClick={toggleProperties} aria-label={t("close")}><X size={17} /></button>
    </div>
    <div className="properties-tool-content mt-5 min-h-0 flex-1 overflow-y-auto">
      {panelTitle ? <div className="mb-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-center text-sm font-semibold text-[var(--color-text-primary)]">{t(panelTitle)}</div> : <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center text-sm text-[var(--color-text-secondary)]">{t("selectTool")}</div>}
      {activeTool === "tools" ? <div className="mb-4 space-y-2">{tools.filter((tool) => !["home", "assets", "tools"].includes(tool.id)).map(({ id, label, icon: Icon }) => <button key={id} type="button" className="flex w-full items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-start text-sm hover:bg-[var(--color-background)]" onClick={() => setActiveTool(id)}><Icon size={16} /><span>{t(label)}</span></button>)}</div> : null}
      <div id="properties-tool-root" className="min-h-0" />
    </div>
  </aside>;
}
  function StatusBar() { return <footer className="shrink-0 flex h-12 items-center justify-end border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-xs text-[var(--color-text-secondary)]" aria-label="status-bar" />; }

export default function App() { const { locale, theme, setActiveTool, closeSidebar } = useUiStore(); const { canUndo, canRedo, undo, redo } = useHistoryStore(); const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("editor"); const selectNavigation = (id: string) => { if (id === "home") { setWorkspaceView("home"); setActiveTool(null); closeSidebar(); return; } if (id === "assets") { setWorkspaceView("images"); setActiveTool(null); closeSidebar(); return; } setWorkspaceView("editor"); setActiveTool(id); closeSidebar(); }; const returnToEditor = () => { setWorkspaceView("editor"); setActiveTool(null); }; useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"; document.documentElement.dataset.theme = theme; }, [locale, theme]); useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { const target = event.target; if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)) return; const modifier = event.ctrlKey || event.metaKey; if (!modifier || event.altKey) return; const key = event.key.toLowerCase(); if (key === "z") { const allowed = event.shiftKey ? canRedo : canUndo; if (!allowed) return; event.preventDefault(); if (event.shiftKey) redo(); else undo(); } else if (key === "y" && canRedo) { event.preventDefault(); redo(); } }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [canRedo, canUndo, redo, undo]); return <div className="app-shell flex h-[100dvh] min-h-[560px] flex-col overflow-hidden bg-[var(--color-background)] text-[var(--color-text-primary)]"><TopBar /><div className="editor-grid grid min-h-0 flex-1 overflow-hidden grid-cols-[80px_minmax(0,1fr)_288px]"><ToolSidebar activeView={workspaceView} onSelect={selectNavigation} /><CanvasWorkspace view={workspaceView} onNavigate={returnToEditor} /><PropertiesPanel /></div><StatusBar /><ResponsiveNavigation activeView={workspaceView} onSelect={selectNavigation} /></div>; }
