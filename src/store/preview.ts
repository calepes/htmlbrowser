import { create } from "zustand";

interface PreviewState {
  /** Monotonic counter the preview pane uses to force-reload. */
  reloadToken: number;
  lastReloadAt: number | null;
  bumpReload: () => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  reloadToken: 0,
  lastReloadAt: null,
  bumpReload() {
    set((s) => ({
      reloadToken: s.reloadToken + 1,
      lastReloadAt: Date.now(),
    }));
  },
}));
