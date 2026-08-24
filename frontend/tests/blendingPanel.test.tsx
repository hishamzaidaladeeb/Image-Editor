import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlendingPanel } from "@/features/blending/BlendingPanel";
import { useAssetStore } from "@/stores/assetStore";
import { useBlendingStore } from "@/stores/blendingStore";
import { useUiStore } from "@/stores/uiStore";

const firstAsset = { asset_id: "first-asset", filename: "first.png", content_url: "/api/v1/assets/first-asset/content", metadata: { width: 32, height: 24, format: "PNG", file_size: 1000, channels: 3, color_mode: "RGB", color_space: null, has_transparency: false } };
const secondAsset = { asset_id: "second-asset", filename: "second.png", content_url: "/api/v1/assets/second-asset/content", metadata: { width: 24, height: 32, format: "PNG", file_size: 900, channels: 3, color_mode: "RGB", color_space: null, has_transparency: false } };
const blendedAsset = { ...firstAsset, asset_id: "blended-asset", filename: "first-blend-alpha.png", content_url: "/api/v1/assets/blended-asset/content", metadata: { ...firstAsset.metadata, channels: 4, color_mode: "RGBA", has_transparency: false } };
const response = { asset_id: firstAsset.asset_id, second_asset_id: secondAsset.asset_id, operation: "alpha" as const, processed_asset: blendedAsset };

beforeEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useUiStore.setState({ locale: "ar", theme: "dark", sidebarOpen: false, propertiesOpen: true, activeTool: null });
  useAssetStore.setState({ asset: firstAsset, status: "success", error: null });
  useBlendingStore.setState({ parameters: { operation: "alpha", opacity: 0.5, weight_a: 0.5, weight_b: 0.5 }, status: "idle", error: null, result: null, previewAsset: null, secondAsset: secondAsset, history: [] });
});

test("renders before and after preview and alpha opacity control", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => response }));
  render(<BlendingPanel onClose={vi.fn()} />);
  expect(await screen.findByText("قبل")).toBeInTheDocument();
  expect(screen.getByText("بعد")).toBeInTheDocument();
  expect(screen.getByRole("slider", { name: "شفافية الدمج slider" })).toBeInTheDocument();
});

test("switches to Blend and exposes Weight A and Weight B controls", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...response, operation: "blend" }) }));
  const user = userEvent.setup();
  render(<BlendingPanel onClose={vi.fn()} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "عملية الدمج" }), "blend");
  expect(screen.getByRole("slider", { name: "وزن الصورة الأولى slider" })).toBeInTheDocument();
  expect(screen.getByRole("slider", { name: "وزن الصورة الثانية slider" })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText("بعد")).toBeInTheDocument());
});

test("uploads a second image and applies a new revision", async () => {
  const fetchMock = vi.fn().mockImplementation((url: string) => { if (url.endsWith("/assets")) return Promise.resolve({ ok: true, json: async () => secondAsset }); return Promise.resolve({ ok: true, json: async () => response }); });
  vi.stubGlobal("fetch", fetchMock);
  useBlendingStore.setState({ secondAsset: null });
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<BlendingPanel onClose={onClose} />);
  const file = new File(["image"], "second.png", { type: "image/png" });
  await user.upload(screen.getByLabelText("الصورة الثانية"), file);
  await waitFor(() => expect(screen.getByText("second.png")).toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("button", { name: "تطبيق" })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: "تطبيق" }));
  await waitFor(() => expect(useAssetStore.getState().asset?.asset_id).toBe("blended-asset"));
  expect(useBlendingStore.getState().history).toHaveLength(1);
  expect(onClose).toHaveBeenCalled();
});

test("reset and cancel clear preview state without history", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => response }));
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<BlendingPanel onClose={onClose} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "عملية الدمج" }), "difference");
  await user.click(screen.getByRole("button", { name: "إعادة ضبط" }));
  expect(useBlendingStore.getState().parameters.operation).toBe("alpha");
  expect(useBlendingStore.getState().history).toHaveLength(0);
  await user.click(screen.getByRole("button", { name: "إلغاء" }));
  expect(onClose).toHaveBeenCalled();
});
