-- The Smashy Discord bot (docs/discord-bot-plan.md): slash commands a scene's server can use.
--
-- discord_servers: which Smashy member a Discord server is linked to (its /bracket, /upcoming and /results
-- answer with that member's events). discord_link_codes: short-lived codes a member makes on Smashy and an
-- admin of the server types in Discord to link it. Both are server-only: no member can read or write them.
--
-- public.user_by_discord(): the Smashy account that signs in with a Discord account (for /next, which answers
-- only to the person asking). Only the site's server may call it.
--
-- New tables and one function; nothing existing changes.

create table public.discord_servers (
  guild_id text primary key check (guild_id ~ '^[0-9]{5,25}$'),
  host_id uuid not null references public.profiles (id) on delete cascade,
  linked_by text check (linked_by is null or linked_by ~ '^[0-9]{5,25}$'), -- the Discord user who linked it
  linked_at timestamptz not null default now()
);
create index discord_servers_host_idx on public.discord_servers (host_id);

create table public.discord_link_codes (
  code text primary key check (code ~ '^[A-Z0-9]{6,10}$'),
  host_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index discord_link_codes_host_idx on public.discord_link_codes (host_id);

alter table public.discord_servers enable row level security;
alter table public.discord_link_codes enable row level security;
revoke all on public.discord_servers, public.discord_link_codes from anon, authenticated;
-- No policies on purpose: only the server touches these tables.

-- The Smashy account whose sign-in includes this Discord account (null if none).
create or replace function public.user_by_discord(discord_user_id text) returns uuid
  language sql stable security definer
  set search_path = ''
as $$
  select i.user_id from auth.identities i
  where i.provider = 'discord' and i.provider_id = discord_user_id
  limit 1;
$$;
revoke all on function public.user_by_discord(text) from public, anon, authenticated;
grant execute on function public.user_by_discord(text) to service_role;
