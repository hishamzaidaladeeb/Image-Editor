import { create } from "zustand";
import type { Asset } from "@/types/asset";
import { HISTORY_LIMIT, type HistoryCommit, type HistoryEntry } from "@/types/history";

type AssetApplier = (asset: Asset) => void;
type AssetValidator = (asset: Asset) => Promise<boolean>;
type HistoryError = "historyRevisionUnavailable" | null;

type HistoryState = {
  past: HistoryEntry[];
  future: HistoryEntry[];
  currentAssetId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  navigating: boolean;
  error: HistoryError;
  recordCommit: (commit: HistoryCommit, previousAsset: Asset, nextAsset: Asset) => void;
  setCurrentAsset: (asset: Asset | null) => void;
  registerAssetApplier: (applier: AssetApplier) => () => void;
  registerAssetValidator: (validator: AssetValidator) => () => void;
  registerBeforeNavigation: (callback: () => void) => () => void;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  clear: () => void;
};

let entrySequence = 0;
let assetApplier: AssetApplier | null = null;
let assetValidator: AssetValidator | null = null;
let beforeNavigation: (() => void) | null = null;

const flags = (past: HistoryEntry[], future: HistoryEntry[]) => ({ canUndo: past.length > 0, canRedo: future.length > 0 });

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  currentAssetId: null,
  canUndo: false,
  canRedo: false,
  navigating: false,
  error: null,
  recordCommit: (commit, previousAsset, nextAsset) => {
    if (previousAsset.asset_id === nextAsset.asset_id) return;
    const currentAssetId = get().currentAssetId;
    if (currentAssetId && currentAssetId !== previousAsset.asset_id) return;
    const entry: HistoryEntry = { ...commit, id: `history-${++entrySequence}`, previousAsset, nextAsset, createdAt: Date.now() };
    set((state) => {
      const past = [...state.past, entry].slice(-HISTORY_LIMIT);
      const future: HistoryEntry[] = [];
      return { past, future, currentAssetId: nextAsset.asset_id, error: null, ...flags(past, future) };
    });
  },
  setCurrentAsset: (asset) => set((state) => ({ currentAssetId: asset?.asset_id ?? null, error: null, ...flags(state.past, state.future) })),
  registerAssetApplier: (applier) => { assetApplier = applier; return () => { if (assetApplier === applier) assetApplier = null; }; },
  registerAssetValidator: (validator) => { assetValidator = validator; return () => { if (assetValidator === validator) assetValidator = null; }; },
  registerBeforeNavigation: (callback) => { beforeNavigation = callback; return () => { if (beforeNavigation === callback) beforeNavigation = null; }; },
  undo: async () => {
    if (get().navigating) return false;
    const entry = get().past.at(-1);
    if (!entry || !assetApplier) return false;
    beforeNavigation?.();
    set({ navigating: true, error: null });
    try {
      if (assetValidator && !(await assetValidator(entry.previousAsset))) {
        set({ error: "historyRevisionUnavailable" });
        return false;
      }
      const state = get();
      const past = state.past.slice(0, -1);
      const future = [entry, ...state.future];
      set({ past, future, currentAssetId: entry.previousAsset.asset_id, error: null, ...flags(past, future) });
      assetApplier(entry.previousAsset);
      return true;
    } finally {
      set({ navigating: false });
    }
  },
  redo: async () => {
    if (get().navigating) return false;
    const entry = get().future[0];
    if (!entry || !assetApplier) return false;
    beforeNavigation?.();
    set({ navigating: true, error: null });
    try {
      if (assetValidator && !(await assetValidator(entry.nextAsset))) {
        set({ error: "historyRevisionUnavailable" });
        return false;
      }
      const state = get();
      const past = [...state.past, entry].slice(-HISTORY_LIMIT);
      const future = state.future.slice(1);
      set({ past, future, currentAssetId: entry.nextAsset.asset_id, error: null, ...flags(past, future) });
      assetApplier(entry.nextAsset);
      return true;
    } finally {
      set({ navigating: false });
    }
  },
  clear: () => set({ past: [], future: [], currentAssetId: null, navigating: false, error: null, canUndo: false, canRedo: false })
}));
