"use client";

import { useEffect } from "react";
import { syncAll } from "@/lib/offline/sync";

/** Registers the service worker (production only) and syncs the queue on load, reconnect and refocus. */
export function SyncManager() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js");
    }
    const run = () => void syncAll();
    const onVisible = () => document.visibilityState === "visible" && run();
    run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
