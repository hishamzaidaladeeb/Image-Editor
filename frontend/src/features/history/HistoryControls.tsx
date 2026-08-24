import { Redo2, Undo2 } from "lucide-react";
import { useHistoryStore } from "@/stores/historyStore";
import { useUiStore } from "@/stores/uiStore";

export function HistoryControls() {
  const { t } = useUiStore();
  const { canUndo, canRedo, navigating, error, undo, redo } = useHistoryStore();
  return <div className="flex items-center gap-1" aria-label={t("historyControls")}><button className="rounded-lg p-2 hover:bg-[var(--color-panel)] disabled:cursor-not-allowed disabled:opacity-40" onClick={() => void undo()} disabled={!canUndo || navigating} aria-label={t("undo")} title={`${t("undo")} (Ctrl/Cmd+Z)`}><Undo2 size={18} /></button><button className="rounded-lg p-2 hover:bg-[var(--color-panel)] disabled:cursor-not-allowed disabled:opacity-40" onClick={() => void redo()} disabled={!canRedo || navigating} aria-label={t("redo")} title={`${t("redo")} (Ctrl/Cmd+Shift+Z)`}><Redo2 size={18} /></button>{error ? <span role="alert" className="sr-only">{t(error)}</span> : null}</div>;
}
