import { Check, Copy, RotateCcw, X } from "lucide-react";
import { useEffect } from "react";
import { useAssetStore } from "@/stores/assetStore";
import { useCreativeStore, type CreativeParameters } from "@/stores/creativeStore";
import { useUiStore } from "@/stores/uiStore";

const tonalFields: Array<{ key: keyof CreativeParameters; min: number; max: number; step: number; label: "temperature" | "tint" | "shadows" | "highlights" }> = [
  { key: "temperature", min: -100, max: 100, step: 1, label: "temperature" },
  { key: "tint", min: -100, max: 100, step: 1, label: "tint" },
  { key: "shadows", min: -100, max: 100, step: 1, label: "shadows" },
  { key: "highlights", min: -100, max: 100, step: 1, label: "highlights" }
];

export function CreativePanel({ onClose }: { onClose: () => void }) {
  const { asset, setAsset } = useAssetStore();
  const { t } = useUiStore();
  const state = useCreativeStore();
  useEffect(() => { if (asset) state.preview(asset); return () => state.cancel(); }, []);
  if (!asset) return <p className="text-sm text-[var(--color-text-secondary)]">{t("creativeNoImage")}</p>;

  const applyAction = async () => { const nextAsset = await state.apply(asset); if (nextAsset) { setAsset(nextAsset, { tool: "creative", operation: state.operation, parameters: { ...state.parameters, look: state.look, preset: state.preset } }); onClose(); } };
  const resetAction = () => { state.reset(); window.setTimeout(() => state.preview(asset), 0); };
  const sample = state.sample;

  return <div className="space-y-4" aria-label={t("creativePanel")}>
    <div>
      <label className="mb-1 block text-xs font-semibold">{t("creativeOperation")}</label>
      <select aria-label={t("creativeOperation")} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm" value={state.operation} onChange={(event) => state.setOperation(event.target.value as typeof state.operation)}>
        <option value="look">{t("creativeLook")}</option>
        <option value="preset">{t("creativePreset")}</option>
        <option value="auto_enhancement">{t("autoEnhancement")}</option>
        <option value="tonal">{t("tonalAdjustments")}</option>
      </select>
    </div>
    {state.operation === "look" ? <label className="block text-xs"><span className="mb-1 block text-[var(--color-text-secondary)]">{t("creativeLook")}</span><select aria-label={t("creativeLook")} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2" value={state.look} onChange={(event) => state.setLook(event.target.value as typeof state.look)}><option value="vintage">{t("lookVintage")}</option><option value="cinematic">{t("lookCinematic")}</option><option value="warm">{t("lookWarm")}</option><option value="cool">{t("lookCool")}</option><option value="black_white">{t("lookBlackWhite")}</option><option value="dramatic">{t("lookDramatic")}</option></select></label> : null}
    {state.operation === "preset" ? <label className="block text-xs"><span className="mb-1 block text-[var(--color-text-secondary)]">{t("creativePreset")}</span><select aria-label={t("creativePreset")} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2" value={state.preset} onChange={(event) => state.setPreset(event.target.value as typeof state.preset)}><option value="vivid">{t("presetVivid")}</option><option value="soft_portrait">{t("presetSoftPortrait")}</option><option value="crisp_detail">{t("presetCrispDetail")}</option><option value="mono_contrast">{t("presetMonoContrast")}</option></select></label> : null}
    {state.operation === "tonal" ? <div className="space-y-3">{tonalFields.map((field) => <RangeField key={field.key} label={t(field.label)} min={field.min} max={field.max} step={field.step} value={state.parameters[field.key]} onChange={(value) => state.setParameter(field.key, value)} />)}</div> : null}
    {state.operation === "auto_enhancement" ? <p className="rounded-lg bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text-secondary)]">{t("creativeAutoInfo")}</p> : null}
    <div className="border-t border-[var(--color-border)] pt-3"><div className="mb-2 flex items-center justify-between"><p className="m-0 text-xs font-semibold">{t("pixelInspector")}</p><span className="text-[10px] text-[var(--color-text-secondary)]">{t("sampleInstruction")}</span></div><div className="grid grid-cols-3 gap-1">{(["color_picker", "eyedropper", "pixel_inspector"] as const).map((mode) => <button key={mode} type="button" className={`rounded-lg border px-2 py-2 text-[11px] ${state.sampleMode === mode ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10" : "border-[var(--color-border)]"}`} onClick={() => state.setSampleMode(mode)}>{t(mode === "color_picker" ? "colorPicker" : mode === "eyedropper" ? "eyedropper" : "pixelInspector")}</button>)}</div>{sample ? <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs"><div className="col-span-2 flex items-center gap-2"><span className="size-8 rounded border border-[var(--color-border)]" style={{ backgroundColor: sample.hex_color }} /><input aria-label={t("selectedColor")} type="color" value={sample.hex_color} readOnly className="size-8 border-0 bg-transparent p-0" /><span className="font-semibold">{sample.hex_color}</span><button type="button" aria-label={t("selectedColor")} className="ms-auto rounded p-1 hover:bg-[var(--color-panel)]" onClick={() => void navigator.clipboard?.writeText(sample.hex_color)}><Copy size={14} /></button></div><span>{t("sampleX")}: {sample.x}</span><span>{t("sampleY")}: {sample.y}</span><span>R: {sample.red}</span><span>G: {sample.green}</span><span>B: {sample.blue}</span><span>A: {sample.alpha}</span><span className="col-span-2">{t("luminance")}: {sample.luminance}</span></div> : null}</div>
    {(state.status === "previewing" || state.status === "applying") ? <p className="text-sm text-[var(--color-text-secondary)]">{t("creativeProcessing")}</p> : null}
    {state.status === "sampling" ? <p className="text-sm text-[var(--color-text-secondary)]">{t("creativeSampling")}</p> : null}
    {state.operation === "auto_enhancement" && state.appliedParameters ? <p className="text-xs text-[var(--color-success)]">{t("creativeAutoInfo")}</p> : null}
    {state.error ? <p role="alert" className="text-sm text-[var(--color-error)]">{state.error.message}</p> : null}
    <div className="flex gap-2 pt-2"><button className="flex-1 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void applyAction()} disabled={state.status === "applying"}><Check size={15} className="me-1 inline" />{t("apply")}</button><button className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" onClick={() => { state.cancel(); onClose(); }}><X size={15} className="me-1 inline" />{t("cancel")}</button><button className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" onClick={resetAction}><RotateCcw size={15} className="me-1 inline" />{t("reset")}</button></div>
  </div>;
}

function RangeField({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }) {
  return <label className="block text-xs"><span className="mb-1 flex items-center justify-between text-[var(--color-text-secondary)]"><span>{label}</span><input className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-0.5 text-end" type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></span><input className="w-full accent-[var(--color-primary)]" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} /></label>;
}
