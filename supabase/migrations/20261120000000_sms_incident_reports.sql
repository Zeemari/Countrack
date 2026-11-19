-- SMS incident reports are public reports. Reporter identifiers are
-- HMAC fingerprints only; raw phone numbers are never persisted.
create table if not exists public.sms_incident_reports (
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

create index if not exists sms_incident_reports_received_idx on public.sms_incident_reports (received_at desc);
create index if not exists sms_incident_reports_unit_idx on public.sms_incident_reports (unit_id, received_at desc);
create index if not exists sms_incident_reports_sender_idx on public.sms_incident_reports (sender_fingerprint, received_at desc);

alter table public.sms_incident_reports enable row level security;
-- No client policies: server routes use the service role and expose only a
-- sanitized, public API response with no sender fingerprint or provider ID.
