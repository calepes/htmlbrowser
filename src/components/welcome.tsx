import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useWorkspaceStore } from "@/store/workspace";

export function Welcome() {
  const recents = useWorkspaceStore((s) => s.recentWorkspaces);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const removeRecent = useWorkspaceStore((s) => s.removeRecent);

  async function pickFolder() {
    const picked = await openDialog({ directory: true, multiple: false });
    if (typeof picked === "string") {
      await openWorkspace(picked);
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-bg">
      <div className="w-full max-w-md px-8">
        <div className="mb-1 text-xl font-semibold tracking-tight text-fg">
          htmlbrowser.dev
        </div>
        <div className="mb-6 text-sm text-fg-muted">
          Local-first viewer for AI-generated HTML artifacts.
        </div>
        <button
          type="button"
          onClick={pickFolder}
          className="mb-8 w-full rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-fg hover:bg-bg-muted"
        >
          Open Folder…
        </button>
        {recents.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
              Recent
            </div>
            <ul className="space-y-1">
              {recents.map((path) => (
                <li
                  key={path}
                  className="group flex items-center gap-2 rounded-md px-2 py-1 hover:bg-bg-subtle"
                >
                  <button
                    type="button"
                    onClick={() => openWorkspace(path)}
                    className="flex-1 truncate text-left text-sm text-fg-muted hover:text-fg"
                    title={path}
                  >
                    <span className="text-fg">{basename(path)}</span>
                    <span className="ml-2 text-xs text-fg-subtle">
                      {dirname(path)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRecent(path)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-fg-subtle hover:text-fg"
                    aria-label="Remove from recents"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
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
