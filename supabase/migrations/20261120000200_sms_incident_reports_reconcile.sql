-- Keep the public-verification table `incident_reports` intact. The SMS ingest
-- model has a different schema and lives in `sms_incident_reports`.
-- If an earlier SMS migration created its schema under the old name, preserve
-- its rows by renaming it. Otherwise create the SMS table beside the legacy one.
do $$
declare
  has_sms_shape boolean;
begin
  if to_regclass('public.sms_incident_reports') is null then
    if to_regclass('public.incident_reports') is not null then
      select count(*) = 2 into has_sms_shape
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'incident_reports'
        and column_name in ('incident_code', 'source');

      if has_sms_shape then
        alter table public.incident_reports rename to sms_incident_reports;
      else
        create table public.sms_incident_reports (
          id uuid primary key default gen_random_uuid(),
          unit_id uuid not null references public.polling_units(id) on delete cascade,
          incident_code text not null check (incident_code in ('VUB','VIO','MSB','BOG','INT')),
          source text not null check (source in ('at_sandbox','demo')),
          provider_message_id text unique,
          sender_fingerprint text,
          status text not null default 'received' check (status in ('received','reviewed','dismissed')),
          received_at timestamptz not null default now(),
          created_at timestamptz not null default now()
        );
      end if;
    else
      create table public.sms_incident_reports (
        id uuid primary key default gen_random_uuid(),
        unit_id uuid not null references public.polling_units(id) on delete cascade,
        incident_code text not null check (incident_code in ('VUB','VIO','MSB','BOG','INT')),
        source text not null check (source in ('at_sandbox','demo')),
        provider_message_id text unique,
        sender_fingerprint text,
        status text not null default 'received' check (status in ('received','reviewed','dismissed')),
        received_at timestamptz not null default now(),
        created_at timestamptz not null default now()
      );
    end if;
  end if;
end $$;

create index if not exists sms_incident_reports_received_idx
  on public.sms_incident_reports (received_at desc);
create index if not exists sms_incident_reports_unit_idx
  on public.sms_incident_reports (unit_id, received_at desc);
create index if not exists sms_incident_reports_sender_idx
  on public.sms_incident_reports (sender_fingerprint, received_at desc);
alter table public.sms_incident_reports enable row level security;

-- This function returns only grouped public counts and polling-unit location;
-- no sender fingerprints or provider message IDs leave the server.
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
  from public.sms_incident_reports r
  join public.polling_units u on u.id = r.unit_id
  where r.status <> 'dismissed'
  group by r.unit_id, r.incident_code, u.code, u.name, u.ward, u.lga, u.state
  order by max(r.received_at) desc
  limit 100;
$$;

revoke all on function public.incident_feed() from public, anon, authenticated;
grant execute on function public.incident_feed() to service_role;
