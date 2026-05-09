import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore } from "@/store/workspace";
import { useSettingsStore } from "@/store/settings";
import { usePreviewStore } from "@/store/preview";

const PREVIEW_LABEL = "preview";

export function Preview() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedFile = useWorkspaceStore((s) => s.selectedFile);
  const trustMode = useSettingsStore((s) => s.trustMode);
  const reloadToken = usePreviewStore((s) => s.reloadToken);

  // Keep the embedded webview's bounds matched to the container.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      void invoke("update_preview_bounds", {
        label: PREVIEW_LABEL,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, []);

  // Load / reload preview content when the selection, trust, or token changes.
  useEffect(() => {
    void invoke("show_preview", {
      label: PREVIEW_LABEL,
      file: selectedFile,
      trust: trustMode,
      token: reloadToken,
    });
  }, [selectedFile, trustMode, reloadToken]);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-bg">
      {!selectedFile && (
        <div className="flex h-full w-full items-center justify-center text-fg-subtle">
          <div className="text-center">
            <div className="text-sm">Select a file to preview</div>
            <div className="mt-1 text-xs text-fg-subtle/80">
              Sidebar shows .html and .htm files in your workspace
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
