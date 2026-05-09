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

  const title = root ? basename(root) : "htmlbrowser.dev";

  return (
    <div
      data-tauri-drag-region
      className="relative flex h-11 shrink-0 items-center border-b border-border bg-bg pl-20 pr-3"
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-[13px] tracking-tight text-fg">
          {title}
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {root && (
          <div className="flex items-center gap-1.5 px-2 text-[11px] font-mono uppercase tracking-wider text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgb(var(--accent))]" />
            Live
          </div>
        )}
        {root && (
          <button
            type="button"
            onClick={toggleTrust}
            className={
              "rounded-md border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider transition-colors " +
              (trustMode === "trusted"
                ? "border-warn/40 bg-warn/10 text-warn"
                : "border-border bg-bg-subtle text-fg-muted hover:bg-bg-muted hover:text-fg")
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
            <IconButton
              onClick={() => bumpReload()}
              title="Reload preview"
              label="Reload"
            >
              <ReloadIcon />
            </IconButton>
            <IconButton
              onClick={openExternal}
              title="Open in default browser"
              label="Open externally"
            >
              <ExternalIcon />
            </IconButton>
          </>
        )}
        <IconButton
          onClick={pickFolder}
          title="Open folder"
          label="Open folder"
        >
          <FolderIcon />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-bg-subtle text-fg-muted hover:bg-bg-muted hover:text-fg"
    >
      {children}
    </button>
  );
}

function ReloadIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
      <path
        d="M11.5 2.5v3h-3M2.5 11.5v-3h3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.13 5.5A4.5 4.5 0 0 0 3 6.5M2.87 8.5A4.5 4.5 0 0 0 11 7.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
      <path
        d="M5 3H3v8h8V9M8 3h3v3M11 3 6 8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
      <path
        d="M1.5 4A1 1 0 0 1 2.5 3h2.382a1 1 0 0 1 .707.293l.618.618A1 1 0 0 0 6.914 4.2H11a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1V4Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function basename(p: string): string {
  const parts = p.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? p;
}
