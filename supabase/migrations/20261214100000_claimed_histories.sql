-- Claimed player pages: saved careers for members who linked their start.gg.
--
-- When a member has linked their start.gg account (startgg_links), Smashy saves their tournament
-- placements so their player page and profile can show a whole career instead of start.gg's latest
-- 20: a one-time import of their full start.gg history (in batches, from their own start.gg account's
-- event list), and their newest results added whenever their page is read after that.
--
-- Only members who linked start.gg are saved, and the site only saves or shows them while they show
-- their stats. Unlinking start.gg deletes their saved results and import progress (the trigger
-- below, which also runs if they link a different start.gg account), as does deleting their account. Players who never joined Smashy have nothing
-- saved here.
--
-- What's kept per placement is what start.gg shows publicly on an event's standings: the event, its
-- tournament, size, date and game, and where they placed.
--
-- Server-only: row-level security on with no policies, and visitors and members have no rights on
-- either table. Nothing here changes or deletes existing data.

create table public.claimed_results (
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id bigint not null check (event_id > 0),             -- start.gg event id
  placement integer not null check (placement between 1 and 100000),
  event_name text not null check (char_length(event_name) <= 200),
  tournament text not null check (char_length(tournament) <= 200),
  tournament_slug text check (tournament_slug is null or char_length(tournament_slug) <= 200),
  entrants integer not null default 0 check (entrants >= 0),
  start_at timestamptz,
  game text not null check (char_length(game) <= 20),
  doubles boolean not null default false,
  saved_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index claimed_results_user_date_idx on public.claimed_results (user_id, start_at desc nulls last);

-- How far a member's full-history import got (start.gg's event list is read in pages).
create table public.claimed_imports (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  next_page integer not null default 1 check (next_page >= 1),
  total_pages integer check (total_pages is null or total_pages >= 0),
  total_events integer check (total_events is null or total_events >= 0),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz
);

alter table public.claimed_results enable row level security;
alter table public.claimed_imports enable row level security;
revoke all on public.claimed_results from anon, authenticated;
revoke all on public.claimed_imports from anon, authenticated;
-- No policies on purpose: only the server touches these tables.

-- Unlinking start.gg (or linking a different start.gg account) removes what was saved from it.
create function private.forget_claimed_history() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.claimed_results where user_id = old.user_id;
  delete from public.claimed_imports where user_id = old.user_id;
  return null;
end;
$$;
revoke all on function private.forget_claimed_history() from public, anon, authenticated;
create trigger startgg_links_forget_history after delete or update of startgg_player_id, startgg_user_id on public.startgg_links
  for each row execute function private.forget_claimed_history();
