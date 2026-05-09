import { create } from "zustand";
import type { TrustMode } from "@/types";
import * as api from "@/lib/tauri";

interface SettingsState {
  trustMode: TrustMode;
  loadForWorkspace: (root: string) => Promise<void>;
  setTrustMode: (workspace: string, mode: TrustMode) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  trustMode: "safe",

  async loadForWorkspace(root) {
    const mode = await api.getTrustMode(root);
    set({ trustMode: mode });
  },

  async setTrustMode(workspace, mode) {
    await api.setTrustMode(workspace, mode);
    set({ trustMode: mode });
  },
}));
