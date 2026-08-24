import { Check, RotateCcw, X } from "lucide-react";
import { useEffect } from "react";
import { useAssetStore } from "@/stores/assetStore";
import { useFilterStore } from "@/stores/filterStore";
import { useUiStore } from "@/stores/uiStore";
import type { FilterOperation, FilterParameters } from "@/services/filter/filterService";

const filterLabels: Record<FilterOperation, string> = { average_blur: "averageBlur", gaussian_blur: "gaussianBlur", median_blur: "medianBlur", bilateral: "bilateral", laplacian: "laplacian", unsharp_mask: "unsharpMask", sharpen_kernel: "sharpenKernel", sobel: "sobel", scharr: "scharr", canny: "canny", erosion: "erosion", dilation: "dilation", opening: "opening", closing: "closing", morphological_gradient: "morphologicalGradient" };
const numericFields: Record<string, Array<{ key: keyof FilterParameters; min: number; max: number; step: number; label: string }>> = {
  average_blur: [{ key: "kernel_size", min: 1, max: 31, step: 2, label: "kernelSize" }],
  gaussian_blur: [{ key: "kernel_size", min: 1, max: 31, step: 2, label: "kernelSize" }, { key: "sigma", min: 0.1, max: 50, step: 0.1, label: "sigma" }],
  median_blur: [{ key: "kernel_size", min: 1, max: 31, step: 2, label: "kernelSize" }],
  bilateral: [{ key: "diameter", min: 1, max: 31, step: 2, label: "diameter" }, { key: "sigma_color", min: 0.1, max: 500, step: 1, label: "sigmaColor" }, { key: "sigma_space", min: 0.1, max: 500, step: 1, label: "sigmaSpace" }],
  laplacian: [{ key: "kernel_size", min: 1, max: 31, step: 2, label: "kernelSize" }],
  unsharp_mask: [{ key: "kernel_size", min: 1, max: 31, step: 2, label: "kernelSize" }, { key: "sigma", min: 0.1, max: 50, step: 0.1, label: "sigma" }, { key: "amount", min: 0, max: 5, step: 0.1, label: "amount" }],
  sharpen_kernel: [{ key: "amount", min: 0, max: 5, step: 0.1, label: "amount" }],
  sobel: [{ key: "kernel_size", min: 1, max: 31, step: 2, label: "kernelSize" }],
  scharr: [],
  canny: [{ key: "low_threshold", min: 0, max: 255, step: 1, label: "lowThreshold" }, { key: "high_threshold", min: 1, max: 255, step: 1, label: "highThreshold" }, { key: "aperture_size", min: 3, max: 7, step: 2, label: "apertureSize" }],
  erosion: [{ key: "kernel_size", min: 1, max: 31, step: 2, label: "kernelSize" }, { key: "iterations", min: 1, max: 10, step: 1, label: "iterations" }],
  dilation: [{ key: "kernel_size", min: 1, max: 31, step: 2, label: "kernelSize" }, { key: "iterations", min: 1, max: 10, step: 1, label: "iterations" }],
  opening: [{ key: "kernel_size", min: 1, max: 31, step: 2, label: "kernelSize" }, { key: "iterations", min: 1, max: 10, step: 1, label: "iterations" }],
  closing: [{ key: "kernel_size", min: 1, max: 31, step: 2, label: "kernelSize" }, { key: "iterations", min: 1, max: 10, step: 1, label: "iterations" }],
  morphological_gradient: [{ key: "kernel_size", min: 1, max: 31, step: 2, label: "kernelSize" }, { key: "iterations", min: 1, max: 10, step: 1, label: "iterations" }]
};

export function FilterPanel({ onClose }: { onClose: () => void }) {
  const { asset, setAsset } = useAssetStore();
  const { t } = useUiStore();
  const state = useFilterStore();
  useEffect(() => { if (asset) state.preview(asset); return () => state.cancel(); }, []);
  if (!asset) return null;
  const setNumber = (key: keyof FilterParameters, value: string) => state.setParameter(key, Number(value) as never);
  const applyAction = async () => { const nextAsset = await state.apply(asset); if (nextAsset) { setAsset(nextAsset, { tool: "filter", operation: state.operation, parameters: { ...state.parameters } }); onClose(); } };
  const resetAction = () => { state.reset(); window.setTimeout(() => state.preview(asset), 0); };
  const currentFields = numericFields[state.operation] ?? [];
  return <div className="space-y-4" aria-label={t("filterPanel")}>
    <div>
      <label className="mb-1 block text-xs font-semibold">{t("filterOperation")}</label>
      <select aria-label={t("filterOperation")} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm" value={state.operation} onChange={(event) => state.setOperation(event.target.value as FilterOperation)}>{Object.entries(filterLabels).map(([value, label]) => <option key={value} value={value}>{t(label as never)}</option>)}</select>
    </div>
    {currentFields.map((field) => <RangeField key={field.key} label={t(field.label as never)} min={field.min} max={field.max} step={field.step} value={Number(state.parameters[field.key])} onChange={(value) => setNumber(field.key, value)} />)}
    {(["sobel", "scharr"].includes(state.operation)) ? <SelectField label={t("axis")} value={state.parameters.axis} options={[["x", "X"], ["y", "Y"], ["both", "Both"]]} onChange={(value) => state.setParameter("axis", value as FilterParameters["axis"])} /> : null}
    {state.operation === "canny" ? <ToggleField label={t("l2Gradient")} value={state.parameters.l2_gradient} onChange={(value) => state.setParameter("l2_gradient", value)} /> : null}
    {["erosion", "dilation", "opening", "closing", "morphological_gradient"].includes(state.operation) ? <SelectField label={t("shape")} value={state.parameters.shape} options={[["rect", t("rect")], ["ellipse", t("ellipse")], ["cross", t("cross")]]} onChange={(value) => state.setParameter("shape", value as FilterParameters["shape"])} /> : null}
    {(state.status === "previewing" || state.status === "applying") ? <p className="text-sm text-[var(--color-text-secondary)]">{t("filterProcessing")}</p> : null}
    {state.error ? <p role="alert" className="text-sm text-[var(--color-error)]">{state.error.message}</p> : null}
    <div className="flex gap-2 pt-2"><button className="flex-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void applyAction()} disabled={state.status === "applying"}><Check size={15} className="me-1 inline" />{state.status === "applying" ? t("filterProcessing") : t("apply")}</button><button className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" onClick={() => { state.cancel(); onClose(); }}><X size={15} className="me-1 inline" />{t("cancel")}</button><button className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" onClick={resetAction}><RotateCcw size={15} className="me-1 inline" />{t("reset")}</button></div>
  </div>;
}

function RangeField({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (value: string) => void }) { return <label className="block text-xs"><span className="mb-1 flex items-center justify-between text-[var(--color-text-secondary)]"><span>{label}</span><input className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-0.5 text-end" type="number" aria-label={`${label} value`} min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} /></span><input className="w-full accent-[var(--color-primary)]" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) { return <label className="block text-xs"><span className="mb-1 block text-[var(--color-text-secondary)]">{label}</span><select aria-label={label} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></label>; }
function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]"><span>{label}</span><input aria-label={label} type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /></label>; }
