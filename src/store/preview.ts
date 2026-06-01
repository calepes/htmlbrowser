import { create } from "zustand";

export type ViewMode = "web" | "mobile";

interface PreviewState {
  /** Monotonic counter the preview pane uses to force-reload. */
  reloadToken: number;
  lastReloadAt: number | null;
  viewMode: ViewMode;
  bumpReload: () => void;
  setViewMode: (mode: ViewMode) => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  reloadToken: 0,
  lastReloadAt: null,
  viewMode: "web",
  bumpReload() {
    set((s) => ({
      reloadToken: s.reloadToken + 1,
      lastReloadAt: Date.now(),
    }));
  },
  setViewMode(mode) {
    set({ viewMode: mode });
  },
}));
