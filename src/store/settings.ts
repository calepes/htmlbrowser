import { create } from "zustand";
import type { TrustMode } from "@/types";
import * as api from "@/lib/tauri";

export type Theme = "dark" | "light";

interface SettingsState {
  trustMode: TrustMode;
  theme: Theme;
  loadForWorkspace: (root: string) => Promise<void>;
  setTrustMode: (workspace: string, mode: TrustMode) => Promise<void>;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === "light") {
    html.classList.remove("dark");
    html.classList.add("light");
  } else {
    html.classList.remove("light");
    html.classList.add("dark");
  }
  localStorage.setItem("theme", theme);
}

const savedTheme = (localStorage.getItem("theme") as Theme | null) ?? "dark";
applyTheme(savedTheme);

export const useSettingsStore = create<SettingsState>((set) => ({
  trustMode: "safe",
  theme: savedTheme,

  async loadForWorkspace(root) {
    const mode = await api.getTrustMode(root);
    set({ trustMode: mode });
  },

  async setTrustMode(workspace, mode) {
    await api.setTrustMode(workspace, mode);
    set({ trustMode: mode });
  },

  setTheme(theme) {
    applyTheme(theme);
    set({ theme });
  },
}));
