import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistogramPanel } from "@/features/histogram/HistogramPanel";
import { useAssetStore } from "@/stores/assetStore";
import { useHistogramStore } from "@/stores/histogramStore";
import { useUiStore } from "@/stores/uiStore";

const asset = { asset_id: "asset-source", filename: "source.png", content_url: "/api/v1/assets/asset-source/content", metadata: { width: 8, height: 6, format: "PNG", file_size: 1000, channels: 3, color_mode: "RGB", color_space: null, has_transparency: false } };
const processedAsset = { ...asset, asset_id: "asset-equalized", filename: "source-histogram-equalize.png", content_url: "/api/v1/assets/asset-equalized/content" };
const channels = { grayscale: Array(256).fill(0), red: Array(256).fill(0), green: Array(256).fill(0), blue: Array(256).fill(0), alpha: null };
const response = { asset_id: asset.asset_id, operation: "equalize" as const, before: channels, after: { ...channels, grayscale: channels.grayscale.map((value, index) => index === 120 ? 48 : value) }, processed_asset: processedAsset };

beforeEach(() => {
  cleanup();
  useUiStore.setState({ locale: "ar", theme: "dark", sidebarOpen: false, propertiesOpen: true, activeTool: null });
  useAssetStore.setState({ asset, status: "success", error: null });
  useHistogramStore.setState({ operation: "original", parameters: { clahe_clip_limit: 2, clahe_tile_grid_size: 8 }, status: "idle", error: null, result: null, previewAsset: null, history: [] });
  vi.restoreAllMocks();
});

test("renders before and after grayscale and RGB charts", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...response, operation: "original", processed_asset: null, after: channels }) }));
  render(<HistogramPanel onClose={vi.fn()} />);
  await waitFor(() => expect(screen.getAllByRole("img", { name: "Histogram التدرج الرمادي" })).toHaveLength(2));
  expect(screen.getAllByRole("img", { name: "Histogram قنوات RGB" })).toHaveLength(2);
  expect(screen.getByText("قبل المعالجة")).toBeInTheDocument();
  expect(screen.getByText("بعد المعالجة")).toBeInTheDocument();
});

test("renders CLAHE controls and applies a processed revision", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => response });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<HistogramPanel onClose={onClose} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "عملية Histogram" }), "clahe");
  expect(screen.getByRole("slider", { name: "حد القص CLAHE slider" })).toBeInTheDocument();
  expect(screen.getByRole("spinbutton", { name: "حد القص CLAHE number" })).toBeInTheDocument();
  await user.selectOptions(screen.getByRole("combobox", { name: "عملية Histogram" }), "equalize");
  await waitFor(() => expect(screen.getAllByRole("img", { name: "Histogram التدرج الرمادي" })).toHaveLength(2));
  await user.click(screen.getByRole("button", { name: "تطبيق" }));
  await waitFor(() => expect(useAssetStore.getState().asset?.asset_id).toBe("asset-equalized"));
  expect(useHistogramStore.getState().history).toHaveLength(1);
  expect(onClose).toHaveBeenCalled();
});

test("reset returns to original analysis without creating history", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => response }));
  const user = userEvent.setup();
  render(<HistogramPanel onClose={vi.fn()} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "عملية Histogram" }), "clahe");
  await user.click(screen.getByRole("button", { name: "إعادة ضبط" }));
  expect(useHistogramStore.getState().operation).toBe("original");
  expect(useHistogramStore.getState().history).toHaveLength(0);
});
