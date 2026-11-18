import { NextResponse } from "next/server";
import { COLLATION_ROLES } from "@/lib/demo-users";
import { CollationInput } from "@/lib/schemas";
import { recomputeDiscrepancies } from "@/lib/server/recompute";
import { adminClient } from "@/lib/supabase/admin";
import { userClient } from "@/lib/supabase/server";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/** Saves a collated (announced) figure for a unit, then recomputes its discrepancies. */
export async function POST(req: Request) {
  const body = CollationInput.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Check the figures and try again", 400);
  if (!body.data.unitId) return fail("Choose a polling unit", 400);

  const supabase = await userClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Sign in first", 401);
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !(COLLATION_ROLES as readonly string[]).includes(profile.role))
    return fail("Only party agents and observers can enter collated figures", 403);

  const admin = adminClient();
  const { data: unit } = await admin.from("polling_units").select("id, code, ward").eq("id", body.data.unitId).maybeSingle();
  if (!unit) return fail("Polling unit not found", 404);

  const ins = await admin.from("collation_results").insert({
    level: body.data.level,
    area_code: body.data.level === "ward" ? unit.ward : body.data.areaCode,
    unit_id: unit.id,
    party_scores: body.data.partyScores,
    source: body.data.source,
    announced_at: body.data.announcedAt,
    entered_by: user.id,
    is_simulated: true, // everything entered in this demo is simulated
  });
  if (ins.error) return fail(ins.error.message, 500);

  await recomputeDiscrepancies(unit.id);
  return NextResponse.json({ ok: true, unitCode: unit.code });
}
