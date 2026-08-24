import { create } from "zustand";
import type { Locale, TranslationKey } from "@/localization/translations";
import { translations } from "@/localization/translations";

type Theme = "dark" | "light";

type UiState = {
  locale: Locale;
  theme: Theme;
  sidebarOpen: boolean;
  propertiesOpen: boolean;
  activeTool: string | null;
  setLocale: (locale: Locale) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  toggleProperties: () => void;
  setActiveTool: (tool: string | null) => void;
  t: (key: TranslationKey) => string;
};

export const useUiStore = create<UiState>((set, get) => ({
  locale: "ar",
  theme: "dark",
  sidebarOpen: false,
  propertiesOpen: true,
  activeTool: null,
  setLocale: (locale) => set({ locale }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleProperties: () => set((state) => ({ propertiesOpen: !state.propertiesOpen })),
  setActiveTool: (activeTool) => set({ activeTool, propertiesOpen: Boolean(activeTool) }),
  t: (key) => translations[get().locale][key]
}));
