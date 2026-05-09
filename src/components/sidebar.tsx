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
      <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-bg">
        <div className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          Workspace
        </div>
        <div className="px-4 py-2 font-mono text-[13px] text-fg-muted">
          No workspace open.
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-bg">
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {sorted.length === 0 ? (
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

function sortEntries(entries: DirEntry[]): DirEntry[] {
  return [...entries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
