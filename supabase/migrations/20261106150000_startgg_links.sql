-- Slice 2b: link a Smashy account to a start.gg player.
-- Rows are only written by the server after start.gg confirms who the person is (OAuth),
-- so nobody can claim someone else's results by calling the API directly.

create table public.startgg_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  startgg_user_id bigint not null unique,   -- one Smashy account per start.gg account
  startgg_player_id bigint not null unique, -- ...and per start.gg player (their results)
  gamer_tag text,
  startgg_slug text,
  linked_at timestamptz not null default now()
);

alter table public.startgg_links enable row level security;

revoke all on public.startgg_links from anon;
grant select, delete on public.startgg_links to authenticated;

-- Private for now: only the owner sees their link. (Public visibility comes with public profiles.)
create policy "Users read their own start.gg link"
  on public.startgg_links for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users unlink their own start.gg account"
  on public.startgg_links for delete to authenticated
  using ((select auth.uid()) = user_id);

-- No insert/update policies: only the server (secret key) can create a link, after OAuth.
