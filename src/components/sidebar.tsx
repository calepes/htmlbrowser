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
        <div className="px-3 py-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
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
      <div className="px-3 pt-3 pb-2 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
        {basename(root)}
      </div>
      <div className="flex-1 overflow-y-auto px-1.5 pb-2">
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
  const indent = { paddingLeft: 6 + depth * 14 };

  if (isDir) {
    const children = entry.children ? sortEntries(entry.children) : [];
    return (
      <li>
        <button
          type="button"
          onClick={() => onToggle(entry.path)}
          className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-fg-muted hover:bg-bg-muted/50 hover:text-fg"
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
          "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors " +
          (isSelected
            ? "bg-bg-muted text-fg"
            : "text-fg-muted hover:bg-bg-muted/50 hover:text-fg")
        }
        style={indent}
      >
        <span className="w-3" />
        <FileIcon />
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
        d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.879a1.5 1.5 0 0 1 1.06.44l.621.62a1.5 1.5 0 0 0 1.06.44H12.5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-fg-subtle"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M4 2.5A1.5 1.5 0 0 1 5.5 1h4.379a1.5 1.5 0 0 1 1.06.44l2.121 2.12a1.5 1.5 0 0 1 .44 1.061V13.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 4 13.5v-11Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="m6.5 9 -1.25 1.25L6.5 11.5M9.5 9l1.25 1.25L9.5 11.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
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

function basename(p: string): string {
  const parts = p.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? p;
}
