# CounTrack

Witnesses photograph the result sheet (Form EC8A) posted at a polling unit. CounTrack hashes and
timestamps each photo, reads the numbers with a vision model, checks them with plain rules,
verifies a unit when 2+ independent witnesses agree, and shows where announced figures
don't match the wall.

**AI reads · rules check · people confirm.** The app never accuses anyone: it reports that records don't match.

> ⚠️ All demo data (units, parties PA–PD, results, collation figures) is **SIMULATED**.

## Setup

1. `npm install`
2. Create a Supabase project. Copy `.env.local.example` to `.env` and fill in the URL and keys (including `SUPABASE_SERVICE_ROLE_KEY`, which the seed script needs).
3. Supabase dashboard → **SQL Editor** → paste and run `supabase/migrations/20261118000000_init.sql`.
4. `npm run seed`: creates 5 demo accounts and 5 simulated polling units.
5. `npm run dev` → http://localhost:3000

**Supabase dashboard settings:** Authentication → Sign In / Providers → enable **Anonymous sign-ins** (for "Continue anonymously").

**Phones need HTTPS** (camera and hashing require a secure context). Use the Vercel URL, or `npx next dev --experimental-https` on the same Wi-Fi.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Rule-engine tests (checks, consensus, diff) |
| `npm run typecheck` | TypeScript check |
| `npm run seed` | (Re)create simulated demo data |
| `npm run icons` | Regenerate PWA PNG icons from `public/icons/icon.svg` |
| `npm run fixture -- <photoId>` | Save a real reading as a `DEMO_MODE` cached fixture |

## How the core flow works

1. **Capture** (`/capture`): photo → compressed JPEG (EXIF stripped) → SHA-256 on the phone → saved to IndexedDB.
2. **Sync** (`lib/offline/sync.ts`): uploads to Storage, inserts `result_photos` (RLS: own rows only), calls `/api/extract`. Runs on load, on reconnect, and on "Sync now".
3. **Extract** (`/api/extract`): server re-hashes the file (`hash_verified`), the vision model reads it into strict JSON (zod), rule checks run, and the result is saved.
4. **Verify** (`lib/server/recompute.ts`): a unit is *verified* when 2+ distinct witnesses' readings are identical.
5. **Diff**: every collated line for the unit is compared with the verified wall result (`discrepancies`).

## Demo accounts (after seeding)

`witness1@demo.countrack.test`, `witness2@…`, `witness3@…`, `agent1@…`, `observer1@…`.
The password is `DEMO_PASSWORD` from `.env` (default `countrack-demo`).

## Seeded units

| Unit | State | Purpose |
|---|---|---|
| SIM-001, SIM-002 | Verified | Records match |
| SIM-003 | Verified | **Wall PB 142 vs announced 241** (deliberate mismatch) |
| SIM-004 | Pending (1 witness) | Add a 2nd witness live → Verified |
| SIM-005 | Needs review | Two witnesses' readings disagree |
