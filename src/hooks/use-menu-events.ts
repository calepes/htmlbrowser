import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useWorkspaceStore } from "@/store/workspace";
import { usePreviewStore } from "@/store/preview";
import { checkForUpdates } from "@/hooks/use-updater";

export function useMenuEvents() {
  useEffect(() => {
    const unlistens = [
      listen("menu:check-updates", () => {
        void checkForUpdates({ notifyWhenUpToDate: true });
      }),
      listen("menu:open-folder", async () => {
        const picked = await openDialog({ directory: true, multiple: false });
        if (typeof picked === "string") {
          await useWorkspaceStore.getState().openWorkspace(picked);
        }
      }),
      listen("menu:reload-preview", () => {
        usePreviewStore.getState().bumpReload();
      }),
    ];
    return () => {
      unlistens.forEach((p) => p.then((u) => u()).catch(() => {}));
    };
  }, []);
}
