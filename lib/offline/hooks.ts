"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { QueuedCapture } from "../schemas";
import { listCaptures, queueEvents } from "./queue";

/** Live list of queued captures (newest first). */
export function useCaptures(): QueuedCapture[] | null {
  const [items, setItems] = useState<QueuedCapture[] | null>(null);
  useEffect(() => {
    const load = () => void listCaptures().then(setItems);
    load();
    queueEvents.addEventListener("change", load);
    return () => queueEvents.removeEventListener("change", load);
  }, []);
  return items;
}

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export const useOnline = () =>
  useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
