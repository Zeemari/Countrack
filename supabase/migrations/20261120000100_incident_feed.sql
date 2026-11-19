-- A safe public feed: expose only incident type, unit location, aggregate count,
-- and latest report time. Sender fingerprints and provider IDs stay private.
create or replace function public.incident_feed()
returns table (
  unit_id uuid,
  incident_code text,
  report_count bigint,
  demo_count bigint,
  sandbox_count bigint,
  latest_received_at timestamptz,
  code text,
  name text,
  ward text,
  lga text,
  state text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.unit_id,
    r.incident_code,
    count(*)::bigint,
    count(*) filter (where r.source = 'demo')::bigint,
    count(*) filter (where r.source = 'at_sandbox')::bigint,
    max(r.received_at),
    u.code,
    u.name,
    u.ward,
    u.lga,
    u.state
  from public.incident_reports r
  join public.polling_units u on u.id = r.unit_id
  where r.status <> 'dismissed'
  group by r.unit_id, r.incident_code, u.code, u.name, u.ward, u.lga, u.state
  order by max(r.received_at) desc
  limit 100;
$$;

revoke all on function public.incident_feed() from public, anon, authenticated;
grant execute on function public.incident_feed() to service_role;
