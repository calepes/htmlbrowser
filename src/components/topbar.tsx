import { useEffect, useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { useWorkspaceStore } from "@/store/workspace";
import { useSettingsStore } from "@/store/settings";
import { usePreviewStore } from "@/store/preview";

export function TopBar() {
  const root = useWorkspaceStore((s) => s.root);
  const selectedFile = useWorkspaceStore((s) => s.selectedFile);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const recentWorkspaces = useWorkspaceStore((s) => s.recentWorkspaces);
  const removeRecent = useWorkspaceStore((s) => s.removeRecent);
  const trustMode = useSettingsStore((s) => s.trustMode);
  const setTrustMode = useSettingsStore((s) => s.setTrustMode);
  const bumpReload = usePreviewStore((s) => s.bumpReload);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  async function pickFolder() {
    setMenuOpen(false);
    const picked = await openDialog({ directory: true, multiple: false });
    if (typeof picked === "string") {
      await openWorkspace(picked);
    }
  }

  async function chooseRecent(path: string) {
    setMenuOpen(false);
    await openWorkspace(path);
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
  const otherRecents = recentWorkspaces.filter((p) => p !== root);

  return (
    <div
      data-tauri-drag-region
      className="relative flex h-14 shrink-0 items-center border-b border-border pl-24 pr-4"
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="pointer-events-auto relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[13px] tracking-tight text-fg-warm transition-colors hover:bg-white/5"
          >
            <span className="truncate max-w-[260px]">{title}</span>
            <ChevronDownIcon
              className={
                "h-3 w-3 text-fg-subtle transition-transform " +
                (menuOpen ? "rotate-180" : "")
              }
            />
          </button>
          {menuOpen && (
            <WorkspaceMenu
              currentRoot={root}
              recents={otherRecents}
              onChoose={chooseRecent}
              onPick={pickFolder}
              onRemove={(p) => removeRecent(p)}
            />
          )}
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {root && (
          <div className="flex items-center gap-1.5 px-2 font-mono text-[11px] uppercase tracking-wider text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgb(var(--accent))]" />
            Live
          </div>
        )}
        {root && (
          <button
            type="button"
            onClick={toggleTrust}
            className={
              "rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors " +
              (trustMode === "trusted"
                ? "border-warn/40 bg-warn/15 text-warn hover:bg-warn/25"
                : "border-white/10 bg-white/5 text-fg-muted hover:bg-white/10 hover:text-fg-warm")
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

function WorkspaceMenu({
  currentRoot,
  recents,
  onChoose,
  onPick,
  onRemove,
}: {
  currentRoot: string | null;
  recents: string[];
  onChoose: (path: string) => void;
  onPick: () => void;
  onRemove: (path: string) => void;
}) {
  return (
    <div className="absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 rounded-lg border border-white/10 bg-bg-subtle/95 p-1 shadow-2xl backdrop-blur-md">
      {currentRoot && (
        <>
          <div className="px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              Current
            </div>
            <div className="mt-1 truncate text-[12px] text-fg-warm">
              {currentRoot}
            </div>
          </div>
          <div className="my-1 h-px bg-white/5" />
        </>
      )}
      {recents.length > 0 && (
        <>
          <div className="px-3 pt-1 pb-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            Recent
          </div>
          <ul>
            {recents.map((p) => (
              <li key={p} className="group flex items-center">
                <button
                  type="button"
                  onClick={() => onChoose(p)}
                  className="flex flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-left text-[13px] text-fg-warm hover:bg-white/5"
                  title={p}
                >
                  <FolderIcon />
                  <span className="flex-1 truncate">{basename(p)}</span>
                  <span className="truncate text-[11px] text-fg-subtle max-w-[120px]">
                    {dirname(p)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(p);
                  }}
                  aria-label="Remove from recents"
                  className="mr-1 hidden h-6 w-6 items-center justify-center rounded-md text-fg-subtle hover:bg-white/10 hover:text-fg-warm group-hover:flex"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="my-1 h-px bg-white/5" />
        </>
      )}
      <button
        type="button"
        onClick={onPick}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-fg-warm hover:bg-white/5"
      >
        <PlusIcon />
        Open folder…
      </button>
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
      className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-fg-muted transition-colors hover:bg-white/10 hover:text-fg-warm"
    >
      {children}
    </button>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none">
      <path
        d="m3 4.5 3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
    <svg className="h-3.5 w-3.5 shrink-0 text-fg-subtle" viewBox="0 0 14 14" fill="none">
      <path
        d="M1.5 4A1 1 0 0 1 2.5 3h2.382a1 1 0 0 1 .707.293l.618.618A1 1 0 0 0 6.914 4.2H11a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1V4Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-fg-subtle" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 2.5v9M2.5 7h9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function basename(p: string): string {
  const parts = p.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

function dirname(p: string): string {
  const parts = p.split("/").filter(Boolean);
  return "/" + parts.slice(0, -1).join("/");
}
