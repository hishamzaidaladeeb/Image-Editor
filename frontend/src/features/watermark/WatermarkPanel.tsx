import { Check, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAssetStore } from "@/stores/assetStore";
import { useUiStore } from "@/stores/uiStore";
import { useWatermarkStore } from "@/stores/watermarkStore";
import type { WatermarkAlign, WatermarkFont, WatermarkVerticalAlign } from "@/services/watermark/watermarkService";

const defaults = { text: "Watermark", x: 24, y: 24, font_family: "dejavu_sans" as WatermarkFont, font_size: 32, color: "#ffffff", opacity: 60, rotation: 0, horizontal_alignment: "left" as WatermarkAlign, vertical_alignment: "top" as WatermarkVerticalAlign };

export function WatermarkPanel({ onClose }: { onClose: () => void }) {
  const { asset, setAsset } = useAssetStore();
  const { t } = useUiStore();
  const state = useWatermarkStore();
  const [parameters, setParameters] = useState({ ...defaults });
  useEffect(() => () => { useWatermarkStore.getState().cancel(); }, []);
  useEffect(() => { if (asset) useWatermarkStore.getState().preview(asset, parameters); }, [asset?.asset_id, parameters]);
  if (!asset) return null;
  const update = <K extends keyof typeof parameters>(key: K, value: (typeof parameters)[K]) => setParameters((current) => ({ ...current, [key]: value }));
  const applyAction = async () => { const nextAsset = await state.apply(asset, parameters); if (nextAsset) { setAsset(nextAsset, { tool: "watermark", operation: "text", parameters: { ...parameters } }); onClose(); } };
  const resetAction = () => { state.reset(); setParameters({ ...defaults, x: Math.min(defaults.x, Math.max(0, asset.metadata.width - 1)), y: Math.min(defaults.y, Math.max(0, asset.metadata.height - 1)) }); };
  const clampX = (value: string) => update("x", Math.max(0, Math.min(asset.metadata.width - 1, Number(value) || 0)));
  const clampY = (value: string) => update("y", Math.max(0, Math.min(asset.metadata.height - 1, Number(value) || 0)));
  return <div className="space-y-3" aria-label={t("watermarkPanel")} dir="auto">
    <label className="block text-xs"><span className="mb-1 block text-[var(--color-text-secondary)]">{t("watermarkText")}</span><textarea className="min-h-16 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm" maxLength={256} value={parameters.text} onChange={(event) => update("text", event.target.value)} /></label>
    <div className="grid grid-cols-2 gap-2"><NumberField label="X" value={parameters.x} min={0} max={Math.max(0, asset.metadata.width - 1)} step={1} onChange={clampX} /><NumberField label="Y" value={parameters.y} min={0} max={Math.max(0, asset.metadata.height - 1)} step={1} onChange={clampY} /></div>
    <label className="block text-xs"><span className="mb-1 block text-[var(--color-text-secondary)]">{t("watermarkFont")}</span><select className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2" value={parameters.font_family} onChange={(event) => update("font_family", event.target.value as WatermarkFont)}><option value="dejavu_sans">DejaVu Sans</option><option value="dejavu_sans_bold">DejaVu Sans Bold</option><option value="liberation_sans">Liberation Sans</option><option value="liberation_sans_bold">Liberation Sans Bold</option></select></label>
    <div className="grid grid-cols-2 gap-2"><NumberField label={t("fontSize")} value={parameters.font_size} min={8} max={512} step={1} onChange={(value) => update("font_size", Math.max(8, Math.min(512, Number(value) || 8)))} /><label className="block text-xs"><span className="mb-1 block text-[var(--color-text-secondary)]">{t("watermarkColor")}</span><input className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1" type="color" value={parameters.color} onChange={(event) => update("color", event.target.value)} /></label></div>
    <RangeField label={t("opacity")} value={parameters.opacity} min={0} max={100} step={1} onChange={(value) => update("opacity", Number(value))} />
    <RangeField label={t("rotation")} value={parameters.rotation} min={-180} max={180} step={1} onChange={(value) => update("rotation", Number(value))} />
    <div className="grid grid-cols-2 gap-2"><SelectField label={t("horizontalAlignment")} value={parameters.horizontal_alignment} options={[["left", t("alignLeft")], ["center", t("alignCenter")], ["right", t("alignRight")]]} onChange={(value) => update("horizontal_alignment", value as WatermarkAlign)} /><SelectField label={t("verticalAlignment")} value={parameters.vertical_alignment} options={[["top", t("alignTop")], ["middle", t("alignMiddle")], ["bottom", t("alignBottom")]]} onChange={(value) => update("vertical_alignment", value as WatermarkVerticalAlign)} /></div>
    {(state.status === "previewing" || state.status === "applying") ? <p className="text-sm text-[var(--color-text-secondary)]">{t("watermarkProcessing")}</p> : null}
    {state.error ? <p role="alert" className="text-sm text-[var(--color-error)]">{state.error.message}</p> : null}
    <div className="flex gap-2 pt-2"><button className="flex-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void applyAction()} disabled={state.status === "applying" || !parameters.text.trim()}><Check size={15} className="me-1 inline" />{state.status === "applying" ? t("watermarkProcessing") : t("apply")}</button><button className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" onClick={() => { state.cancel(); onClose(); }}><X size={15} className="me-1 inline" />{t("cancel")}</button><button className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" onClick={resetAction}><RotateCcw size={15} className="me-1 inline" />{t("reset")}</button></div>
  </div>;
}

function NumberField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: string) => void }) { return <label className="block text-xs"><span className="mb-1 block text-[var(--color-text-secondary)]">{label}</span><input className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2" type="number" aria-label={`${label} value`} min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function RangeField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: string) => void }) { return <label className="block text-xs"><span className="mb-1 flex items-center justify-between text-[var(--color-text-secondary)]"><span>{label}</span><output>{value}</output></span><input className="w-full accent-[var(--color-primary)]" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) { return <label className="block text-xs"><span className="mb-1 block text-[var(--color-text-secondary)]">{label}</span><select className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></label>; }
