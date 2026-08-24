import { Check, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAssetStore } from "@/stores/assetStore";
import { useBlurStore, type BlurAreaParameters } from "@/stores/blurStore";
import { useUiStore } from "@/stores/uiStore";

export function BlurAreaPanel({ onClose, region, onRegionPreview }: { onClose: () => void; region: Region; onRegionPreview: (region: Region) => void }) {
  const { asset, setAsset } = useAssetStore();
  const { t } = useUiStore();
  const state = useBlurStore();
  const [values, setValues] = useState<Region & { kernel_size: number; sigma: number }>({ x: 0, y: 0, width: asset?.metadata.width ?? 100, height: asset?.metadata.height ?? 100, kernel_size: 11, sigma: 3 });

  useEffect(() => {
    if (!asset) return;
    const next = { x: 0, y: 0, width: asset.metadata.width, height: asset.metadata.height, kernel_size: 11, sigma: 3 };
    setValues(next);
    onRegionPreview(next);
  }, [asset?.asset_id]);

  useEffect(() => {
    setValues((current) => ({ ...current, ...region }));
  }, [region.x, region.y, region.width, region.height]);

  useEffect(() => {
    if (asset) state.preview(asset, values);
    return () => state.cancel();
  }, [asset?.asset_id, values.x, values.y, values.width, values.height, values.kernel_size, values.sigma]);

  if (!asset) return null;
  const update = (key: keyof typeof values, raw: string) => {
    const number = Number(raw);
    if (!Number.isFinite(number)) return;
    const next = { ...values, [key]: number };
    if (key === "kernel_size") next.kernel_size = Math.min(101, Math.max(3, Math.round(number) | 1));
    if (key === "sigma") next.sigma = Math.min(50, Math.max(0.1, number));
    if (key === "x") next.x = Math.min(asset.metadata.width - 1, Math.max(0, Math.round(number)));
    if (key === "y") next.y = Math.min(asset.metadata.height - 1, Math.max(0, Math.round(number)));
    if (key === "width") next.width = Math.min(asset.metadata.width - next.x, Math.max(1, Math.round(number)));
    if (key === "height") next.height = Math.min(asset.metadata.height - next.y, Math.max(1, Math.round(number)));
    setValues(next);
    onRegionPreview({ x: next.x, y: next.y, width: next.width, height: next.height });
  };
  const applyAction = async () => {
    const parameters: BlurAreaParameters = { x: values.x, y: values.y, width: values.width, height: values.height, kernel_size: values.kernel_size, sigma: values.sigma };
    const nextAsset = await state.apply(asset, parameters);
    if (nextAsset) {
      setAsset(nextAsset, { tool: "blur", operation: "blur_area", parameters });
      onClose();
    }
  };
  const reset = () => {
    const next = { x: 0, y: 0, width: asset.metadata.width, height: asset.metadata.height, kernel_size: 11, sigma: 3 };
    setValues(next);
    onRegionPreview(next);
    state.reset();
  };
  return <div className="space-y-4" aria-label={t("blurAreaPanel")}><div><p className="text-sm font-semibold">{t("blurAreaTitle")}</p><p className="mt-1 text-xs text-[var(--color-text-secondary)]">{t("blurAreaHint")}</p></div><div className="grid grid-cols-2 gap-2"><Field label={t("x")} value={values.x} onChange={(value) => update("x", value)} /><Field label={t("y")} value={values.y} onChange={(value) => update("y", value)} /><Field label={t("width")} value={values.width} onChange={(value) => update("width", value)} /><Field label={t("height")} value={values.height} onChange={(value) => update("height", value)} /></div><Field label={t("kernelSize")} value={values.kernel_size} min={3} max={101} step={2} onChange={(value) => update("kernel_size", value)} /><label className="block text-xs"><span className="mb-1 block text-[var(--color-text-secondary)]">{t("sigma")}</span><input aria-label={t("sigma")} className="w-full" type="range" min="0.1" max="50" step="0.1" value={values.sigma} onChange={(event) => update("sigma", event.target.value)} /><input aria-label={`${t("sigma")} ${t("value")}`} className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2" type="number" min="0.1" max="50" step="0.1" value={values.sigma} onChange={(event) => update("sigma", event.target.value)} /></label>{state.status === "previewing" || state.status === "applying" ? <p className="text-sm text-[var(--color-text-secondary)]">{t("blurAreaPreview")}</p> : null}{state.error ? <p role="alert" className="text-sm text-[var(--color-error)]">{state.error.message}</p> : null}<div className="flex gap-2 pt-2"><button className="flex-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void applyAction()} disabled={state.status === "applying"}><Check size={15} className="me-1 inline" />{state.status === "applying" ? t("processing") : t("apply")}</button><button className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" onClick={() => { state.cancel(); onClose(); }}><X size={15} className="me-1 inline" />{t("cancel")}</button><button className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" onClick={reset}><RotateCcw size={15} className="me-1 inline" />{t("reset")}</button></div></div>;
}

type Region = { x: number; y: number; width: number; height: number };
function Field({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (value: string) => void }) { return <label className="block text-xs"><span className="mb-1 block text-[var(--color-text-secondary)]">{label}</span><input aria-label={label} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2" type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
