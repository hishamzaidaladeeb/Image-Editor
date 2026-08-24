import { useEffect, useRef, useState } from "react";
import { Download, FileDown, Loader2, X } from "lucide-react";
import { useExportStore } from "@/stores/exportStore";
import type { ExportFormat } from "@/services/export/exportService";
import type { Asset } from "@/types/asset";
import { useUiStore } from "@/stores/uiStore";

export function ExportPanel({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const { t } = useUiStore();
  const initialized = useRef(false);
  const [widthInput, setWidthInput] = useState(String(asset.metadata.width));
  const [heightInput, setHeightInput] = useState(String(asset.metadata.height));
  const format = useExportStore((state) => state.format);
  const quality = useExportStore((state) => state.quality);
  const width = useExportStore((state) => state.width);
  const height = useExportStore((state) => state.height);
  const filename = useExportStore((state) => state.filename);
  const preserveTransparency = useExportStore((state) => state.preserveTransparency);
  const status = useExportStore((state) => state.status);
  const error = useExportStore((state) => state.error);
  const previewResult = useExportStore((state) => state.previewResult);
  const result = useExportStore((state) => state.result);
  const reset = useExportStore((state) => state.reset);
  const preview = useExportStore((state) => state.preview);
  const apply = useExportStore((state) => state.apply);
  const cancel = useExportStore((state) => state.cancel);

  useEffect(() => {
    reset(asset);
    setWidthInput(String(asset.metadata.width));
    setHeightInput(String(asset.metadata.height));
    initialized.current = true;
    useExportStore.getState().preview(asset);
    return () => { useExportStore.getState().cancel(); initialized.current = false; };
  }, [asset.asset_id, reset]);

  useEffect(() => {
    if (initialized.current) preview(asset);
  }, [asset.asset_id, format, quality, width, height, filename, preserveTransparency, preview]);

  const filenameValid = /^[A-Za-z0-9_-]+$/.test(filename);
  const widthInputValid = isValidDimension(widthInput);
  const heightInputValid = isValidDimension(heightInput);
  const resolutionValid = widthInputValid && heightInputValid;
  const canApply = filenameValid && resolutionValid && status !== "previewing" && status !== "exporting";
  const shownResult = previewResult ?? result;
  const handleApply = async () => { await apply(asset); };
  const handleDownload = () => { if (!shownResult) return; const link = document.createElement("a"); link.href = shownResult.download_url; link.download = shownResult.filename; document.body.appendChild(link); link.click(); link.remove(); };

  return <div className="max-h-[calc(100vh-150px)] overflow-y-auto" aria-label={t("exportPanel")}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><FileDown size={18} className="text-[var(--color-primary)]" /><h2 className="m-0 text-base font-bold">{t("export")}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--color-surface)]" aria-label={t("close")}><X size={16} /></button></div><div className="mt-4 space-y-4"><FieldLabel label={t("exportFormat")}><select value={format} onChange={(event) => useExportStore.getState().setFormat(event.target.value as ExportFormat)} className="control-input"><option value="png">PNG</option><option value="jpg">JPG / JPEG</option><option value="webp">WEBP</option></select></FieldLabel><FieldLabel label={`${t("exportQuality")} (${quality}%)`}><div className="flex items-center gap-2"><input aria-label={t("exportQuality")} type="range" min="1" max="100" value={quality} onChange={(event) => useExportStore.getState().setQuality(Number(event.target.value))} className="w-full" /><input aria-label={t("exportQuality")} type="number" min="1" max="100" value={quality} onChange={(event) => useExportStore.getState().setQuality(Number(event.target.value))} className="control-input w-20" /></div></FieldLabel><div><p className="mb-2 text-xs font-semibold">{t("exportResolution")}</p><div className="grid grid-cols-2 gap-2"><FieldLabel label={t("exportWidth")}><input aria-label={t("exportWidth")} type="number" min="1" max="12000" value={widthInput} onChange={(event) => { const value = event.target.value; setWidthInput(value); if (isValidDimension(value)) useExportStore.getState().setWidth(Number(value)); }} className={`control-input ${widthInput && !widthInputValid ? "border-[var(--color-error)]" : ""}`} /></FieldLabel><FieldLabel label={t("exportHeight")}><input aria-label={t("exportHeight")} type="number" min="1" max="12000" value={heightInput} onChange={(event) => { const value = event.target.value; setHeightInput(value); if (isValidDimension(value)) useExportStore.getState().setHeight(Number(value)); }} className={`control-input ${heightInput && !heightInputValid ? "border-[var(--color-error)]" : ""}`} /></FieldLabel></div>{!resolutionValid ? <p role="alert" className="mt-2 text-[11px] text-[var(--color-error)]">{t("exportInvalidResolution")}</p> : null}<p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{t("exportOriginalDimensions")}: {asset.metadata.width} × {asset.metadata.height}px</p></div><FieldLabel label={t("exportFilename")}><input aria-label={t("exportFilename")} type="text" value={filename} onChange={(event) => useExportStore.getState().setFilename(event.target.value)} className={`control-input ${filename && !filenameValid ? "border-[var(--color-error)]" : ""}`} inputMode="text" autoComplete="off" /><p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{t("exportFilenameHint")}</p></FieldLabel><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={preserveTransparency} onChange={(event) => useExportStore.getState().setPreserveTransparency(event.target.checked)} disabled={format === "jpg"} />{t("preserveTransparency")}</label></div>{error ? <p role="alert" className="mt-3 text-xs text-[var(--color-error)]">{error.message}</p> : null}{status === "previewing" || status === "exporting" ? <p className="mt-3 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]"><Loader2 size={14} className="animate-spin" />{status === "exporting" ? t("exportProcessing") : t("exportPreview")}</p> : null}{shownResult ? <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"><img src={shownResult.preview_url} alt={t("exportPreviewAlt")} className="max-h-40 w-full rounded-lg object-contain" /><p className="mt-2 text-xs font-semibold text-[var(--color-success)]">{t("exportReady")}</p><dl className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[var(--color-text-secondary)]"><div><dt>{t("exportResolution")}</dt><dd className="font-semibold text-[var(--color-text-primary)]">{shownResult.width} × {shownResult.height}px</dd></div><div><dt>{t("exportFileSize")}</dt><dd className="font-semibold text-[var(--color-text-primary)]">{Math.max(1, Math.ceil(shownResult.file_size / 1024))} KB</dd></div><div><dt>{t("exportColorMode")}</dt><dd className="font-semibold text-[var(--color-text-primary)]">{shownResult.color_mode}</dd></div><div><dt>{t("exportTransparency")}</dt><dd className="font-semibold text-[var(--color-text-primary)]">{shownResult.has_transparency ? t("exportTransparent") : t("exportOpaque")}</dd></div></dl></div> : null}<div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={handleApply} disabled={!canApply} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><FileDown size={14} />{t("apply")}</button><button type="button" onClick={handleDownload} disabled={!result} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"><Download size={14} />{t("exportDownload")}</button><button type="button" onClick={() => { cancel(); onClose(); }} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--color-surface)]">{t("cancel")}</button><button type="button" onClick={() => { reset(asset); setWidthInput(String(asset.metadata.width)); setHeightInput(String(asset.metadata.height)); }} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--color-surface)]">{t("reset")}</button></div></div>;
}

function isValidDimension(value: string): boolean {
  if (!/^\d+$/.test(value)) return false;
  const dimension = Number(value);
  return dimension >= 1 && dimension <= 12000;
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold"><span className="mb-1 block">{label}</span>{children}</label>;
}
