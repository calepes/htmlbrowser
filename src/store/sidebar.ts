import { create } from "zustand";

const STORAGE_KEY = "htmlbrowser.sidebar.v1";

export const SIDEBAR_DEFAULT_WIDTH = 256;
export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 600;

interface Persisted {
  width: number;
  collapsed: boolean;
}

interface SidebarState {
  width: number;
  collapsed: boolean;
  setWidth: (width: number) => void;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  resetWidth: () => void;
}

function loadPersisted(): Persisted {
  if (typeof window === "undefined") {
    return { width: SIDEBAR_DEFAULT_WIDTH, collapsed: false };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { width: SIDEBAR_DEFAULT_WIDTH, collapsed: false };
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const width = clampWidth(
      typeof parsed.width === "number" ? parsed.width : SIDEBAR_DEFAULT_WIDTH,
    );
    const collapsed = parsed.collapsed === true;
    return { width, collapsed };
  } catch {
    return { width: SIDEBAR_DEFAULT_WIDTH, collapsed: false };
  }
}

function persist(state: Persisted) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / privacy mode errors
  }
}

export function clampWidth(width: number): number {
  if (!Number.isFinite(width)) return SIDEBAR_DEFAULT_WIDTH;
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, Math.round(width)));
}

const initial = loadPersisted();

export const useSidebarStore = create<SidebarState>((set, get) => ({
  width: initial.width,
  collapsed: initial.collapsed,
  setWidth(width) {
    const next = clampWidth(width);
    if (next === get().width) return;
    set({ width: next });
    persist({ width: next, collapsed: get().collapsed });
  },
  setCollapsed(collapsed) {
    if (collapsed === get().collapsed) return;
    set({ collapsed });
    persist({ width: get().width, collapsed });
  },
  toggleCollapsed() {
    const next = !get().collapsed;
    set({ collapsed: next });
    persist({ width: get().width, collapsed: next });
  },
  resetWidth() {
    set({ width: SIDEBAR_DEFAULT_WIDTH });
    persist({ width: SIDEBAR_DEFAULT_WIDTH, collapsed: get().collapsed });
  },
}));
