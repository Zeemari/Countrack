-- Real polling-unit directory metadata. Existing SIM-* demo rows remain intact.
alter table public.polling_units
  add column if not exists location text,
  add column if not exists directory_source text,
  add column if not exists directory_snapshot text,
  add column if not exists directory_is_current boolean not null default true;

create index if not exists polling_units_real_area_idx
  on public.polling_units (state, lga, ward)
  where is_simulated = false and directory_is_current = true;
