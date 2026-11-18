/**
 * Saves an uploaded photo's real model reading as a DEMO_MODE fixture.
 * Usage: npm run fixture -- <photoId>
 * Rehearsal flow: upload the demo photo once (real model call) → record → `npm run seed` to clear it
 * → on stage, pick the same photo from the gallery → instant cached reading.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const FILE = "lib/vision/fixtures.json";
const photoId = process.argv[2];
if (!photoId) throw new Error("Usage: npm run fixture -- <photoId>");

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function main() {
  const { data, error } = await db
    .from("result_photos")
    .select("sha256_hash, extracted_results(raw)")
    .eq("id", photoId)
    .single();
  if (error) throw new Error(error.message);
  const er = data.extracted_results as { raw: unknown } | { raw: unknown }[] | null;
  const raw = Array.isArray(er) ? er[0]?.raw : er?.raw;
  if (!raw) throw new Error("That photo has no model reading yet");

  const fixtures = JSON.parse(readFileSync(FILE, "utf8")) as Record<string, unknown>;
  fixtures[data.sha256_hash as string] = raw;
  writeFileSync(FILE, JSON.stringify(fixtures, null, 2) + "\n");
  console.log(`Saved fixture for ${data.sha256_hash}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
