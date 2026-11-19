import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";

/** A feed event id: p-<photo>, r-<result>, d-<discrepancy> or i-<unit>-<incident code>. */
const Body = z.object({ id: z.string().regex(/^(?:[prd]-[0-9a-f-]{36}|i-[0-9a-f-]{36}-[A-Z]{3})$/) });

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Hides one event from the public feed. Requires the admin passcode (ADMIN_DELETE_KEY). */
export async function POST(req: Request) {
  const expected = process.env.ADMIN_DELETE_KEY;
  if (!expected) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const given = req.headers.get("x-admin-key") ?? "";
  // Compare fixed-length digests so the check takes the same time whatever was typed.
  if (!timingSafeEqual(digest(given), digest(expected))) return NextResponse.json({ error: "wrong_key" }, { status: 401 });

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const { error } = await adminClient()
    .from("feed_hidden")
    .upsert({ event_id: body.data.id, hidden_at: new Date().toISOString() }, { onConflict: "event_id" });
  if (error) {
    console.error("feed hide failed", error.message);
    // PGRST205 / 42P01: the feed_hidden migration hasn't been run on this database yet.
    const missing = error.code === "PGRST205" || error.code === "42P01";
    return NextResponse.json({ error: missing ? "not_migrated" : "failed" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
