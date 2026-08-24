import { Check, RotateCcw, X } from "lucide-react";
import { useEffect } from "react";
import { useAssetStore } from "@/stores/assetStore";
import { usePixelStore, type PixelParameters } from "@/stores/pixelStore";
import { useUiStore } from "@/stores/uiStore";

const adjustmentFields: Array<{ key: keyof PixelParameters; min: number; max: number; step: number; label: string }> = [
  { key: "brightness", min: -255, max: 255, step: 1, label: "brightness" },
  { key: "contrast", min: 0, max: 4, step: 0.1, label: "contrast" },
  { key: "gamma", min: 0.1, max: 5, step: 0.1, label: "gamma" },
  { key: "saturation", min: 0, max: 4, step: 0.1, label: "saturation" },
  { key: "hue", min: -180, max: 180, step: 1, label: "hue" },
  { key: "exposure", min: -4, max: 4, step: 0.1, label: "exposure" },
  { key: "sharpness", min: 0, max: 4, step: 0.1, label: "sharpness" }
];

export function PixelPanel({ onClose }: { onClose: () => void }) {
  const { asset, setAsset } = useAssetStore();
  const { t } = useUiStore();
  const { operation, parameters, status, error, setOperation, setParameter, preview, apply, cancel, reset } = usePixelStore();

  useEffect(() => { if (asset) preview(asset); return () => cancel(); }, []);
  if (!asset) return null;

  const setNumber = (key: keyof PixelParameters, value: string) => setParameter(key, Number(value) as never);
  const applyAction = async () => { const nextAsset = await apply(asset); if (nextAsset) { setAsset(nextAsset, { tool: "pixel", operation, parameters: { ...parameters } }); onClose(); } };
  const resetAction = () => { reset(); if (asset) window.setTimeout(() => preview(asset), 0); };

  return <div className="space-y-4" aria-label={t("pixelPanel")}>
    <div>
      <label className="mb-1 block text-xs font-semibold">{t("pixelOperation")}</label>
      <select aria-label={t("pixelOperation")} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm" value={operation} onChange={(event) => setOperation(event.target.value as typeof operation)}>
        <option value="adjust">{t("adjust")}</option>
        <option value="invert">{t("invert")}</option>
        <option value="grayscale">{t("grayscale")}</option>
        <option value="threshold">{t("threshold")}</option>
      </select>
    </div>
    {operation === "adjust" ? <div className="space-y-3">{adjustmentFields.map((field) => <RangeField key={field.key} label={t(field.label as never)} min={field.min} max={field.max} step={field.step} value={Number(parameters[field.key])} onChange={(value) => setNumber(field.key, value)} />)}</div> : null}
    {operation === "threshold" ? <div className="space-y-3"><label className="block text-xs"><span className="mb-1 block text-[var(--color-text-secondary)]">{t("thresholdMode")}</span><select aria-label={t("thresholdMode")} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2" value={parameters.threshold_mode} onChange={(event) => setParameter("threshold_mode", event.target.value as PixelParameters["threshold_mode"])}><option value="global">{t("globalThreshold")}</option><option value="binary">{t("binaryThreshold")}</option><option value="adaptive">{t("adaptiveThreshold")}</option></select></label><RangeField label={t("threshold")} min={0} max={255} step={1} value={parameters.threshold} onChange={(value) => setNumber("threshold", value)} /><RangeField label={t("maxValue")} min={0} max={255} step={1} value={parameters.max_value} onChange={(value) => setNumber("max_value", value)} />{parameters.threshold_mode === "adaptive" ? <><RangeField label={t("blockSize")} min={3} max={99} step={2} value={parameters.block_size} onChange={(value) => setNumber("block_size", value)} /><RangeField label={t("adaptiveC")} min={-128} max={128} step={1} value={parameters.adaptive_c} onChange={(value) => setNumber("adaptive_c", value)} /></> : null}</div> : null}
    {(status === "previewing" || status === "applying") ? <p className="text-sm text-[var(--color-text-secondary)]">{t("pixelProcessing")}</p> : null}
    {error ? <p role="alert" className="text-sm text-[var(--color-error)]">{error.message}</p> : null}
    <div className="flex gap-2 pt-2"><button className="flex-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void applyAction()} disabled={status === "applying"}><Check size={15} className="me-1 inline" />{status === "applying" ? t("pixelProcessing") : t("apply")} </button><button className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" onClick={() => { cancel(); onClose(); }}><X size={15} className="me-1 inline" />{t("cancel")}</button><button className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" onClick={resetAction}><RotateCcw size={15} className="me-1 inline" />{t("reset")}</button></div>
  </div>;
}

function RangeField({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (value: string) => void }) {
  return <label className="block text-xs"><span className="mb-1 flex items-center justify-between text-[var(--color-text-secondary)]"><span>{label}</span><input className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-0.5 text-end" type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} /></span><input className="w-full accent-[var(--color-primary)]" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} /></label>;
}
