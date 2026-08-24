import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PixelPanel } from "@/features/pixel/PixelPanel";
import { useAssetStore } from "@/stores/assetStore";
import { usePixelStore } from "@/stores/pixelStore";
import { useUiStore } from "@/stores/uiStore";

const asset = { asset_id: "pixel-source", filename: "source.png", content_url: "/api/v1/assets/pixel-source/content", metadata: { width: 12, height: 8, format: "PNG", file_size: 100, channels: 3, color_mode: "RGB", color_space: null, has_transparency: false } };

beforeEach(() => {
  useUiStore.setState({ locale: "ar", theme: "dark", sidebarOpen: false, propertiesOpen: true, activeTool: null });
  useAssetStore.setState({ asset, status: "success", error: null });
  usePixelStore.setState({ operation: "adjust", parameters: { brightness: 0, contrast: 1, gamma: 1, saturation: 1, hue: 0, exposure: 0, sharpness: 0, threshold_mode: "global", threshold: 128, max_value: 255, block_size: 11, adaptive_c: 2 }, status: "idle", error: null, previewAsset: null, history: [] });
  vi.restoreAllMocks();
});

test("applies pixel operation and records revision history", async () => {
  const nextAsset = { ...asset, asset_id: "pixel-result", content_url: "/api/v1/assets/pixel-result/content" };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => nextAsset }));
  const user = userEvent.setup();
  render(<PixelPanel onClose={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "تطبيق" }));
  await waitFor(() => expect(useAssetStore.getState().asset?.asset_id).toBe("pixel-result"));
  expect(usePixelStore.getState().history).toHaveLength(1);
});

test("renders pixel operation error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ code: "INVALID_PARAMETER", message: "قيمة غير صالحة.", request_id: "r2", field_errors: [] }) }));
  const user = userEvent.setup();
  render(<PixelPanel onClose={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "تطبيق" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("قيمة غير صالحة."));
});

test("cleans preview asset on cancel after debounced live preview", async () => {
  vi.useFakeTimers();
  const previewAsset = { ...asset, asset_id: "pixel-preview", content_url: "/api/v1/assets/pixel-preview/content" };
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => previewAsset })
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  vi.stubGlobal("fetch", fetchMock);
  usePixelStore.getState().preview(asset);
  await vi.advanceTimersByTimeAsync(220);
  expect(usePixelStore.getState().previewAsset?.asset_id).toBe("pixel-preview");
  usePixelStore.getState().cancel();
  expect(fetchMock).toHaveBeenLastCalledWith("http://localhost:8000/api/v1/assets/pixel-preview/preview", { method: "DELETE" });
  vi.useRealTimers();
});

test("shows adaptive threshold controls and resets parameters", async () => {
  const user = userEvent.setup();
  render(<PixelPanel onClose={vi.fn()} />);
  await user.selectOptions(screen.getByLabelText("عملية البكسل"), "threshold");
  await user.selectOptions(screen.getByLabelText("نوع العتبة"), "adaptive");
  expect(screen.getAllByLabelText("حجم النافذة")).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: "إعادة ضبط" }));
  expect(usePixelStore.getState().parameters.brightness).toBe(0);
});
