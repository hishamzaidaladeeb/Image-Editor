import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransformPanel } from "@/features/transform/TransformPanel";
import { useAssetStore } from "@/stores/assetStore";
import { useTransformStore } from "@/stores/transformStore";
import { useUiStore } from "@/stores/uiStore";

const asset = { asset_id: "asset-source", filename: "source.png", content_url: "/api/v1/assets/asset-source/content", metadata: { width: 100, height: 60, format: "PNG", file_size: 1000, channels: 3, color_mode: "RGB", color_space: null, has_transparency: false } };

beforeEach(() => {
  useUiStore.setState({ locale: "ar", theme: "dark", sidebarOpen: false, propertiesOpen: true, activeTool: null });
  useAssetStore.setState({ asset, status: "success", error: null });
  useTransformStore.setState({ operation: "crop", status: "idle", error: null, previewAsset: null, history: [] });
  vi.restoreAllMocks();
});

test("applies a real transform and updates Asset State", async () => {
  const nextAsset = { ...asset, asset_id: "asset-cropped", filename: "source-crop.png", content_url: "/api/v1/assets/asset-cropped/content", metadata: { ...asset.metadata, width: 40, height: 20 } };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => nextAsset }));
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<TransformPanel onClose={onClose} />);
  await user.click(screen.getByRole("button", { name: "تطبيق" }));
  await waitFor(() => expect(useAssetStore.getState().asset?.asset_id).toBe("asset-cropped"));
  expect(onClose).toHaveBeenCalled();
  expect(useTransformStore.getState().history).toHaveLength(1);
});

test("updates crop preview and resets it without applying a revision", async () => {
  const preview = vi.fn();
  const user = userEvent.setup();
  render(<TransformPanel onClose={vi.fn()} onCropPreview={preview} />);
  await user.clear(screen.getByLabelText("العرض"));
  await user.type(screen.getByLabelText("العرض"), "40");
  expect(preview).toHaveBeenCalledWith(expect.objectContaining({ width: 40 }));
  await user.click(screen.getByRole("button", { name: "إعادة ضبط" }));
  expect(preview).toHaveBeenLastCalledWith({ x: 0, y: 0, width: 100, height: 60 });
  expect(useTransformStore.getState().history).toHaveLength(0);
});

test("renders required transform controls for resize and perspective", async () => {
  const user = userEvent.setup();
  render(<TransformPanel onClose={vi.fn()} />);
  await user.selectOptions(screen.getByLabelText("العملية"), "crop");
  expect(screen.getByLabelText("نسبة القص")).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("العملية"), "resize");
  expect(screen.getByLabelText("قفل نسبة الأبعاد")).toBeInTheDocument();
  expect(screen.getByLabelText("طريقة الاستيفاء")).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("العملية"), "perspective");
  expect(screen.getByLabelText("النقطة 1 X")).toBeInTheDocument();
  expect(screen.getByLabelText("النقطة 4 Y")).toBeInTheDocument();
});

test("renders unified transform error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ code: "CROP_REGION_INVALID", message: "منطقة القص غير صالحة.", request_id: "r1", field_errors: [] }) }));
  const user = userEvent.setup();
  render(<TransformPanel onClose={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "تطبيق" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("منطقة القص غير صالحة."));
});

test("directional translate buttons update both coordinates", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => asset }));
  const user = userEvent.setup();
  render(<TransformPanel onClose={vi.fn()} />);
  await user.selectOptions(screen.getByLabelText("العملية"), "translate");
  await user.click(screen.getByRole("button", { name: "إزاحة لليمين" }));
  expect(screen.getByLabelText("X")).toHaveValue(10);
  expect(screen.getByLabelText("Y")).toHaveValue(0);
  await user.click(screen.getByRole("button", { name: "إزاحة للأسفل" }));
  expect(screen.getByLabelText("X")).toHaveValue(10);
  expect(screen.getByLabelText("Y")).toHaveValue(10);
});
