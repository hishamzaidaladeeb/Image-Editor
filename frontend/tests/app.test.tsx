import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/app/App";
import { useAssetStore } from "@/stores/assetStore";
import { useUiStore } from "@/stores/uiStore";
import { useHistoryStore } from "@/stores/historyStore";
import type { Asset } from "@/types/asset";

describe("application shell foundation", () => {
  beforeEach(() => {
    useUiStore.setState({ locale: "ar", theme: "dark", sidebarOpen: false, propertiesOpen: true, activeTool: null });
    useAssetStore.setState({ asset: null, status: "idle", error: null });
    useHistoryStore.setState({ past: [], future: [], currentAssetId: null, canUndo: false, canRedo: false });
    vi.restoreAllMocks();
  });

  it("renders the Arabic shell by default", () => {
    render(<App />);
    expect(screen.getByText("محرر الصور")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("switches the shell to English and LTR", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "اللغة" }));
    expect(screen.getByText("Image Editor")).toBeInTheDocument();
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("toggles the theme without changing the active shell", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "المظهر" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByText("محرر الصور")).toBeInTheDocument();
  });

  it("supports undo and redo controls with keyboard shortcuts", () => {
    const source: Asset = { asset_id: "source", filename: "source.png", content_url: "/source", metadata: { width: 4, height: 4, format: "PNG", file_size: 10, channels: 4, color_mode: "RGBA", color_space: null, has_transparency: true } };
    const next: Asset = { ...source, asset_id: "next", content_url: "/next" };
    const applied: string[] = [];
    const unregister = useHistoryStore.getState().registerAssetApplier((value) => applied.push(value.asset_id));
    useHistoryStore.getState().recordCommit({ tool: "pixel", operation: "brightness", parameters: { brightness: 12 } }, source, next);
    render(<App />);
    expect(screen.getByRole("button", { name: "تراجع" })).toBeEnabled();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(applied).toEqual(["source"]);
    expect(screen.getByRole("button", { name: "إعادة" })).toBeEnabled();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(applied).toEqual(["source", "next"]);
    unregister();
  });

  it("uploads a selected image and renders metadata", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ asset_id: "asset-1", filename: "photo.png", content_url: "/api/v1/assets/asset-1/content", metadata: { width: 120, height: 80, format: "PNG", file_size: 2048, channels: 4, color_mode: "RGBA", color_space: null, has_transparency: true } }) }));
    render(<App />);
    const file = new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("اختيار صورة"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText("تم رفع الصورة بنجاح")).toBeInTheDocument());
    expect(screen.getByText("120px × 80px")).toBeInTheDocument();
    expect(screen.getByText("photo.png")).toBeInTheDocument();
  });

  it("opens a tool panel directly and returns to the main canvas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ asset_id: "asset-1", filename: "photo.png", content_url: "/api/v1/assets/asset-1/content", metadata: { width: 120, height: 80, format: "PNG", file_size: 2048, channels: 4, color_mode: "RGBA", color_space: null, has_transparency: true } }) }));
    const user = userEvent.setup();
    render(<App />);
    const file = new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("اختيار صورة"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText("تم رفع الصورة بنجاح")).toBeInTheDocument());
    await user.click(screen.getByTitle("التحويلات"));
    expect(screen.getByRole("button", { name: "العودة للقائمة الرئيسية" })).toBeInTheDocument();
    expect(screen.queryByText("الخصائص")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "العودة للقائمة الرئيسية" }));
    expect(screen.queryByRole("button", { name: "العودة للقائمة الرئيسية" })).not.toBeInTheDocument();
    expect(screen.getByText("photo.png")).toBeInTheDocument();
  });

  it("handles drag and drop upload errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ code: "UNSUPPORTED_EXTENSION", message: "امتداد الملف غير مدعوم.", request_id: "r1", field_errors: [] }) }));
    render(<App />);
    const file = new File(["data"], "photo.gif", { type: "image/gif" });
    fireEvent.drop(screen.getByText("ابدأ برفع صورة").closest("div")!, { dataTransfer: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("امتداد الملف غير مدعوم."));
  });
});
