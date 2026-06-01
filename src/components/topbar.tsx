import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openExternalPath } from "@/lib/tauri";
import { useWorkspaceStore } from "@/store/workspace";
import { useSettingsStore } from "@/store/settings";
import { usePreviewStore } from "@/store/preview";
import { useSidebarStore } from "@/store/sidebar";

export function TopBar() {
  const root = useWorkspaceStore((s) => s.root);
  const selectedFile = useWorkspaceStore((s) => s.selectedFile);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const trustMode = useSettingsStore((s) => s.trustMode);
  const setTrustMode = useSettingsStore((s) => s.setTrustMode);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const bumpReload = usePreviewStore((s) => s.bumpReload);
  const viewMode = usePreviewStore((s) => s.viewMode);
  const setViewMode = usePreviewStore((s) => s.setViewMode);
  const sidebarCollapsed = useSidebarStore((s) => s.collapsed);
  const toggleSidebar = useSidebarStore((s) => s.toggleCollapsed);

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
    try {
      await openExternalPath(selectedFile);
    } catch (err) {
      console.error("openExternal failed:", err);
    }
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  function toggleViewMode() {
    setViewMode(viewMode === "web" ? "mobile" : "web");
  }

  // Traffic lights live over this bar when no sidebar is shown.
  const sidebarVisible = !!root && !sidebarCollapsed;
  const leftPadClass = sidebarVisible ? "pl-4" : "pl-24";
  // When the sidebar is visible the topbar lives only over the preview
  // column; a horizontal divider here would clash with the sidebar's
  // seamless top, so drop it in that case.
  const borderClass = sidebarVisible ? "" : "border-b border-border";

  return (
    <div
      data-tauri-drag-region
      className={
        "relative flex h-14 shrink-0 items-center pr-4 " +
        leftPadClass +
        " " +
        borderClass
      }
    >
      {root && sidebarCollapsed && (
        <button
          type="button"
          onClick={toggleSidebar}
          title="Show sidebar (⌘B)"
          aria-label="Show sidebar"
          className="z-10 ml-2 flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg-warm"
        >
          <SidebarIcon collapsed={true} />
        </button>
      )}

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
                : "border-border bg-bg-subtle text-fg-muted hover:bg-bg-muted hover:text-fg-warm")
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
        {root && (
          <IconButton
            onClick={toggleViewMode}
            title={viewMode === "web" ? "Switch to mobile view" : "Switch to web view"}
            label="Toggle view mode"
            active={viewMode === "mobile"}
          >
            {viewMode === "web" ? <PhoneIcon /> : <DesktopIcon />}
          </IconButton>
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
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          label="Toggle theme"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </IconButton>
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
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={label}
      className={
        "flex h-7 w-7 items-center justify-center rounded-md border transition-colors " +
        (active
          ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
          : "border-border bg-bg-subtle text-fg-muted hover:bg-bg-muted hover:text-fg-warm")
      }
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

function SidebarIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 16 16" fill="none">
      <rect
        x="2"
        y="3"
        width="12"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <line
        x1="6"
        y1="3"
        x2="6"
        y2="13"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      {!collapsed && (
        <rect x="2.6" y="3.6" width="3" height="8.8" fill="currentColor" opacity="0.18" />
      )}
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M7 1.5V3M7 11v1.5M1.5 7H3M11 7h1.5M3.4 3.4l1.1 1.1M9.5 9.5l1.1 1.1M3.4 10.6l1.1-1.1M9.5 4.5l1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
      <path
        d="M11.5 9A5 5 0 0 1 5 2.5a5 5 0 1 0 6.5 6.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
      <rect x="3.5" y="1.5" width="7" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7" cy="10.5" r="0.7" fill="currentColor" />
    </svg>
  );
}

function DesktopIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="2.5" width="11" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M4.5 12h5M7 10v2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
