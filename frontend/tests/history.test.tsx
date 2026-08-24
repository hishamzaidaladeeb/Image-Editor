import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryControls } from "@/features/history/HistoryControls";
import { useHistoryStore } from "@/stores/historyStore";
import { useAssetStore } from "@/stores/assetStore";
import { useUiStore } from "@/stores/uiStore";
import type { Asset } from "@/types/asset";

const asset = (asset_id: string): Asset => ({ asset_id, filename: `${asset_id}.png`, content_url: `/api/v1/assets/${asset_id}/content`, metadata: { width: 8, height: 6, format: "PNG", file_size: 100, channels: 4, color_mode: "RGBA", color_space: null, has_transparency: true } });
const commit = (operation: string) => ({ tool: "pixel" as const, operation, parameters: { brightness: 12 } });

beforeEach(() => {
  useHistoryStore.setState({ past: [], future: [], currentAssetId: null, canUndo: false, canRedo: false });
  useUiStore.setState({ locale: "en", theme: "dark", sidebarOpen: false, propertiesOpen: true, activeTool: null });
});

test("handles empty history and boundaries", async () => {
  const applied: Asset[] = [];
  const unregister = useHistoryStore.getState().registerAssetApplier((nextAsset) => applied.push(nextAsset));
  await expect(useHistoryStore.getState().undo()).resolves.toBe(false);
  await expect(useHistoryStore.getState().redo()).resolves.toBe(false);
  useHistoryStore.getState().recordCommit(commit("brightness"), asset("source"), asset("one"));
  await expect(useHistoryStore.getState().undo()).resolves.toBe(true);
  expect(applied.at(-1)?.asset_id).toBe("source");
  await expect(useHistoryStore.getState().undo()).resolves.toBe(false);
  await expect(useHistoryStore.getState().redo()).resolves.toBe(true);
  expect(applied.at(-1)?.asset_id).toBe("one");
  await expect(useHistoryStore.getState().redo()).resolves.toBe(false);
  unregister();
});

test("supports apply undo redo and clears the redo branch", async () => {
  const applied: Asset[] = [];
  const unregister = useHistoryStore.getState().registerAssetApplier((nextAsset) => applied.push(nextAsset));
  useHistoryStore.getState().recordCommit(commit("first"), asset("source"), asset("a"));
  useHistoryStore.getState().recordCommit(commit("second"), asset("a"), asset("b"));
  expect(useHistoryStore.getState().past).toHaveLength(2);
  await expect(useHistoryStore.getState().undo()).resolves.toBe(true);
  expect(useHistoryStore.getState().future).toHaveLength(1);
  useHistoryStore.getState().recordCommit(commit("third"), asset("a"), asset("c"));
  expect(useHistoryStore.getState().future).toHaveLength(0);
  expect(useHistoryStore.getState().past.map((entry) => entry.nextAsset.asset_id)).toEqual(["a", "c"]);
  expect(useHistoryStore.getState().past[1].parameters).toEqual({ brightness: 12 });
  expect(applied.at(-1)?.asset_id).toBe("a");
  unregister();
});

test("keeps at most 50 entries using FIFO", () => {
  const unregister = useHistoryStore.getState().registerAssetApplier(() => undefined);
  let previous = asset("source");
  for (let index = 1; index <= 51; index += 1) {
    const next = asset(`asset-${index}`);
    useHistoryStore.getState().recordCommit(commit(`operation-${index}`), previous, next);
    previous = next;
  }
  const state = useHistoryStore.getState();
  expect(state.past).toHaveLength(50);
  expect(state.past[0].nextAsset.asset_id).toBe("asset-2");
  expect(state.past.at(-1)?.nextAsset.asset_id).toBe("asset-51");
  unregister();
});

test("runs cleanup before navigation and exposes accessible controls", async () => {
  let cleanupCount = 0;
  const unregisterCleanup = useHistoryStore.getState().registerBeforeNavigation(() => { cleanupCount += 1; });
  const unregisterApplier = useHistoryStore.getState().registerAssetApplier(() => undefined);
  useHistoryStore.getState().recordCommit(commit("brightness"), asset("source"), asset("one"));
  render(<HistoryControls />);
  expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
  await userEvent.setup().click(screen.getByRole("button", { name: "Undo" }));
  expect(cleanupCount).toBe(1);
  expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
  unregisterCleanup();
  unregisterApplier();
});

test("keeps the current asset and history when a revision is unavailable", async () => {
  const unregisterApplier = useHistoryStore.getState().registerAssetApplier(() => undefined);
  const unregisterValidator = useHistoryStore.getState().registerAssetValidator(async () => false);
  useHistoryStore.getState().recordCommit(commit("brightness"), asset("source"), asset("one"));
  await expect(useHistoryStore.getState().undo()).resolves.toBe(false);
  expect(useHistoryStore.getState().past).toHaveLength(1);
  expect(useHistoryStore.getState().currentAssetId).toBe("one");
  expect(useHistoryStore.getState().error).toBe("historyRevisionUnavailable");
  unregisterValidator();
  unregisterApplier();
});

test("rejects rapid navigation while a revision is being validated", async () => {
  let resolveValidation: ((value: boolean) => void) | undefined;
  const validation = new Promise<boolean>((resolve) => { resolveValidation = resolve; });
  const unregisterApplier = useHistoryStore.getState().registerAssetApplier(() => undefined);
  const unregisterValidator = useHistoryStore.getState().registerAssetValidator(async () => validation);
  useHistoryStore.getState().recordCommit(commit("brightness"), asset("source"), asset("one"));
  const first = useHistoryStore.getState().undo();
  await expect(useHistoryStore.getState().redo()).resolves.toBe(false);
  resolveValidation?.(true);
  await expect(first).resolves.toBe(true);
  expect(useHistoryStore.getState().currentAssetId).toBe("source");
  unregisterValidator();
  unregisterApplier();
});

test("records Apply through Asset Store and restores the current asset", async () => {
  const source = asset("source");
  const next = asset("next");
  useAssetStore.setState({ asset: source, status: "success", error: null });
  useHistoryStore.getState().setCurrentAsset(source);
  const unregister = useHistoryStore.getState().registerAssetApplier((value) => useAssetStore.getState().setAsset(value));
  useAssetStore.getState().setAsset(next, commit("brightness"));
  expect(useHistoryStore.getState().past).toHaveLength(1);
  await expect(useHistoryStore.getState().undo()).resolves.toBe(true);
  expect(useAssetStore.getState().asset?.asset_id).toBe("source");
  await expect(useHistoryStore.getState().redo()).resolves.toBe(true);
  expect(useAssetStore.getState().asset?.asset_id).toBe("next");
  unregister();
});
