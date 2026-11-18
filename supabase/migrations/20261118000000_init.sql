-- CounTrack v1 schema.
-- Clients write raw evidence only (photos, check-ins, move flags).
-- Derived tables are written by server routes using the service role (bypasses RLS),
-- so nobody can submit "verified" numbers from a browser.

create extension if not exists pgcrypto with schema extensions;

create type public.user_role       as enum ('voter','witness','agent','observer');
create type public.unit_status     as enum ('pending','verified','flagged');
create type public.collation_level as enum ('ward','lga','state','national');
create type public.photo_status    as enum ('uploaded','extracting','extracted','failed');

-- ── Tables ────────────────────────────────────────────────────────────

create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         public.user_role not null default 'witness',
  language     text not null default 'en' check (language in ('en','pcm','ha','yo','ig')),
  display_name text,
  created_at   timestamptz not null default now()
);

create table public.polling_units (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  ward         text not null,
  lga          text not null,
  state        text not null,
  lat          double precision check (lat between -90 and 90),
  lng          double precision check (lng between -180 and 180),
  moved        boolean not null default false,
  is_simulated boolean not null default true
);
create index polling_units_area_idx on public.polling_units (state, lga, ward);

create table public.unit_move_flags (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references public.polling_units(id) on delete cascade,
  reported_by   uuid not null references public.users(id) on delete cascade,
  new_lat       double precision not null,
  new_lng       double precision not null,
  confirmations int not null default 0 check (confirmations >= 0),
  created_at    timestamptz not null default now()
);
create index on public.unit_move_flags (unit_id);

create table public.check_ins (
  id                uuid primary key default gen_random_uuid(),
  unit_id           uuid not null references public.polling_units(id) on delete cascade,
  user_id           uuid not null references public.users(id) on delete cascade,
  officials_arrived boolean not null,
  bvas_present      boolean not null,
  materials_ok      boolean not null,
  opened_at         timestamptz,                 -- null = not opened yet
  notes             text check (char_length(notes) <= 500),
  created_at        timestamptz not null default now()
);
create index on public.check_ins (unit_id, created_at);

create table public.result_photos (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references public.polling_units(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  image_url     text not null,                   -- storage path: <user_id>/<file>.jpg
  -- unique: the same file submitted twice can never count as two independent witnesses
  sha256_hash   text not null unique check (sha256_hash ~ '^[0-9a-f]{64}$'),
  hash_verified boolean,                         -- server re-hash matched client hash? null = not checked yet
  captured_at   timestamptz not null,            -- device clock (claimed)
  uploaded_at   timestamptz not null default now(), -- server clock (trusted)
  sync_status   public.photo_status not null default 'uploaded',
  constraint captured_not_in_future check (captured_at <= uploaded_at + interval '5 minutes')
);
create index on public.result_photos (unit_id);
create index on public.result_photos (user_id);

create table public.extracted_results (
  id            uuid primary key default gen_random_uuid(),
  photo_id      uuid not null unique references public.result_photos(id) on delete cascade,
  registered    int check (registered  >= 0),    -- null = unreadable; never guessed
  accredited    int check (accredited  >= 0),
  rejected      int check (rejected    >= 0),
  total_valid   int check (total_valid >= 0),
  votes_cast    int check (votes_cast  >= 0),
  party_scores  jsonb not null default '{}'::jsonb check (jsonb_typeof(party_scores) = 'object'),
  check_flags   jsonb not null default '[]'::jsonb check (jsonb_typeof(check_flags)  = 'array'),
  ai_confidence numeric(3,2) check (ai_confidence between 0 and 1),
  model         text not null,                   -- model id, or 'seed (simulated)'
  raw           jsonb,                           -- validated model output, kept for audit
  created_at    timestamptz not null default now()
);

create table public.unit_results (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null unique references public.polling_units(id) on delete cascade,
  status        public.unit_status not null default 'pending',
  agreed_scores jsonb,                           -- ExtractedResult shape; set when verified
  witness_count int not null default 0,
  verified_at   timestamptz,
  updated_at    timestamptz not null default now(),
  constraint verified_needs_scores
    check (status <> 'verified' or (agreed_scores is not null and verified_at is not null))
);

create table public.collation_results (
  id           uuid primary key default gen_random_uuid(),
  level        public.collation_level not null,
  area_code    text not null,                    -- ward / LGA / state code the sheet covers
  -- set when this row is one polling unit's line on a collation sheet (EC8B lists each unit)
  unit_id      uuid references public.polling_units(id) on delete cascade,
  party_scores jsonb not null check (jsonb_typeof(party_scores) = 'object'),
  source       text not null,                    -- e.g. 'EC8B photo', 'announcement'
  announced_at timestamptz not null,
  entered_by   uuid references public.users(id) on delete set null,
  is_simulated boolean not null default true,
  created_at   timestamptz not null default now()
);
create index on public.collation_results (level, area_code);
create index on public.collation_results (unit_id);

create table public.discrepancies (
  id              uuid primary key default gen_random_uuid(),
  unit_id         uuid not null references public.polling_units(id) on delete cascade,
  collation_id    uuid not null references public.collation_results(id) on delete cascade,
  party           text not null,
  wall_votes      int not null,
  announced_votes int not null,
  difference      int generated always as (announced_votes - wall_votes) stored,
  detected_at     timestamptz not null default now(),
  unique (collation_id, unit_id, party)
);
create index on public.discrepancies (unit_id);

create table public.evidence_packets (
  id          uuid primary key default gen_random_uuid(),
  unit_id     uuid not null references public.polling_units(id) on delete cascade,
  pdf_url     text not null,
  sha256_hash text not null check (sha256_hash ~ '^[0-9a-f]{64}$'),  -- hash of the PDF itself
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on public.evidence_packets (unit_id);

-- ── Profile row for every new auth user ───────────────────────────────
-- Role comes from app_metadata (admin-only), never user_metadata, so nobody can sign up as 'agent'.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, role, display_name)
  values (
    new.id,
    coalesce((new.raw_app_meta_data->>'role')::public.user_role, 'witness'),
    new.raw_user_meta_data->>'display_name'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ── RLS: public read-only transparency ────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'polling_units','unit_move_flags','check_ins','result_photos','extracted_results',
    'unit_results','collation_results','discrepancies','evidence_packets'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- Profiles are private: see and edit only your own, and only these columns.
alter table public.users enable row level security;
create policy "read own profile" on public.users
  for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.users
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.users from anon, authenticated;
grant update (language, display_name) on public.users to authenticated;

-- ── RLS: authenticated users insert raw evidence only ─────────────────
create policy "witness adds own photo" on public.result_photos
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and split_part(image_url, '/', 1) = (select auth.uid())::text
  );
-- Clients may set only capture fields; hash_verified, sync_status, uploaded_at belong to the server.
revoke insert on public.result_photos from anon, authenticated;
grant insert (unit_id, user_id, image_url, sha256_hash, captured_at)
  on public.result_photos to authenticated;

create policy "user adds own check-in" on public.check_ins
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "user flags unit move" on public.unit_move_flags
  for insert to authenticated
  with check (reported_by = (select auth.uid()) and confirmations = 0);

-- No update/delete policies anywhere: once submitted, clients cannot change evidence.

-- ── Storage ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('result-photos',    'result-photos',    true, 5242880,  array['image/jpeg','image/webp']),
  ('evidence-packets', 'evidence-packets', true, 20971520, array['application/pdf'])
on conflict (id) do nothing;

-- Witnesses upload only into their own folder and cannot overwrite (no update policy).
create policy "witness uploads to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'result-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
