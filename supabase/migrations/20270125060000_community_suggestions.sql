-- Round 653: "Help build Smashy" (/help). The Reddit posts ask the community for character resources,
-- missing locals, history fixes and feedback; this is where those land. Anyone can send one, signed in
-- or not (guests from Reddit shouldn't need an account to help). Nothing here is ever shown publicly:
-- only site admins read them, on Admin → Suggestions, and mark them done or dismissed.
--
-- Guests are limited by a hash of their IP address (never the address itself), signed-in members by
-- their account; the server checks the counts before saving (src/lib/communitySuggestions.ts).

create table public.community_suggestions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('resource', 'local', 'history', 'feedback')),
  game text check (game is null or game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4')),
  character text check (character is null or char_length(character) <= 60),
  link text check (link is null or (char_length(link) <= 500 and link ~ '^https?://[^\s]+$')),
  details text not null default '' check (char_length(details) <= 2000),
  -- Optional, for a reply (an email or a Reddit username). Only admins see it.
  contact text check (contact is null or char_length(contact) <= 200),
  user_id uuid references auth.users (id) on delete set null,
  ip_hash text check (ip_hash is null or char_length(ip_hash) <= 64),
  status text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (link is not null or char_length(details) >= 3)   -- something to go on
);
create index community_suggestions_open_idx on public.community_suggestions (created_at desc) where status = 'open';
create index community_suggestions_user_idx on public.community_suggestions (user_id, created_at desc) where user_id is not null;
create index community_suggestions_ip_idx on public.community_suggestions (ip_hash, created_at desc) where ip_hash is not null;

-- Server only (the secret key): no one reads or writes this table from the browser.
alter table public.community_suggestions enable row level security;
revoke all on public.community_suggestions from anon, authenticated;
