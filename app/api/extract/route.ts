import { NextResponse } from "next/server";
import { sha256Hex } from "@/lib/hash";
import { checkResult } from "@/lib/rules/checks";
import { ExtractRequest } from "@/lib/schemas";
import { recomputeUnit } from "@/lib/server/recompute";
import { adminClient } from "@/lib/supabase/admin";
import { userClient } from "@/lib/supabase/server";
import { ExtractionError, VISION_MODEL, extractFromImage } from "@/lib/vision/extract";
import { demoFixture } from "@/lib/vision/fixtures";
import { fromVision } from "@/lib/vision/map";

export const maxDuration = 60;

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/** Photo → server re-hash → vision model → zod → rule checks → save → recompute unit status. */
export async function POST(req: Request) {
  const body = ExtractRequest.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Invalid request", 400);

  const { data: { user } } = await (await userClient()).auth.getUser();
  if (!user) return fail("Sign in first", 401);

  const admin = adminClient();
  const { data: photo } = await admin
    .from("result_photos")
    .select("id, unit_id, user_id, image_url, sha256_hash")
    .eq("id", body.data.photoId)
    .maybeSingle();
  if (!photo) return fail("Photo not found", 404);
  if (photo.user_id !== user.id) return fail("Not your photo", 403);

  // Idempotent: a retry after a dropped response just returns the existing reading.
  const { data: existing } = await admin.from("extracted_results").select("id").eq("photo_id", photo.id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, photoId: photo.id });

  await admin.from("result_photos").update({ sync_status: "extracting" }).eq("id", photo.id);
  try {
    const file = await admin.storage.from("result-photos").download(photo.image_url);
    if (file.error) throw new Error(file.error.message);
    const bytes = await file.data.arrayBuffer();
    const hashVerified = (await sha256Hex(bytes)) === photo.sha256_hash;
    await admin.from("result_photos").update({ hash_verified: hashVerified }).eq("id", photo.id);

    const fixture = demoFixture(photo.sha256_hash);
    const vision = fixture ?? (await extractFromImage(Buffer.from(bytes).toString("base64")));
    const { result, meta } = fromVision(vision);
    const flags = checkResult(result, meta);

    const ins = await admin.from("extracted_results").insert({
      photo_id: photo.id,
      ...result,
      check_flags: flags,
      ai_confidence: Math.round(vision.confidence * 100) / 100,
      model: fixture ? `${VISION_MODEL} (demo fixture)` : VISION_MODEL,
      raw: vision,
    });
    if (ins.error) throw new Error(ins.error.message);
    await admin.from("result_photos").update({ sync_status: "extracted" }).eq("id", photo.id);

    const unit = await recomputeUnit(photo.unit_id);
    return NextResponse.json({ ok: true, photoId: photo.id, hashVerified, unitStatus: unit.status });
  } catch (e) {
    await admin.from("result_photos").update({ sync_status: "failed" }).eq("id", photo.id);
    console.error("extract failed", e);
    const message = e instanceof ExtractionError ? e.message : "Couldn't read this photo right now. It will retry.";
    return fail(message, 502);
  }
}
