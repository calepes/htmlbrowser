import { useMemo } from "react";
import type { DirEntry } from "@/types";
import { useWorkspaceStore } from "@/store/workspace";

export function Sidebar() {
  const root = useWorkspaceStore((s) => s.root);
  const entries = useWorkspaceStore((s) => s.entries);
  const selectedFile = useWorkspaceStore((s) => s.selectedFile);
  const expandedDirs = useWorkspaceStore((s) => s.expandedDirs);
  const selectFile = useWorkspaceStore((s) => s.selectFile);
  const toggleDirectory = useWorkspaceStore((s) => s.toggleDirectory);

  const sorted = useMemo(() => sortEntries(entries), [entries]);

  if (!root) {
    return (
      <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-bg-subtle">
        <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
          Workspace
        </div>
        <div className="px-3 py-2 text-sm text-fg-muted">
          No workspace open.
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-bg-subtle">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
        <span className="truncate" title={root}>
          {basename(root)}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-1 pb-2">
        {sorted.length === 0 ? (
          <div className="px-3 py-4 text-sm text-fg-muted">
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
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}) {
  return (
    <ul className="text-sm">
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
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}) {
  const isDir = entry.kind === "directory";
  const isOpen = expanded.has(entry.path);
  const isSelected = !isDir && selected === entry.path;
  const indent = { paddingLeft: 8 + depth * 12 };

  if (isDir) {
    const children = entry.children ? sortEntries(entry.children) : [];
    return (
      <li>
        <button
          type="button"
          onClick={() => onToggle(entry.path)}
          className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-fg-muted hover:bg-bg-muted hover:text-fg"
          style={indent}
        >
          <span className="w-3 text-fg-subtle">{isOpen ? "▾" : "▸"}</span>
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
          "flex w-full items-center gap-1 rounded px-1 py-0.5 text-left " +
          (isSelected
            ? "bg-accent/20 text-fg"
            : "text-fg-muted hover:bg-bg-muted hover:text-fg")
        }
        style={indent}
      >
        <span className="w-3" />
        <span className="truncate">{entry.name}</span>
      </button>
    </li>
  );
}

function sortEntries(entries: DirEntry[]): DirEntry[] {
  return [...entries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function basename(p: string): string {
  const parts = p.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? p;
}
