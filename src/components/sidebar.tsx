import { useEffect, useMemo, useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { DirEntry, SearchMatch, SearchResults } from "@/types";
import { useWorkspaceStore } from "@/store/workspace";
import { useSidebarStore } from "@/store/sidebar";
import { searchWorkspace } from "@/lib/tauri";
import { checkForUpdates } from "@/hooks/use-updater";

export function Sidebar() {
  const root = useWorkspaceStore((s) => s.root);
  const entries = useWorkspaceStore((s) => s.entries);
  const selectedFile = useWorkspaceStore((s) => s.selectedFile);
  const expandedDirs = useWorkspaceStore((s) => s.expandedDirs);
  const selectFile = useWorkspaceStore((s) => s.selectFile);
  const toggleDirectory = useWorkspaceStore((s) => s.toggleDirectory);
  const width = useSidebarStore((s) => s.width);

  const sorted = useMemo(() => sortEntries(entries), [entries]);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ⌘P focuses the search input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key === "p") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!root) {
    return (
      <aside
        style={{ width }}
        className="relative flex h-full shrink-0 flex-col border-r border-border bg-bg-subtle"
      >
        <SidebarHeader />
        <div className="px-4 py-2 text-[13px] text-fg-muted">
          No workspace open.
        </div>
        <ResizeHandle />
      </aside>
    );
  }

  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;

  return (
    <aside
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col border-r border-border bg-bg-subtle"
    >
      <SidebarHeader />
      <div className="px-3 pb-2">
        <SearchInput
          inputRef={inputRef}
          value={query}
          onChange={setQuery}
        />
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isSearching ? (
          <SearchPanel
            root={root}
            query={trimmed}
            selected={selectedFile}
            onSelect={selectFile}
          />
        ) : sorted.length === 0 ? (
          <div className="px-3 py-4 text-[13px] text-fg-muted">
            No HTML files found.
          </div>
        ) : (
          <Tree
            entries={sorted}
            depth={0}
            expanded={expandedDirs}
            selected={selectedFile}
            onSelect={selectFile}
            onToggle={toggleDirectory}
          />
        )}
      </div>
      <WorkspaceFooter root={root} />
      <ResizeHandle />
    </aside>
  );
}

function SidebarHeader() {
  const toggleSidebar = useSidebarStore((s) => s.toggleCollapsed);
  return (
    <div
      data-tauri-drag-region
      className="relative flex h-14 shrink-0 items-center justify-end pl-20 pr-3"
    >
      <button
        type="button"
        onClick={toggleSidebar}
        title="Hide sidebar (⌘B)"
        aria-label="Hide sidebar"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-warm transition-colors hover:bg-bg-subtle"
      >
        <SidebarIcon collapsed={false} />
      </button>
    </div>
  );
}

function WorkspaceFooter({ root }: { root: string | null }) {
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const recents = useWorkspaceStore((s) => s.recentWorkspaces);
  const removeRecent = useWorkspaceStore((s) => s.removeRecent);

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function pickFolder() {
    setOpen(false);
    const picked = await openDialog({ directory: true, multiple: false });
    if (typeof picked === "string") {
      await openWorkspace(picked);
    }
  }

  async function chooseRecent(p: string) {
    setOpen(false);
    await openWorkspace(p);
  }

  async function onCheckUpdates() {
    setOpen(false);
    await checkForUpdates({ notifyWhenUpToDate: true });
  }

  const otherRecents = root ? recents.filter((p) => p !== root) : recents;
  const label = root ? basename(root) : "No workspace";

  return (
    <div className="relative shrink-0 border-t border-border px-2 pt-1.5 pb-3">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-fg-warm transition-colors hover:bg-bg-subtle"
      >
        <SmallFolderIcon />
        <span className="min-w-0 flex-1 truncate" title={root ?? undefined}>
          {label}
        </span>
        <ChevronDownIcon
          className={
            "h-3 w-3 shrink-0 text-fg-subtle transition-transform " +
            (open ? "" : "rotate-180")
          }
        />
      </button>
      {open && (
        <div
          ref={popupRef}
          className="absolute bottom-full left-2 right-2 z-50 mb-1 rounded-lg border border-border bg-bg-subtle/95 p-1 shadow-2xl backdrop-blur-md"
        >
          {root && (
            <>
              <div className="px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-fg-subtle">
                  Current
                </div>
                <div
                  className="mt-1 truncate text-[12px] text-fg-warm"
                  title={root}
                >
                  {root}
                </div>
              </div>
              <div className="my-1 h-px bg-border" />
            </>
          )}
          {otherRecents.length > 0 && (
            <>
              <div className="px-3 pt-1 pb-1.5 text-[10px] uppercase tracking-wider text-fg-subtle">
                Recent
              </div>
              <ul>
                {otherRecents.map((p) => (
                  <li key={p} className="group flex items-center">
                    <button
                      type="button"
                      onClick={() => chooseRecent(p)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-left text-[13px] text-fg-warm hover:bg-bg-muted"
                      title={p}
                    >
                      <SmallFolderIcon />
                      <span className="min-w-0 flex-1 truncate">
                        {basename(p)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecent(p);
                      }}
                      aria-label="Remove from recents"
                      className="mr-1 hidden h-6 w-6 items-center justify-center rounded-md text-fg-subtle hover:bg-bg-muted hover:text-fg-warm group-hover:flex"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <div className="my-1 h-px bg-border" />
            </>
          )}
          <button
            type="button"
            onClick={pickFolder}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-fg-warm hover:bg-bg-muted"
          >
            <PlusIcon />
            Open folder…
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={onCheckUpdates}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-fg-muted hover:bg-bg-muted hover:text-fg-warm"
          >
            Check for updates…
          </button>
        </div>
      )}
    </div>
  );
}

function basename(p: string): string {
  const parts = p.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? p;
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

function SmallFolderIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-fg-subtle"
      viewBox="0 0 14 14"
      fill="none"
    >
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
    <svg
      className="h-3.5 w-3.5 shrink-0 text-fg-subtle"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path
        d="M7 2.5v9M2.5 7h9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchInput({
  inputRef,
  value,
  onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
}) {
  const hasValue = value.length > 0;
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className="h-8 w-full rounded-lg border border-border bg-bg-subtle pl-8 pr-12 text-[13px] text-fg-warm placeholder:text-fg-subtle focus:border-border-strong focus:bg-bg-muted focus:outline-none"
      />
      {hasValue ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-fg-subtle hover:bg-bg-muted hover:text-fg-warm"
        >
          ×
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-bg-subtle px-1.5 py-0.5 font-sans text-[10px] text-fg-subtle">
          ⌘P
        </kbd>
      )}
    </div>
  );
}

function ResizeHandle() {
  const width = useSidebarStore((s) => s.width);
  const setWidth = useSidebarStore((s) => s.setWidth);
  const resetWidth = useSidebarStore((s) => s.resetWidth);

  const startXRef = useRef(0);
  const startWidthRef = useRef(width);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active) return;
    function onMove(e: MouseEvent) {
      const delta = e.clientX - startXRef.current;
      setWidth(startWidthRef.current + delta);
    }
    function onUp() {
      setActive(false);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [active, setWidth]);

  useEffect(() => {
    if (active) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [active]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        startXRef.current = e.clientX;
        startWidthRef.current = width;
        setActive(true);
        e.preventDefault();
      }}
      onDoubleClick={() => resetWidth()}
      className="group absolute right-0 top-0 z-10 h-full w-1.5 -mr-[3px] cursor-col-resize"
    >
      <div
        className={
          "absolute right-[3px] top-0 h-full w-px transition-colors " +
          (active ? "bg-accent/70" : "bg-transparent group-hover:bg-border-strong")
        }
      />
    </div>
  );
}

interface SearchState {
  status: "idle" | "loading" | "done" | "error";
  results: SearchResults | null;
  error: string | null;
  query: string;
}

function SearchPanel({
  root,
  query,
  selected,
  onSelect,
}: {
  root: string;
  query: string;
  selected: string | null;
  onSelect: (path: string) => void | Promise<void>;
}) {
  const [state, setState] = useState<SearchState>({
    status: "idle",
    results: null,
    error: null,
    query: "",
  });
  const reqIdRef = useRef(0);

  useEffect(() => {
    const id = ++reqIdRef.current;
    setState((prev) => ({ ...prev, status: "loading" }));
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchWorkspace(root, query);
        if (reqIdRef.current !== id) return;
        setState({ status: "done", results, error: null, query });
      } catch (err) {
        if (reqIdRef.current !== id) return;
        setState({
          status: "error",
          results: null,
          error: err instanceof Error ? err.message : String(err),
          query,
        });
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [root, query]);

  const grouped = useMemo(() => {
    if (!state.results) return [];
    return groupByFile(state.results.matches);
  }, [state.results]);

  if (state.status === "loading" && !state.results) {
    return (
      <div className="px-3 py-3 text-[12px] text-fg-subtle">Searching…</div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="px-3 py-3 text-[12px] text-warn">{state.error}</div>
    );
  }

  if (!state.results || state.results.matches.length === 0) {
    return (
      <div className="px-3 py-3 text-[12px] text-fg-muted">No matches.</div>
    );
  }

  return (
    <div className="text-[12px]">
      <div className="px-3 pb-2 text-[10px] uppercase tracking-wider text-fg-subtle">
        {state.results.matches.length} match
        {state.results.matches.length === 1 ? "" : "es"} in {grouped.length} file
        {grouped.length === 1 ? "" : "s"}
        {state.results.truncated ? " (truncated)" : ""}
      </div>
      <ul className="space-y-2">
        {grouped.map((group) => (
          <li key={group.path}>
            <button
              type="button"
              onClick={() => onSelect(group.path)}
              className={
                "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors " +
                (selected === group.path
                  ? "bg-bg-selected text-fg-warm"
                  : "text-fg-warm hover:bg-bg-muted/40")
              }
              title={group.path}
            >
              <FileIcon />
              <span className="flex-1 truncate">{group.name}</span>
              <span className="shrink-0 text-[10px] text-fg-subtle">
                {group.matches.length}
              </span>
            </button>
            <ul className="mt-0.5 space-y-px">
              {group.matches.map((m, i) => (
                <li key={`${m.lineNumber}-${i}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(group.path)}
                    className="flex w-full items-baseline gap-2 rounded-md px-2 py-0.5 text-left text-fg-muted hover:bg-bg-muted/40"
                    title={`Line ${m.lineNumber}`}
                  >
                    <span className="shrink-0 font-mono text-[10px] text-fg-subtle tabular-nums">
                      {m.lineNumber}
                    </span>
                    <span className="truncate font-mono text-[11px]">
                      <span className="text-fg-subtle">{m.before}</span>
                      <span className="rounded bg-accent/25 px-0.5 text-fg-warm">
                        {m.hit}
                      </span>
                      <span className="text-fg-subtle">{m.after}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface FileGroup {
  path: string;
  name: string;
  matches: SearchMatch[];
}

function groupByFile(matches: SearchMatch[]): FileGroup[] {
  const map = new Map<string, FileGroup>();
  for (const m of matches) {
    let g = map.get(m.path);
    if (!g) {
      g = { path: m.path, name: m.name, matches: [] };
      map.set(m.path, g);
    }
    g.matches.push(m);
  }
  return Array.from(map.values());
}

function Tree({
  entries,
  depth,
  expanded,
  selected,
  onSelect,
  onToggle,
}: {
  entries: DirEntry[];
  depth: number;
  expanded: Set<string>;
  selected: string | null;
  onSelect: (path: string) => void | Promise<void>;
  onToggle: (path: string) => void;
}) {
  return (
    <ul className="text-[13px]">
      {entries.map((entry) => (
        <TreeNode
          key={entry.path}
          entry={entry}
          depth={depth}
          expanded={expanded}
          selected={selected}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
}

function TreeNode({
  entry,
  depth,
  expanded,
  selected,
  onSelect,
  onToggle,
}: {
  entry: DirEntry;
  depth: number;
  expanded: Set<string>;
  selected: string | null;
  onSelect: (path: string) => void | Promise<void>;
  onToggle: (path: string) => void;
}) {
  const isDir = entry.kind === "directory";
  const isOpen = expanded.has(entry.path);
  const isSelected = !isDir && selected === entry.path;
  const indent = { paddingLeft: 8 + depth * 14 };

  if (isDir) {
    const children = entry.children ? sortEntries(entry.children) : [];
    return (
      <li>
        <button
          type="button"
          onClick={() => onToggle(entry.path)}
          className="flex w-full items-center gap-2 rounded-md py-[5px] pr-2 text-left text-fg-warm hover:bg-bg-muted/40"
          style={indent}
        >
          {isOpen ? <FolderOpenIcon /> : <FolderIcon />}
          <span className="truncate">{entry.name}</span>
        </button>
        {isOpen && children.length > 0 && (
          <Tree
            entries={children}
            depth={depth + 1}
            expanded={expanded}
            selected={selected}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        )}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(entry.path)}
        className={
          "flex w-full items-center gap-2 rounded-md py-[5px] pr-2 text-left transition-colors " +
          (isSelected
            ? "bg-bg-selected font-medium text-fg-warm"
            : "text-fg-warm hover:bg-bg-muted/40")
        }
        style={indent}
      >
        <FileIcon />
        <span className="truncate">{entry.name}</span>
      </button>
    </li>
  );
}

function FolderIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-fg-subtle"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M2 5a1.5 1.5 0 0 1 1.5-1.5h2.34a1.5 1.5 0 0 1 1.06.44l.56.56a1.5 1.5 0 0 0 1.06.44h3.98A1.5 1.5 0 0 1 14 6.44V11.5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5V5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FolderOpenIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-fg-subtle"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M2 5a1.5 1.5 0 0 1 1.5-1.5h2.34a1.5 1.5 0 0 1 1.06.44l.56.56a1.5 1.5 0 0 0 1.06.44h3.98A1.5 1.5 0 0 1 14 6.44V7.25H2V5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M1.4 7.25h13.2l-1.18 4.42A1.5 1.5 0 0 1 11.97 13H4.03a1.5 1.5 0 0 1-1.45-1.12L1.4 7.25Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-fg-subtle"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M4 2.5h5l3 3v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M9 2.5v3h3"
        stroke="currentColor"
        strokeWidth="1.2"
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
        <rect
          x="2.6"
          y="3.6"
          width="3"
          height="8.8"
          fill="currentColor"
          opacity="0.18"
        />
      )}
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="m8.6 8.6 3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function sortEntries(entries: DirEntry[]): DirEntry[] {
  return [...entries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
