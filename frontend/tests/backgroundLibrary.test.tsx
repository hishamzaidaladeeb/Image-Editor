import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackgroundLibraryPanel } from "@/features/backgroundLibrary/BackgroundLibraryPanel";
import { backgroundLibrary } from "@/data/backgroundLibrary";
import { useBackgroundLibraryStore } from "@/stores/backgroundLibraryStore";
import { useUiStore } from "@/stores/uiStore";

const selectedAsset = { asset_id: "library-asset", filename: "studio.png", content_url: "/api/v1/assets/library-asset/content", metadata: { width: 1200, height: 900, format: "PNG", file_size: 1000, channels: 3, color_mode: "RGB", color_space: null, has_transparency: false } };

beforeEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useUiStore.setState({ locale: "ar", theme: "dark", sidebarOpen: false, propertiesOpen: true, activeTool: null });
  useBackgroundLibraryStore.setState({ category: "all", selectedItem: null, selectedAsset: null, status: "idle", error: null });
});

test("catalog contains all required categories and renders organized items", () => {
  expect(backgroundLibrary).toHaveLength(8);
  expect(new Set(backgroundLibrary.map((item) => item.category))).toEqual(new Set(["white", "black", "gray", "studio", "product", "gradient", "minimal", "advertising"]));
  render(<BackgroundLibraryPanel onUse={vi.fn()} onClose={vi.fn()} />);
  expect(screen.getByRole("button", { name: "أبيض" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "استوديو" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "إعلاني" })).toBeInTheDocument();
});

test("filters the library by category", async () => {
  const user = userEvent.setup();
  render(<BackgroundLibraryPanel onUse={vi.fn()} onClose={vi.fn()} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "الفئة" }), "studio");
  expect(screen.getByRole("button", { name: "استوديو" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "أبيض" })).not.toBeInTheDocument();
});

test("loads selected background through the upload service and returns an Asset", async () => {
  const fetchMock = vi.fn().mockImplementation((url: string) => { if (url === "/backgrounds/studio.png") return Promise.resolve({ ok: true, blob: async () => new Blob(["png"], { type: "image/png" }) }); return Promise.resolve({ ok: true, json: async () => selectedAsset }); });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  const onUse = vi.fn();
  render(<BackgroundLibraryPanel onUse={onUse} onClose={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "استوديو" }));
  await waitFor(() => expect(onUse).toHaveBeenCalledWith(selectedAsset));
  expect(useBackgroundLibraryStore.getState().status).toBe("success");
  expect(fetchMock).toHaveBeenCalledWith("/backgrounds/studio.png");
});

test("shows translated error when a library asset cannot be loaded", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
  const user = userEvent.setup();
  render(<BackgroundLibraryPanel onUse={vi.fn()} onClose={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "استوديو" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("تعذر تحميل مكتبة الخلفيات.");
  expect(useBackgroundLibraryStore.getState().status).toBe("error");
});
