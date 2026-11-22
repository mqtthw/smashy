-- Majors: big tournaments everyone cares about, wherever they are.
-- Filled automatically from a start.gg scan (by size, plus start.gg staff picks); site admins can
-- feature any tournament or hide one. Live = between start_at and end_at.

create table public.majors (
  slug text primary key,                           -- start.gg tournament slug
  name text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  games text[] not null default '{}' check (games <@ array['melee', 'ultimate', 'pplus']::text[]),
  entrants int,                                    -- biggest supported-game event so far
  city text,
  country text,
  image_url text,
  stream_source text,                              -- 'TWITCH' / 'YOUTUBE' / ...
  stream_name text,                                -- channel name
  source text not null default 'auto' check (source in ('auto', 'admin')),
  hidden boolean not null default false,           -- admin removed it from Smashy
  live_notified_at timestamptz,                    -- "now live" notifications already sent
  updated_at timestamptz not null default now()
);
create index majors_time_idx on public.majors (start_at) where not hidden;

alter table public.majors enable row level security;
revoke all on public.majors from anon, authenticated;
grant select on public.majors to anon, authenticated;
create policy "Majors are public" on public.majors for select to anon, authenticated using (true);
-- Writes happen on the server only (scan + admin actions use the secret key after checking the admin).

-- When the last start.gg scan ran, so only one scan runs every few hours.
create table public.majors_sync (
  id int primary key default 1 check (id = 1),
  last_run timestamptz not null default 'epoch'
);
insert into public.majors_sync default values;
alter table public.majors_sync enable row level security;
revoke all on public.majors_sync from anon, authenticated;

-- ---------- Opt-in: tell me when a major in my games goes live ----------
alter table public.profiles add column notify_majors boolean not null default false;
grant update (notify_majors) on public.profiles to authenticated;

-- ---------- "Major is live" notifications ----------
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'follow', 'follow_request', 'follow_accepted', 'like', 'reply', 'repost', 'quote', 'vote',
  'scene_approved', 'scene_rejected', 'admin_approved', 'admin_rejected', 'major_live'
));
alter table public.notifications add column major_slug text references public.majors (slug) on delete cascade;

-- Runs every 5 minutes: for each major that just went live, notify everyone who opted in and plays
-- one of its games, once.
create or replace function private.notify_live_majors() returns void
  language plpgsql security definer set search_path = ''
as $$
declare m record;
begin
  for m in
    update public.majors set live_notified_at = now()
    where not hidden and live_notified_at is null
      and start_at <= now() and end_at > now()
    returning slug, games
  loop
    insert into public.notifications (user_id, type, major_slug)
    select p.id, 'major_live', m.slug
    from public.profiles p
    where p.notify_majors and p.games && m.games;
  end loop;
end;
$$;

select cron.schedule('notify-live-majors', '*/5 * * * *', $$select private.notify_live_majors()$$);
