-- Play tab: short-lived netplay lobbies + per-game live chat that disappears after 24 hours.
-- Everything here is for signed-in users only (13+). Same guardrails for everyone:
-- no links or contact info, slow mode, reports to moderators.

-- ---------- Shared guardrail: block links and contact info ----------
-- (The app has a friendlier, broader check; this is the backstop.)
create function private.has_contact_info(t text) returns boolean
  language sql immutable
  set search_path = ''
as $$
  select t ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|gg|io|me|tv|co|ly|app|link|xyz)\M)'   -- links
      or t ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'                                            -- emails
      or t ~ '(\d[\s().-]*){7,}'                                                                 -- phone numbers
      or t ~* '(^|\s)@[a-z0-9_.]{2,}'                                                            -- @handles
      or t ~* '\m(snap(chat)?|insta(gram)?|ig|tiktok|whats ?app|telegram|kik|discord ?(id|tag|name|server)|my discord|add me)\M';
$$;

-- ---------- Lobbies ----------
create table public.lobbies (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('melee', 'ultimate', 'pplus')),
  title text not null check (char_length(btrim(title)) between 3 and 60),
  mode text not null default 'friendlies' check (mode in ('friendlies', 'practice', 'warmup', 'doubles')),
  connect_info text not null check (connect_info ~ '^[A-Za-z0-9#: /-]{2,40}$'),
  region text not null default 'Texas' check (char_length(btrim(region)) between 2 and 40),
  skill text not null default 'any' check (skill in ('any', 'beginner', 'intermediate', 'advanced')),
  notes text check (notes is null or char_length(notes) <= 200),
  closes_at timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  check (not private.has_contact_info(title) and (notes is null or not private.has_contact_info(notes)))
);
create index lobbies_open_idx on public.lobbies (game, closes_at) where closed_at is null;

alter table public.lobbies enable row level security;
revoke all on public.lobbies from anon, authenticated;
grant select on public.lobbies to authenticated;
grant insert (host_id, game, title, mode, connect_info, region, skill, notes, closes_at) on public.lobbies to authenticated;
grant update (closed_at) on public.lobbies to authenticated;

create policy "Signed-in users see open lobbies (and their own)"
  on public.lobbies for select to authenticated
  using ((closed_at is null and closes_at > now()) or host_id = (select auth.uid()));

create policy "Users host their own lobbies"
  on public.lobbies for insert to authenticated
  with check (host_id = (select auth.uid()) and closes_at > now() and closes_at <= now() + interval '3 hours 5 minutes');

create policy "Hosts close their own lobbies"
  on public.lobbies for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

-- One open lobby per host.
create function private.before_lobby_insert() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.lobbies l
             where l.host_id = new.host_id and l.closed_at is null and l.closes_at > now()) then
    raise exception 'You already have an open lobby. Close it first.' using errcode = 'P0409';
  end if;
  return new;
end;
$$;
create trigger lobbies_before_insert before insert on public.lobbies
  for each row execute function private.before_lobby_insert();

-- ---------- Chat ----------
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null check (room in ('melee', 'ultimate', 'pplus', 'general')),
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_tag text not null,  -- copied at send time so live updates don't need extra lookups
  body text not null check (char_length(btrim(body)) between 1 and 280 and not private.has_contact_info(body)),
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create index chat_room_idx on public.chat_messages (room, created_at desc);

alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from anon, authenticated;
grant select on public.chat_messages to authenticated;
grant insert (room, author_id, body) on public.chat_messages to authenticated;

create policy "Signed-in users read the last 24 hours of chat"
  on public.chat_messages for select to authenticated
  using (removed_at is null and created_at > now() - interval '24 hours');

create policy "Users send as themselves"
  on public.chat_messages for insert to authenticated
  with check (author_id = (select auth.uid()));

-- Fill in the tag; slow mode (1 message / 5 seconds, 15 / minute).
create function private.before_chat_insert() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  select p.tag into new.author_tag from public.profiles p where p.id = new.author_id;
  if new.author_tag is null then raise exception 'Profile not found'; end if;
  new.created_at := now();
  if exists (select 1 from public.chat_messages m
             where m.author_id = new.author_id and m.created_at > now() - interval '5 seconds') then
    raise exception 'Slow mode: wait a few seconds between messages.' using errcode = 'P0429';
  end if;
  if (select count(*) from public.chat_messages m
       where m.author_id = new.author_id and m.created_at > now() - interval '1 minute') >= 15 then
    raise exception 'Slow mode: wait a minute before sending more.' using errcode = 'P0429';
  end if;
  return new;
end;
$$;
create trigger chat_before_insert before insert on public.chat_messages
  for each row execute function private.before_chat_insert();

-- Live updates: Supabase Realtime sends new rows to subscribers who pass the select policy.
alter publication supabase_realtime add table public.chat_messages, public.lobbies;

-- ---------- Reports for chat messages and lobbies ----------
-- A copy of the reported text is kept here, so evidence survives the 24-hour cleanup.
create table public.live_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('chat', 'lobby')),
  target_id uuid not null,
  author_id uuid references public.profiles (id) on delete set null,
  snapshot text not null,
  room text,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'off_topic', 'other')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (kind, target_id, reporter_id)
);
alter table public.live_reports enable row level security;
revoke all on public.live_reports from anon, authenticated;
-- Reports are filed through the server (which takes the snapshot), never directly.

-- Moderation log: allow the new actions.
alter table public.moderation_actions drop constraint moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check
  check (action in ('remove_post', 'restore_post', 'dismiss_reports', 'remove_chat', 'close_lobby', 'dismiss_live'));
alter table public.moderation_actions add column snapshot text;

-- ---------- Automatic cleanup every hour ----------
create extension if not exists pg_cron;
select cron.schedule(
  'smashy-cleanup-chat-and-lobbies',
  '7 * * * *',
  $$
    delete from public.chat_messages where created_at < now() - interval '24 hours';
    delete from public.lobbies where closes_at < now() - interval '24 hours';
  $$
);
