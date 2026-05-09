import { create } from "zustand";
import type { DirEntry } from "@/types";
import * as api from "@/lib/tauri";

interface WorkspaceState {
  root: string | null;
  entries: DirEntry[];
  selectedFile: string | null;
  expandedDirs: Set<string>;
  recentWorkspaces: string[];
  isLoading: boolean;

  hydrate: () => Promise<void>;
  openWorkspace: (root: string) => Promise<void>;
  closeWorkspace: () => void;
  selectFile: (path: string | null) => void;
  toggleDirectory: (path: string) => void;
  refresh: () => Promise<void>;
  removeRecent: (root: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  root: null,
  entries: [],
  selectedFile: null,
  expandedDirs: new Set(),
  recentWorkspaces: [],
  isLoading: false,

  async hydrate() {
    const bundle = await api.getStartupState();
    set({ recentWorkspaces: bundle.recentWorkspaces });
    if (bundle.lastWorkspace) {
      try {
        await get().openWorkspace(bundle.lastWorkspace);
      } catch {
        // Workspace folder may have been moved/deleted; keep app empty.
      }
    }
  },

  async openWorkspace(root) {
    set({ isLoading: true });
    try {
      const tree = await api.openWorkspace(root);
      const recents = await api.pushRecentWorkspace(root);
      set({
        root: tree.root,
        entries: tree.entries,
        recentWorkspaces: recents,
        selectedFile: null,
        expandedDirs: new Set(),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  closeWorkspace() {
    set({
      root: null,
      entries: [],
      selectedFile: null,
      expandedDirs: new Set(),
    });
  },

  selectFile(path) {
    set({ selectedFile: path });
  },

  toggleDirectory(path) {
    const next = new Set(get().expandedDirs);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    set({ expandedDirs: next });
  },

  async refresh() {
    const root = get().root;
    if (!root) return;
    const tree = await api.openWorkspace(root);
    set({ entries: tree.entries });
  },

  async removeRecent(root) {
    const recents = await api.removeRecentWorkspace(root);
    set({ recentWorkspaces: recents });
  },
}));
