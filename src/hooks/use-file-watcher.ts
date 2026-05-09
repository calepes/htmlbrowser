import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type {
  DirectoryChangeEvent,
  FileChangeEvent,
} from "@/types";
import { useWorkspaceStore } from "@/store/workspace";
import { usePreviewStore } from "@/store/preview";

export function useFileWatcher() {
  useEffect(() => {
    const unlistenPromises = [
      listen<FileChangeEvent>("fs:file-changed", (e) => {
        const { selectedFile } = useWorkspaceStore.getState();
        if (selectedFile && e.payload.path === selectedFile) {
          usePreviewStore.getState().bumpReload();
        }
      }),
      listen<DirectoryChangeEvent>("fs:directory-changed", () => {
        useWorkspaceStore.getState().refresh().catch(() => {
          // Workspace may have been closed mid-event; ignore.
        });
      }),
    ];

    return () => {
      unlistenPromises.forEach((p) =>
        p.then((unlisten) => unlisten()).catch(() => {}),
      );
    };
  }, []);
}
