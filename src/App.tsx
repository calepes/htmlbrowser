import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Preview } from "@/components/preview";
import { TopBar } from "@/components/topbar";
import { Welcome } from "@/components/welcome";
import { useWorkspaceStore } from "@/store/workspace";
import { useSettingsStore } from "@/store/settings";
import { useFileWatcher } from "@/hooks/use-file-watcher";

export function App() {
  const root = useWorkspaceStore((s) => s.root);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const loadSettings = useSettingsStore((s) => s.loadForWorkspace);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (root) loadSettings(root);
  }, [root, loadSettings]);

  useFileWatcher();

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
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Preview />
        </main>
      </div>
    </div>
  );
}
