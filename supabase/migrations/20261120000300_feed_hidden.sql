-- Items an admin removed from the public "What's happening" feed. Nothing is deleted: the feed
-- skips an event whose id is listed here, until it has newer activity than hidden_at.
create table public.feed_hidden (
  event_id  text primary key check (char_length(event_id) <= 120),
  hidden_at timestamptz not null default now()
);

alter table public.feed_hidden enable row level security;
-- No policies: only the server (service role) reads or writes this, after checking the admin key.
revoke all on public.feed_hidden from anon, authenticated;
