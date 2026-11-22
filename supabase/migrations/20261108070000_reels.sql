-- Reels: top Twitch clips from approved tournament channels, shown through Twitch's own player.
-- Only approved channels are used (Twitch "top clips for Melee" can include anything; Smashy has teens).
-- Channels come from majors' streams automatically, plus ones a site admin adds; admins can block a
-- channel (so it isn't re-added) or hide one clip. The server fetches clips every few hours.

create table public.reel_channels (
  login text primary key check (login ~ '^[a-z0-9_]{2,25}$'),  -- twitch.tv/<login>
  twitch_id text,
  display_name text,
  source text not null default 'admin' check (source in ('admin', 'auto')),
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reels (
  clip_id text primary key,
  channel_login text not null references public.reel_channels (login) on delete cascade,
  channel_name text,
  title text not null default '',
  game text not null check (game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4')),
  view_count int not null default 0,
  duration real,
  thumbnail_url text,
  video_id text,             -- the VOD the clip came from
  vod_offset int,            -- seconds into that VOD
  created_at timestamptz not null,
  hidden boolean not null default false,
  fetched_at timestamptz not null default now()
);
create index reels_recent_idx on public.reels (created_at desc) where not hidden;

create table public.reels_sync (
  id int primary key default 1 check (id = 1),
  last_run timestamptz not null default 'epoch'
);
insert into public.reels_sync default values;

alter table public.reel_channels enable row level security;
alter table public.reels enable row level security;
alter table public.reels_sync enable row level security;
revoke all on public.reel_channels, public.reels, public.reels_sync from anon, authenticated;
grant select on public.reels to anon, authenticated;
create policy "Visible reels are public" on public.reels for select to anon, authenticated
  using (not hidden and exists (select 1 from public.reel_channels c where c.login = channel_login and not c.blocked));
-- The channel list is public (it's just which Twitch channels Reels uses). Writes: server only.
grant select on public.reel_channels to anon, authenticated;
create policy "Reel channels are public" on public.reel_channels for select to anon, authenticated using (true);

-- Start with VGBootCamp, the biggest smash tournament streamer. More come from majors automatically.
insert into public.reel_channels (login, display_name, source) values ('vgbootcamp', 'VGBootCamp', 'admin');
