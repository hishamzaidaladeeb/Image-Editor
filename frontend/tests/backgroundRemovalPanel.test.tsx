import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackgroundRemovalPanel } from "@/features/background/BackgroundRemovalPanel";
import { useAssetStore } from "@/stores/assetStore";
import { useBackgroundStore } from "@/stores/backgroundStore";
import { useUiStore } from "@/stores/uiStore";

const asset = { asset_id: "source-asset", filename: "subject.png", content_url: "/api/v1/assets/source-asset/content", metadata: { width: 32, height: 24, format: "PNG", file_size: 1000, channels: 3, color_mode: "RGB", color_space: null, has_transparency: false } };
const backgroundAsset = { asset_id: "background-asset", filename: "background.jpg", content_url: "/api/v1/assets/background-asset/content", metadata: { width: 32, height: 24, format: "JPEG", file_size: 900, channels: 3, color_mode: "RGB", color_space: null, has_transparency: false } };
const processedAsset = { ...asset, asset_id: "removed-asset", filename: "subject-background-removed.png", content_url: "/api/v1/assets/removed-asset/content", metadata: { ...asset.metadata, channels: 4, color_mode: "RGBA", format: "PNG", has_transparency: true } };
const response = { asset_id: asset.asset_id, background_mode: "transparent" as const, foreground_coverage: 0.48, processed_asset: processedAsset };

beforeEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useUiStore.setState({ locale: "ar", theme: "dark", sidebarOpen: false, propertiesOpen: true, activeTool: null });
  useAssetStore.setState({ asset, status: "success", error: null });
  useBackgroundStore.setState({ parameters: { background_mode: "transparent", background_color: "#ffffff", foreground_scale: 1, position_x: 0, position_y: 0, opacity: 1 }, status: "idle", error: null, result: null, previewAsset: null, backgroundAsset: null, history: [] });
});

test("shows before and after removal preview with foreground coverage", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => response }));
  render(<BackgroundRemovalPanel onClose={vi.fn()} />);
  expect(await screen.findByText("قبل")).toBeInTheDocument();
  expect(screen.getByText("بعد")).toBeInTheDocument();
  expect(screen.getByText("نسبة المنتج: 48%")).toBeInTheDocument();
});

test("supports color background controls and applies a revision", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...response, background_mode: "color" }) }));
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<BackgroundRemovalPanel onClose={onClose} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "نوع الخلفية" }), "color");
  expect(screen.getByLabelText("لون الخلفية")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: "تطبيق" })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: "تطبيق" }));
  await waitFor(() => expect(useAssetStore.getState().asset?.asset_id).toBe("removed-asset"));
  expect(useBackgroundStore.getState().history).toHaveLength(1);
  expect(onClose).toHaveBeenCalled();
});

test("uploads an image background and exposes scale position opacity controls", async () => {
  const fetchMock = vi.fn().mockImplementation((url: string) => { if (url.endsWith("/assets")) return Promise.resolve({ ok: true, json: async () => backgroundAsset }); return Promise.resolve({ ok: true, json: async () => ({ ...response, background_mode: "image" }) }); });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<BackgroundRemovalPanel onClose={vi.fn()} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "نوع الخلفية" }), "image");
  const file = new File(["background"], "background.jpg", { type: "image/jpeg" });
  await user.upload(screen.getByLabelText("صورة الخلفية"), file);
  await waitFor(() => expect(screen.getByText("background.jpg")).toBeInTheDocument());
  expect(screen.getByRole("slider", { name: "مقياس المنتج slider" })).toBeInTheDocument();
  expect(screen.getByRole("slider", { name: "الموضع الأفقي slider" })).toBeInTheDocument();
  expect(screen.getByRole("slider", { name: "الموضع الرأسي slider" })).toBeInTheDocument();
  expect(screen.getByRole("slider", { name: "شفافية المنتج slider" })).toBeInTheDocument();
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/background/remove"))).toBe(true));
});

test("reset and cancel do not create a history entry", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => response }));
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<BackgroundRemovalPanel onClose={onClose} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "نوع الخلفية" }), "color");
  await user.click(screen.getByRole("button", { name: "إعادة ضبط" }));
  expect(useBackgroundStore.getState().parameters.background_mode).toBe("transparent");
  expect(useBackgroundStore.getState().history).toHaveLength(0);
  await user.click(screen.getByRole("button", { name: "إلغاء" }));
  expect(onClose).toHaveBeenCalled();
});
