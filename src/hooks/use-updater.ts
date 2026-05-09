import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";

interface UpdateOptions {
  /** Show a dialog when no update is available. Default: false (silent). */
  notifyWhenUpToDate?: boolean;
}

export async function checkForUpdates(opts: UpdateOptions = {}): Promise<void> {
  try {
    const update = await check();
    if (!update) {
      if (opts.notifyWhenUpToDate) {
        await message("You're on the latest version of htmlbrowser.dev.", {
          title: "Up to date",
          kind: "info",
        });
      }
      return;
    }

    const accepted = await ask(
      `Version ${update.version} is available.\n\n${update.body ?? ""}`.trim(),
      {
        title: "Update available",
        kind: "info",
        okLabel: "Install",
        cancelLabel: "Later",
      },
    );
    if (!accepted) return;

    await update.downloadAndInstall();
    await relaunch();
  } catch (err) {
    if (opts.notifyWhenUpToDate) {
      await message(
        `Could not check for updates: ${String(err)}`,
        { title: "Update check failed", kind: "error" },
      );
    } else {
      console.warn("update check failed:", err);
    }
  }
}

/** Run a silent update check once on app launch. */
export function useUpdaterOnLaunch() {
  useEffect(() => {
    // Slight delay so the app feels responsive on first paint before any
    // network call goes out.
    const t = window.setTimeout(() => {
      void checkForUpdates();
    }, 1500);
    return () => window.clearTimeout(t);
  }, []);
}
