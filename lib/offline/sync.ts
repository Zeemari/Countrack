import type { SupabaseClient } from "@supabase/supabase-js";
import { browserClient } from "../supabase/browser";
import type { QueuedCapture } from "../schemas";
import { listCaptures, updateCapture } from "./queue";

export const MAX_ATTEMPTS = 5;
let running: Promise<void> | null = null;

/** Uploads every pending capture, oldest first. Safe to call often: runs one pass at a time. */
export function syncAll(): Promise<void> {
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}

async function run() {
  if (!navigator.onLine) return;
  const supabase = browserClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  const pending = (await listCaptures())
    .filter((c) => c.status !== "done" && c.attempts < MAX_ATTEMPTS)
    .reverse();
  for (const item of pending) await syncOne(supabase, data.session.user.id, item);
}

async function syncOne(supabase: SupabaseClient, userId: string, item: QueuedCapture) {
  try {
    let photoId = item.photoId;
    if (!photoId) {
      await updateCapture(item.localId, { status: "uploading", error: undefined });
      photoId = await upload(supabase, userId, item);
      await updateCapture(item.localId, { status: "uploaded", photoId });
    }
    await updateCapture(item.localId, { status: "extracting" });
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ photoId }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `Reading failed (${res.status})`);
    }
    await updateCapture(item.localId, { status: "done", error: undefined });
  } catch (e) {
    // Lost the network mid-way: back to the queue without using up an attempt.
    if (!navigator.onLine) return updateCapture(item.localId, { status: "queued" });
    await updateCapture(item.localId, {
      status: "failed",
      attempts: item.attempts + 1,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Uploads the photo file and inserts its row. Idempotent across retries. Returns the photo id. */
async function upload(supabase: SupabaseClient, userId: string, item: QueuedCapture): Promise<string> {
  const path = `${userId}/${item.localId}.jpg`;
  const up = await supabase.storage
    .from("result-photos")
    .upload(path, item.blob, { contentType: "image/jpeg", upsert: false });
  if (up.error && !/exists|duplicate/i.test(up.error.message)) throw up.error;

  const ins = await supabase
    .from("result_photos")
    .insert({ unit_id: item.unitId, user_id: userId, image_url: path, sha256_hash: item.sha256, captured_at: item.capturedAt })
    .select("id")
    .single();
  if (!ins.error) return ins.data.id as string;
  if (ins.error.code !== "23505") throw ins.error; // 23505 = this hash was already inserted on an earlier try

  const existing = await supabase.from("result_photos").select("id").eq("sha256_hash", item.sha256).single();
  if (existing.error) throw existing.error;
  return existing.data.id as string;
}
