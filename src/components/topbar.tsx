import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { useWorkspaceStore } from "@/store/workspace";
import { useSettingsStore } from "@/store/settings";
import { usePreviewStore } from "@/store/preview";

export function TopBar() {
  const root = useWorkspaceStore((s) => s.root);
  const selectedFile = useWorkspaceStore((s) => s.selectedFile);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const trustMode = useSettingsStore((s) => s.trustMode);
  const setTrustMode = useSettingsStore((s) => s.setTrustMode);
  const bumpReload = usePreviewStore((s) => s.bumpReload);

  async function pickFolder() {
    const picked = await openDialog({ directory: true, multiple: false });
    if (typeof picked === "string") {
      await openWorkspace(picked);
    }
  }

  async function toggleTrust() {
    if (!root) return;
    await setTrustMode(root, trustMode === "safe" ? "trusted" : "safe");
    bumpReload();
  }

  async function openExternal() {
    if (!selectedFile) return;
    await openPath(selectedFile);
  }

  return (
    <div
      data-tauri-drag-region
      className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-bg-subtle px-3 pl-20"
    >
      <span className="truncate text-sm font-medium text-fg">
        {root ? basename(root) : "htmlbrowser.dev"}
      </span>
      <div className="flex-1" />
      <button
        type="button"
        onClick={pickFolder}
        className="rounded-md border border-border bg-bg-muted px-2.5 py-1 text-xs text-fg-muted hover:bg-bg-muted/70 hover:text-fg"
      >
        Open Folder
      </button>
      {root && (
        <button
          type="button"
          onClick={toggleTrust}
          className={
            "rounded-md border px-2.5 py-1 text-xs " +
            (trustMode === "trusted"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
              : "border-border bg-bg-muted text-fg-muted hover:text-fg")
          }
          title={
            trustMode === "trusted"
              ? "Trusted: JS, network, and remote assets allowed"
              : "Safe: HTML rendered without JS, network, or remote assets"
          }
        >
          {trustMode === "trusted" ? "Trusted" : "Safe"}
        </button>
      )}
      {selectedFile && (
        <>
          <button
            type="button"
            onClick={() => bumpReload()}
            className="rounded-md border border-border bg-bg-muted px-2.5 py-1 text-xs text-fg-muted hover:text-fg"
            title="Reload preview"
          >
            Reload
          </button>
          <button
            type="button"
            onClick={openExternal}
            className="rounded-md border border-border bg-bg-muted px-2.5 py-1 text-xs text-fg-muted hover:text-fg"
            title="Open in default browser"
          >
            Open in Browser
          </button>
        </>
      )}
    </div>
  );
}

function basename(p: string): string {
  const parts = p.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? p;
}
