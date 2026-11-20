import { connection, NextResponse } from "next/server";
import { apiT } from "@/lib/i18n/api";
import { adminClient } from "@/lib/supabase/admin";
import { INCIDENTS } from "@/lib/sms/incidents";

export async function GET(req: Request) {
  const tr = apiT(req);
  await connection(); // per request, never prerendered at build time
  const { data, error } = await adminClient()
    .from("sms_incident_reports")
    .select("id, incident_code, source, received_at, polling_units(code, name, ward, lga, state)")
    .neq("status", "dismissed")
    .order("received_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Incident dashboard query failed (is the sms_incident_reports migration applied?)", error.message);
    return NextResponse.json({ error: tr("api.incidentsUnavailable") }, { status: 503 });
  }
  const reports = (data ?? []).map((row) => ({
    ...row,
    incident_label: INCIDENTS[row.incident_code as keyof typeof INCIDENTS],
  }));
  return NextResponse.json({ reports }, { headers: { "Cache-Control": "no-store" } });
}
