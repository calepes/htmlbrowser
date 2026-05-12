import { useEffect, useMemo, useRef, useState } from "react";
import type { DirEntry, SearchMatch, SearchResults } from "@/types";
import { useWorkspaceStore } from "@/store/workspace";
import { searchWorkspace } from "@/lib/tauri";

export function Sidebar() {
  const root = useWorkspaceStore((s) => s.root);
  const entries = useWorkspaceStore((s) => s.entries);
  const selectedFile = useWorkspaceStore((s) => s.selectedFile);
  const expandedDirs = useWorkspaceStore((s) => s.expandedDirs);
  const selectFile = useWorkspaceStore((s) => s.selectFile);
  const toggleDirectory = useWorkspaceStore((s) => s.toggleDirectory);

  const sorted = useMemo(() => sortEntries(entries), [entries]);
  const [query, setQuery] = useState("");

  if (!root) {
    return (
      <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border">
        <div className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          Workspace
        </div>
        <div className="px-4 py-2 font-mono text-[13px] text-fg-muted">
          No workspace open.
        </div>
      </aside>
    );
  }

  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border">
      <div className="px-2 pt-2">
        <SearchInput value={query} onChange={setQuery} />
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
          <div className="px-3 py-4 font-mono text-[13px] text-fg-muted">
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
    </aside>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search HTML…"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className="h-7 w-full rounded-md border border-white/10 bg-white/5 pl-7 pr-7 font-mono text-[12px] text-fg-warm placeholder:text-fg-subtle focus:border-white/20 focus:bg-white/10 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-fg-subtle hover:bg-white/10 hover:text-fg-warm"
        >
          ×
        </button>
      )}
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
      <div className="px-3 py-3 font-mono text-[12px] text-fg-subtle">
        Searching…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="px-3 py-3 font-mono text-[12px] text-warn">
        {state.error}
      </div>
    );
  }

  if (!state.results || state.results.matches.length === 0) {
    return (
      <div className="px-3 py-3 font-mono text-[12px] text-fg-muted">
        No matches.
      </div>
    );
  }

  return (
    <div className="font-mono text-[12px]">
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
                  ? "bg-bg-selected text-fg-warm ring-1 ring-inset ring-border-strong"
                  : "text-fg-warm hover:bg-bg-muted/40")
              }
              title={group.path}
            >
              <CodeFileIcon />
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
                    <span className="shrink-0 text-[10px] text-fg-subtle tabular-nums">
                      {m.lineNumber}
                    </span>
                    <span className="truncate text-[11px]">
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
    <ul className="font-mono text-[13px]">
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
  const indent = { paddingLeft: 8 + depth * 16 };

  if (isDir) {
    const children = entry.children ? sortEntries(entry.children) : [];
    return (
      <li>
        <button
          type="button"
          onClick={() => onToggle(entry.path)}
          className="flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left text-fg-warm hover:bg-bg-muted/40"
          style={indent}
        >
          <ChevronIcon open={isOpen} />
          <FolderIcon />
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
          "flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left transition-colors " +
          (isSelected
            ? "bg-bg-selected text-fg-warm ring-1 ring-inset ring-border-strong"
            : "text-fg-warm hover:bg-bg-muted/40")
        }
        style={indent}
      >
        <span className="w-3" />
        <CodeFileIcon />
        <span className="truncate">{entry.name}</span>
      </button>
    </li>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={
        "h-3 w-3 shrink-0 text-fg-subtle transition-transform " +
        (open ? "rotate-90" : "")
      }
      viewBox="0 0 12 12"
      fill="none"
    >
      <path
        d="M4.5 3l3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-fg-subtle"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M2 4.75A1.75 1.75 0 0 1 3.75 3h2.69a1.75 1.75 0 0 1 1.237.513l.56.56A1.75 1.75 0 0 0 9.474 4.6H12.25A1.75 1.75 0 0 1 14 6.35v5.4A1.75 1.75 0 0 1 12.25 13.5h-8.5A1.75 1.75 0 0 1 2 11.75v-7Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CodeFileIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-fg-subtle"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M3.5 2.75A1.25 1.25 0 0 1 4.75 1.5h4.379a1.25 1.25 0 0 1 .884.366l2.121 2.121a1.25 1.25 0 0 1 .366.884V13.25A1.25 1.25 0 0 1 11.25 14.5h-6.5A1.25 1.25 0 0 1 3.5 13.25V2.75Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="m6.6 8.5-1.1 1.25 1.1 1.25M9.4 8.5l1.1 1.25-1.1 1.25"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none">
      <circle
        cx="6"
        cy="6"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
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
