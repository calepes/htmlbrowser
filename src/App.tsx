import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Preview } from "@/components/preview";
import { TopBar } from "@/components/topbar";
import { Welcome } from "@/components/welcome";
import { useWorkspaceStore } from "@/store/workspace";
import { useSettingsStore } from "@/store/settings";
import { useSidebarStore } from "@/store/sidebar";
import { useFileWatcher } from "@/hooks/use-file-watcher";
import { useUpdaterOnLaunch } from "@/hooks/use-updater";
import { useMenuEvents } from "@/hooks/use-menu-events";

export function App() {
  const root = useWorkspaceStore((s) => s.root);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const loadSettings = useSettingsStore((s) => s.loadForWorkspace);
  const sidebarCollapsed = useSidebarStore((s) => s.collapsed);
  const toggleSidebar = useSidebarStore((s) => s.toggleCollapsed);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (root) loadSettings(root);
  }, [root, loadSettings]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  useFileWatcher();
  useUpdaterOnLaunch();
  useMenuEvents();

  if (!root) {
    return (
      <div className="flex h-full w-full flex-col">
        <TopBar />
        <Welcome />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {!sidebarCollapsed && <Sidebar />}
        <main className="flex-1 overflow-hidden">
          <Preview />
        </main>
      </div>
    </div>
  );
}
