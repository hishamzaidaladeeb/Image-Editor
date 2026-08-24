import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportPanel } from "@/features/export/ExportPanel";
import { useExportStore } from "@/stores/exportStore";
import { useUiStore } from "@/stores/uiStore";
import type { Asset } from "@/types/asset";

const asset: Asset = { asset_id: "export-source", filename: "source.png", content_url: "/api/v1/assets/export-source/content", metadata: { width: 12, height: 8, format: "PNG", file_size: 100, channels: 4, color_mode: "RGBA", color_space: null, has_transparency: true } };
const previewResponse = { export_id: "export-preview", source_asset_id: asset.asset_id, filename: "preview.png", format: "PNG", quality: 95, width: 12, height: 8, file_size: 120, channels: 4, color_mode: "RGBA", has_transparency: true, preview: true, preview_url: "http://localhost:8000/api/v1/export/export-preview/content", download_url: "http://localhost:8000/api/v1/export/export-preview/download" };
const finalResponse = { ...previewResponse, export_id: "export-final", filename: "final.png", preview: false, preview_url: "http://localhost:8000/api/v1/export/export-final/content", download_url: "http://localhost:8000/api/v1/export/export-final/download" };

beforeEach(() => {
  useUiStore.setState({ locale: "en", theme: "dark", sidebarOpen: false, propertiesOpen: true, activeTool: "export" });
  useExportStore.setState({ format: "png", quality: 95, width: 12, height: 8, filename: "export", preserveTransparency: true, status: "idle", error: null, previewResult: null, result: null, history: [] });
  vi.restoreAllMocks();
});

test("preview submits pixel dimensions and cancel removes only temporary export", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => previewResponse }).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  vi.stubGlobal("fetch", fetchMock);
  useExportStore.getState().setWidth(6);
  useExportStore.getState().setHeight(4);
  useExportStore.getState().preview(asset);
  await vi.advanceTimersByTimeAsync(220);
  await Promise.resolve();
  await Promise.resolve();
  expect(useExportStore.getState().previewResult?.export_id).toBe("export-preview");
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
  expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toMatchObject({ asset_id: asset.asset_id, width: 6, height: 4, format: "png", preview: true });
  useExportStore.getState().cancel();
  expect(fetchMock).toHaveBeenLastCalledWith("http://localhost:8000/api/v1/export/export-preview/preview", { method: "DELETE" });
  expect(useExportStore.getState().previewResult).toBeNull();
  vi.useRealTimers();
});

test("apply creates an export result without replacing the committed asset", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => finalResponse });
  vi.stubGlobal("fetch", fetchMock);
  useExportStore.getState().setFilename("final-image");
  const result = await useExportStore.getState().apply(asset);
  expect(result?.export_id).toBe("export-final");
  expect(useExportStore.getState().history).toHaveLength(1);
  expect(useExportStore.getState().previewResult).toBeNull();
  expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toMatchObject({ asset_id: asset.asset_id, filename: "final-image", preview: false });
});

test("renders export controls and validates unsafe filename before apply", async () => {
  const user = userEvent.setup();
  render(<ExportPanel asset={asset} onClose={vi.fn()} />);
  expect(screen.getByRole("heading", { name: "Export" })).toBeInTheDocument();
  expect(screen.getByLabelText("Export format")).toBeInTheDocument();
  expect(screen.getAllByLabelText("Quality")).toHaveLength(2);
  expect(screen.getByLabelText("Export width")).toHaveValue(12);
  expect(screen.getByLabelText("Export height")).toHaveValue(8);
  await user.clear(screen.getByLabelText("Filename"));
  await user.type(screen.getByLabelText("Filename"), "bad name");
  expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
});


test("keeps manually entered dimensions exact and blocks invalid values", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => previewResponse }));
  render(<ExportPanel asset={asset} onClose={vi.fn()} />);
  const width = screen.getByLabelText("Export width");
  const height = screen.getByLabelText("Export height");
  await user.clear(width);
  await user.type(width, "80");
  await user.clear(height);
  await user.type(height, "320");
  expect(width).toHaveValue(80);
  expect(height).toHaveValue(320);
  await waitFor(() => expect(useExportStore.getState().status).toBe("ready"));
  expect(screen.getByRole("button", { name: "Apply" })).not.toBeDisabled();
  await user.clear(width);
  await user.type(width, "0");
  expect(width).toHaveValue(0);
  expect(screen.getByRole("alert")).toHaveTextContent("Export dimensions must be between 1 and 12000 pixels.");
  expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  await user.clear(width);
  await user.type(width, "-5");
  expect(screen.getByRole("alert")).toBeInTheDocument();
  await user.clear(width);
  await user.type(width, "abc");
  expect(screen.getByRole("alert")).toBeInTheDocument();
  await user.clear(width);
  await user.type(width, "12001");
  expect(screen.getByRole("alert")).toBeInTheDocument();
});
