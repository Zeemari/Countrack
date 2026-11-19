-- The units page searches all ~176k polling units with `ilike '%term%'` on code, name, ward and
-- LGA and counts the matches. Without these, each search is a full scan (1–2 s) and several in
-- parallel hit the anon role's statement timeout. Trigram indexes turn them into index scans.

create extension if not exists pg_trgm with schema extensions;

create index if not exists polling_units_code_trgm on public.polling_units using gin (code extensions.gin_trgm_ops);
create index if not exists polling_units_name_trgm on public.polling_units using gin (name extensions.gin_trgm_ops);
create index if not exists polling_units_ward_trgm on public.polling_units using gin (ward extensions.gin_trgm_ops);
create index if not exists polling_units_lga_trgm  on public.polling_units using gin (lga extensions.gin_trgm_ops);

-- The default list order (demo units first, then by code) and the state filter.
create index if not exists polling_units_list_idx on public.polling_units (is_simulated desc, code);
create index if not exists polling_units_state_code_idx on public.polling_units (state, is_simulated desc, code);
