import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { INCIDENTS } from "@/lib/sms/incidents";

export async function GET() {
  const { data, error } = await adminClient()
    .from("incident_reports")
    .select("id, incident_code, source, status, received_at, polling_units(code, name, ward, lga, state)")
    .order("received_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Incident dashboard query failed", error.message);
    return NextResponse.json({ error: "Incident reports are unavailable. Apply the incident_reports migration." }, { status: 503 });
  }
  const reports = (data ?? []).map((row) => ({
    ...row,
    incident_label: INCIDENTS[row.incident_code as keyof typeof INCIDENTS],
  }));
  return NextResponse.json({ reports }, { headers: { "Cache-Control": "no-store" } });
}
