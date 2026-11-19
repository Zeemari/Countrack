/**
 * Imports a versioned community snapshot of INEC's public polling-unit directory.
 * Source: https://github.com/saidiadegoke/nigeria-inec-geo
 * Run after applying the polling-unit-directory migration.
 */
import { createClient } from "@supabase/supabase-js";

const REPO = "saidiadegoke/nigeria-inec-geo";
const ref = process.env.INEC_DATASET_REF ?? "main";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
}

const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "user-agent": "CounTrack-polling-unit-import/1.0", accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Dataset request failed (${response.status}): ${url}`);
  return (await response.json()) as T;
}

async function getText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": "CounTrack-polling-unit-import/1.0" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Dataset request failed (${response.status}): ${url}`);
  return response.text();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((cell) => cell !== "")) rows.push(row);
  }
  if (quoted) throw new Error("Dataset CSV has an unterminated quoted field");
  return rows;
}

async function main() {
  const commit = /^[0-9a-f]{40}$/i.test(ref)
    ? ref
    : (await getJson<{ sha: string }>(`https://api.github.com/repos/${REPO}/commits/${encodeURIComponent(ref)}`)).sha;
  if (!/^[0-9a-f]{40}$/i.test(commit)) throw new Error("GitHub did not return a valid dataset commit");

  const base = `https://raw.githubusercontent.com/${REPO}/${commit}/data`;
  const [manifest, csv] = await Promise.all([
    getJson<{
      source: string;
      scraped_at: string;
      counts: { polling_units: number };
      inec_published: { polling_units: number };
    }>(`${base}/manifest.json`),
    getText(`${base}/polling-units.csv`),
  ]);

  const parsed = parseCsv(csv);
  const [headers, ...records] = parsed;
  const columns = Object.fromEntries(headers.map((name, index) => [name, index]));
  const required = ["state_name", "lga_name", "ward_name", "pu_code", "pu_name", "pu_location", "full_code"];
  for (const field of required) {
    if (columns[field] === undefined) throw new Error(`Dataset is missing the ${field} column`);
  }
  if (records.length !== manifest.counts.polling_units || records.length !== manifest.inec_published.polling_units) {
    throw new Error(`Dataset row count (${records.length}) does not match its manifest`);
  }

  const seen = new Set<string>();
  const rows = records.map((record) => {
    const value = (field: string) => record[columns[field]]?.trim() ?? "";
    const code = value("full_code");
    if (!/^\d{2}\/\d{2}\/\d{2}\/\d{3}$/.test(code)) throw new Error(`Invalid INEC polling-unit code: ${code}`);
    if (seen.has(code)) throw new Error(`Duplicate INEC polling-unit code: ${code}`);
    seen.add(code);

    return {
      code,
      name: value("pu_name") || `Polling Unit ${code}`,
      location: value("pu_location") || null,
      ward: value("ward_name"),
      lga: value("lga_name"),
      state: value("state_name"),
      is_simulated: false,
      directory_source: "INEC CVR portal via nigeria-inec-geo",
      directory_snapshot: `${commit}:${manifest.scraped_at}`,
      directory_is_current: true,
    };
  });

  const batchSize = 500;
  for (let start = 0; start < rows.length; start += batchSize) {
    const { error } = await db.from("polling_units").upsert(rows.slice(start, start + batchSize), { onConflict: "code" });
    if (error) throw new Error(`Import stopped at row ${start}: ${error.message}`);
    if ((start + batchSize) % 10_000 === 0 || start + batchSize >= rows.length) {
      console.log(`Imported ${Math.min(start + batchSize, rows.length)} / ${rows.length}`);
    }
  }

  // Retire records removed from a newer snapshot only after every row succeeded.
  const { error } = await db
    .from("polling_units")
    .update({ directory_is_current: false })
    .eq("is_simulated", false)
    .neq("directory_snapshot", `${commit}:${manifest.scraped_at}`);
  if (error) throw new Error(`Imported the snapshot, but could not retire stale rows: ${error.message}`);

  console.log(`Imported ${rows.length} INEC polling units from ${manifest.source} (${manifest.scraped_at}; ${commit}).`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
