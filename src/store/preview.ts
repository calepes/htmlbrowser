import { create } from "zustand";

interface PreviewState {
  /** Monotonic counter the preview pane uses to force-reload. */
  reloadToken: number;
  lastReloadAt: number | null;
  /** When true, the preview webview is collapsed to 0x0 so HTML overlays
   *  in the main window (e.g. menus) aren't covered by the native child. */
  overlayHidden: boolean;
  bumpReload: () => void;
  setOverlayHidden: (hidden: boolean) => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  reloadToken: 0,
  lastReloadAt: null,
  overlayHidden: false,
  bumpReload() {
    set((s) => ({
      reloadToken: s.reloadToken + 1,
      lastReloadAt: Date.now(),
    }));
  },
  setOverlayHidden(hidden) {
    set({ overlayHidden: hidden });
  },
}));
