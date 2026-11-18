/**
 * SIMULATED DEMO DATA — NOT REAL ELECTION RESULTS.
 * Fictional polling units (SIM-001…005), fictional parties (PA, PB, PC, PD).
 * Run after the migration:  npm run seed
 * Uses the service-role key. Re-running wipes and recreates the SIM-* data.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { DEMO_USERS } from "../lib/demo-users";
import { checkResult, sumScores } from "../lib/rules/checks";
import { computeConsensus } from "../lib/rules/consensus";
import { diffScores } from "../lib/rules/diff";
import type { ExtractedResult, PartyScores, Reading } from "../lib/schemas";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (Supabase → Project Settings → API → service_role key)");

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const PASSWORD = process.env.DEMO_PASSWORD ?? "countrack-demo";
const WARD = "SIM-WARD-01";
const ELECTION_DAY = Date.parse("2026-11-14T15:00:00Z"); // simulated; in the past so captured_at is valid
const minutes = (n: number) => n * 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

const USERS = DEMO_USERS;

/** A self-consistent sheet: total_valid = sum of parties, votes_cast = valid + rejected. */
function sheet(registered: number, accredited: number, rejected: number, party_scores: PartyScores): ExtractedResult {
  const total_valid = sumScores(party_scores);
  return { registered, accredited, rejected, total_valid, votes_cast: total_valid + rejected, party_scores };
}

type SeedUnit = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  wall: ExtractedResult; // what is written on the posted EC8A
  witnesses: number[]; // indexes into USERS
  misread?: Record<number, PartyScores>; // witness index -> party scores the AI misread
  announced?: PartyScores; // collation-sheet line that differs from the wall
};

// Placeholder coordinates: replace with points near the venue for the finder demo.
const UNITS: SeedUnit[] = [
  { code: "SIM-001", name: "Simulated PU 001 – Market Square", lat: 9.0765, lng: 7.3986,
    wall: sheet(812, 344, 9, { PA: 120, PB: 98, PC: 87, PD: 27 }), witnesses: [0, 1] },
  { code: "SIM-002", name: "Simulated PU 002 – Community Hall", lat: 9.079, lng: 7.401,
    wall: sheet(1045, 515, 12, { PA: 210, PB: 155, PC: 101, PD: 34 }), witnesses: [0, 1, 2] },
  // ★ Deliberate mismatch: the wall says PB 142; the collation sheet says 241.
  { code: "SIM-003", name: "Simulated PU 003 – Primary School Gate", lat: 9.074, lng: 7.4032,
    wall: sheet(690, 403, 6, { PA: 131, PB: 142, PC: 98, PD: 26 }), witnesses: [0, 2],
    announced: { PB: 241 } },
  // Only one witness so far: the live demo adds the 2nd photo and the unit turns verified.
  { code: "SIM-004", name: "Simulated PU 004 – Health Centre", lat: 9.0721, lng: 7.3955,
    wall: sheet(760, 301, 5, { PA: 101, PB: 88, PC: 79, PD: 25 }), witnesses: [1] },
  // Witness 2's reading was wrong (PC 90 → 96): readings disagree, so it shows "needs review".
  { code: "SIM-005", name: "Simulated PU 005 – Motor Park", lat: 9.0802, lng: 7.394,
    wall: sheet(905, 377, 7, { PA: 140, PB: 115, PC: 90, PD: 25 }), witnesses: [0, 1],
    misread: { 1: { PC: 96 } } },
];

/** Unwraps a Supabase response or throws with a readable message. */
async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as NonNullable<T>;
}

async function ensureUser(u: (typeof USERS)[number]): Promise<string> {
  const { data } = await db.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { role: u.role },
    user_metadata: { display_name: u.name },
  });
  if (data.user) return data.user.id;
  // Already exists from an earlier run.
  const { data: list, error } = await db.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Error(error.message);
  const found = list.users.find((x) => x.email === u.email);
  if (!found) throw new Error(`Could not create or find ${u.email}`);
  return found.id;
}

/** Renders a mock EC8A as a JPEG. Rotated per witness so each "photo" has different bytes. */
function renderSheet(u: SeedUnit, witness: number): Promise<Buffer> {
  const r = u.wall;
  const rows: [string, number | null][] = [
    ["Registered voters", r.registered],
    ["Accredited voters", r.accredited],
    ...Object.entries(r.party_scores).map(([p, v]): [string, number] => [`Party ${p}`, v]),
    ["Total valid votes", r.total_valid],
    ["Rejected ballots", r.rejected],
    ["Total votes cast", r.votes_cast],
  ];
  const lines = rows
    .map(([k, v], i) => `<text x="60" y="${230 + i * 56}" font-size="34">${k}: <tspan font-weight="bold">${v}</tspan></text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="900" font-family="Arial, Helvetica, sans-serif">
    <rect width="100%" height="100%" fill="#fbfaf4"/>
    <text x="60" y="80" font-size="40" font-weight="bold">MOCK FORM EC8A — SIMULATED</text>
    <text x="60" y="140" font-size="30">${u.code} · ${u.name}</text>${lines}
    <text x="500" y="520" font-size="110" fill="#d00" opacity="0.15" text-anchor="middle"
      transform="rotate(-25 500 520)">SIMULATED</text></svg>`;
  return sharp(Buffer.from(svg))
    .rotate(witness * 2 - 2, { background: "#dddddd" })
    .jpeg({ quality: 80 })
    .toBuffer();
}

async function main() {
  const userIds = await Promise.all(USERS.map(ensureUser));
  // The trigger creates profiles; upsert anyway so roles are right even on re-runs.
  await must(db.from("users").upsert(USERS.map((u, i) => ({ id: userIds[i], role: u.role, display_name: u.name }))));

  const units = await must(
    db
      .from("polling_units")
      .upsert(
        UNITS.map((u) => ({ code: u.code, name: u.name, ward: WARD, lga: "SIM-LGA-01", state: "Simulated State",
                            lat: u.lat, lng: u.lng, is_simulated: true })),
        { onConflict: "code" },
      )
      .select("id, code"),
  );
  const unitId = new Map(units.map((u) => [u.code as string, u.id as string]));
  const ids = [...unitId.values()];

  // Wipe earlier seed runs (child rows cascade).
  await must(db.from("result_photos").delete().in("unit_id", ids));
  await must(db.from("unit_results").delete().in("unit_id", ids));
  await must(db.from("collation_results").delete().eq("area_code", WARD));

  const wardTotal: PartyScores = {};
  for (const u of UNITS) {
    const id = unitId.get(u.code)!;
    const readings: Reading[] = [];

    for (const [n, w] of u.witnesses.entries()) {
      const userId = userIds[w];
      const read: ExtractedResult = { ...u.wall, party_scores: { ...u.wall.party_scores, ...u.misread?.[w] } };
      const jpeg = await renderSheet(u, w);
      const path = `${userId}/seed-${u.code}-${n}.jpg`;
      await must(db.storage.from("result-photos").upload(path, jpeg, { contentType: "image/jpeg", upsert: true }));

      const captured = ELECTION_DAY + minutes(n * 7 + Number(u.code.slice(-1)));
      const photo = await must(
        db
          .from("result_photos")
          .insert({
            unit_id: id,
            user_id: userId,
            image_url: path,
            sha256_hash: createHash("sha256").update(jpeg).digest("hex"),
            hash_verified: true,
            captured_at: iso(captured),
            uploaded_at: iso(captured + minutes(20)),
            sync_status: "extracted",
          })
          .select("id")
          .single(),
      );

      const flags = checkResult(read, { confidence: 0.93 });
      await must(db.from("extracted_results").insert({
        photo_id: photo.id, ...read, check_flags: flags, ai_confidence: 0.93, model: "seed (simulated)",
      }));
      readings.push({ userId, result: read, flags });
    }

    const c = computeConsensus(readings);
    await must(db.from("unit_results").insert({
      unit_id: id,
      status: c.status,
      agreed_scores: c.agreed,
      witness_count: c.witnessCount,
      verified_at: c.status === "verified" ? iso(ELECTION_DAY + minutes(60)) : null,
    }));

    // This unit's line on the simulated ward collation sheet. Matches the wall unless `announced` overrides it.
    const announced = { ...u.wall.party_scores, ...u.announced };
    for (const [p, v] of Object.entries(announced)) wardTotal[p] = (wardTotal[p] ?? 0) + v;
    const col = await must(
      db
        .from("collation_results")
        .insert({ level: "ward", area_code: WARD, unit_id: id, party_scores: announced, source: "EC8B (simulated)",
                  announced_at: iso(ELECTION_DAY + minutes(240)), entered_by: userIds[4] })
        .select("id")
        .single(),
    );

    if (c.status === "verified" && c.agreed) {
      const diffs = diffScores(c.agreed.party_scores, announced).filter((d) => d.difference !== 0);
      if (diffs.length)
        await must(db.from("discrepancies").insert(diffs.map((d) => ({
          unit_id: id, collation_id: col.id, party: d.party,
          wall_votes: d.wall_votes, announced_votes: d.announced_votes,
        }))));
    }
    console.log(`  ${u.code}: ${c.status} (${c.witnessCount} witness${c.witnessCount === 1 ? "" : "es"})`);
  }

  await must(db.from("collation_results").insert({
    level: "ward", area_code: WARD, unit_id: null, party_scores: wardTotal,
    source: "EC8B ward total (simulated)", announced_at: iso(ELECTION_DAY + minutes(245)),
  }));

  console.log(`Seeded 5 SIMULATED units in ${WARD}. Demo logins: ${USERS.map((u) => u.email).join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
