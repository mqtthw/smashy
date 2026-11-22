-- Discord for an event: the host pastes a channel's webhook link (made in that Discord server's
-- settings), and Smashy posts there when the bracket starts, when sets are called, and the results.
-- Smashy only ever posts to a channel whose own admins made that link; it reads nothing from Discord.
--
-- A webhook link is a key: anyone who has it can post in that channel. So it's kept in a table no
-- member can read or write (not even the host, through the API): the site saves and uses it on the
-- server, after checking that the person is the event's host, and never shows it back.
--
--   url:          the webhook link. Only Discord's own addresses are accepted.
--   calls:        whether set calls are posted ("Set C: Ben vs Gus on Setup 1"). On by default.
--   announced_at: when the host last posted the sign-up link (at most once every 10 minutes).
--
-- Nothing here changes or deletes existing rows.

create table public.hosted_webhooks (
  event_id uuid primary key references public.hosted_events (id) on delete cascade,
  url text not null check (url ~ '^https://(discord|discordapp)\.com/api/webhooks/[0-9]{5,25}/[A-Za-z0-9_-]{20,120}$'),
  calls boolean not null default true,
  announced_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.hosted_webhooks enable row level security;
revoke all on public.hosted_webhooks from anon, authenticated;
-- No policies on purpose: only the server touches this table.
