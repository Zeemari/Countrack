-- INEC's IReV lists seven election types. "local_government" is split into its two real
-- contests (chairmanship and councillorship), and the two legislative elections are added.
-- Existing local_government rows become chairmanship.
-- New enum values must commit before rows use them, so run this file on its own.

do $$ begin
  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'election_type' and e.enumlabel = 'local_government'
  ) then
    alter type public.election_type rename value 'local_government' to 'chairmanship';
  end if;
end $$;

alter type public.election_type add value if not exists 'chairmanship';
alter type public.election_type add value if not exists 'house_of_reps' before 'chairmanship';
alter type public.election_type add value if not exists 'state_assembly' before 'chairmanship';
alter type public.election_type add value if not exists 'councillorship';
