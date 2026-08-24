import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TextPanel, type TextObjectState } from "@/features/text/TextPanel";
import { useTextStore } from "@/stores/textStore";
import { useAssetStore } from "@/stores/assetStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useUiStore } from "@/stores/uiStore";
import { applyText, deleteTextPreview } from "@/services/text/textService";
import type { Asset } from "@/types/asset";

vi.mock("@/services/text/textService", async () => {
  const actual = await vi.importActual<typeof import("@/services/text/textService")>("@/services/text/textService");
  return { ...actual, applyText: vi.fn(), deleteTextPreview: vi.fn() };
});

const asset: Asset = { asset_id: "asset-1", filename: "sample.png", content_url: "/sample.png", metadata: { width: 160, height: 100, format: "PNG", file_size: 100, channels: 4, color_mode: "RGBA", color_space: "sRGB", has_transparency: true } };
const preview: Asset = { ...asset, asset_id: "preview-1", content_url: "/preview.png" };
const applied: Asset = { ...asset, asset_id: "revision-1", content_url: "/revision.png" };
const object: TextObjectState = { id: "text-1", text: "Hello", x: 12, y: 14, width: 120, height: 60, font_family: "dejavu_sans", font_size: 24, font_weight: "regular", font_style: "normal", color: "#ffffff", opacity: 100, alignment: "left", direction: "ltr", rotation: 0 };

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(applyText).mockReset();
  vi.mocked(deleteTextPreview).mockReset().mockResolvedValue();
  useAssetStore.setState({ asset, status: "success", error: null });
  useHistoryStore.getState().clear();
  useHistoryStore.getState().setCurrentAsset(asset);
  useTextStore.setState({ status: "idle", error: null, previewAsset: null });
  useUiStore.setState({ locale: "en", theme: "dark", sidebarOpen: false, propertiesOpen: true, activeTool: "advanced-text" });
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("TextPanel", () => {
  it("renders advanced text controls and create lifecycle", () => {
    const onCreate = vi.fn();
    render(<TextPanel onClose={vi.fn()} textObject={null} onCreate={onCreate} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByLabelText("Text content")).toBeInTheDocument();
    expect(screen.getByLabelText("Font family")).toBeInTheDocument();
    expect(screen.getByLabelText("Text direction")).toBeInTheDocument();
    expect(screen.getByLabelText("Text color")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create text" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create text" }));
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ text: "Text", direction: "auto" }));
  });

  it("supports editing controls without mutating the committed asset", () => {
    const onUpdate = vi.fn();
    render(<TextPanel onClose={vi.fn()} textObject={object} onCreate={vi.fn()} onUpdate={onUpdate} onDelete={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Text content"), { target: { value: "Hello\nمرحبا ✓" } });
    fireEvent.change(screen.getByLabelText("Text direction"), { target: { value: "rtl" } });
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ text: "Hello\nمرحبا ✓", direction: "rtl" }));
    expect(useAssetStore.getState().asset?.asset_id).toBe("asset-1");
  });

  it("applies one revision and one centralized history entry", async () => {
    vi.mocked(applyText).mockResolvedValue(applied);
    const onClose = vi.fn();
    render(<TextPanel onClose={onClose} textObject={object} onCreate={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await act(async () => { await Promise.resolve(); });
    expect(applyText).toHaveBeenCalledWith(expect.objectContaining({ asset_id: "asset-1", text: "Hello", direction: "ltr", preview: false }));
    expect(useAssetStore.getState().asset?.asset_id).toBe("revision-1");
    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().past[0].tool).toBe("advanced-text");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("cancels, resets and deletes without creating history", () => {
    const onClose = vi.fn();
    const onDelete = vi.fn();
    render(<TextPanel onClose={onClose} textObject={object} onCreate={vi.fn()} onUpdate={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete text" }));
    expect(onDelete).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(useHistoryStore.getState().past).toHaveLength(0);
  });
});
