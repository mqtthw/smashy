-- Scenes & rulesets.
-- Anyone signed in can REQUEST a scene or a scene-admin role; a site admin approves.
-- Scene admins publish versioned rulesets (versions are permanent) and attach them to events.

-- ---------- Site admins (you) ----------
create table public.site_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon, authenticated;

create function private.is_site_admin(uid uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.site_admins s where s.user_id = uid); $$;
revoke all on function private.is_site_admin(uuid) from public;
grant execute on function private.is_site_admin(uuid) to anon, authenticated;

-- ---------- Scenes ----------
create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  region text not null default 'TX' check (char_length(region) <= 40),
  cities text[] not null default '{}' check (cardinality(cities) <= 20),
  games text[] not null default '{}' check (games <@ array['melee', 'ultimate', 'pplus']::text[]),
  description text check (description is null or char_length(description) <= 500),
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  requested_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.scenes enable row level security;

-- ---------- Scene admins (pending until approved) ----------
create table public.scene_admins (
  scene_id uuid not null references public.scenes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  message text check (message is null or char_length(message) <= 300),
  created_at timestamptz not null default now(),
  primary key (scene_id, user_id)
);
alter table public.scene_admins enable row level security;

create function private.is_scene_admin(sid uuid, uid uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.scene_admins a join public.scenes s on s.id = a.scene_id
    where a.scene_id = sid and a.user_id = uid and a.status = 'active' and s.status = 'active'
  );
$$;
revoke all on function private.is_scene_admin(uuid, uuid) from public;
grant execute on function private.is_scene_admin(uuid, uuid) to anon, authenticated;

-- Scenes: active ones are public; pending/rejected visible to the requester and site admins.
grant select on public.scenes to anon, authenticated;
grant insert (slug, name, region, cities, games, description, requested_by) on public.scenes to authenticated;
create policy "Active scenes are public"
  on public.scenes for select to anon, authenticated
  using (status = 'active' or requested_by = (select auth.uid()) or private.is_site_admin((select auth.uid())));
create policy "Signed-in users request scenes"
  on public.scenes for insert to authenticated
  with check (requested_by = (select auth.uid()));
-- Approving/rejecting happens on the server with the secret key after a site-admin check.

-- Scene admins: active admins of active scenes are public; your own requests are visible to you.
grant select on public.scene_admins to anon, authenticated;
grant insert (scene_id, user_id, message) on public.scene_admins to authenticated;
create policy "Active admins are public; own requests visible"
  on public.scene_admins for select to anon, authenticated
  using (
    (status = 'active' and exists (select 1 from public.scenes s where s.id = scene_id and s.status = 'active'))
    or user_id = (select auth.uid())
    or private.is_site_admin((select auth.uid()))
  );
create policy "Users request admin roles for themselves"
  on public.scene_admins for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ---------- Rulesets and permanent versions ----------
create table public.rulesets (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes (id) on delete cascade,
  game text not null check (game in ('melee', 'ultimate', 'pplus')),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index rulesets_scene_idx on public.rulesets (scene_id, game);
alter table public.rulesets enable row level security;

create table public.ruleset_versions (
  id uuid primary key default gen_random_uuid(),
  ruleset_id uuid not null references public.rulesets (id) on delete cascade,
  version int not null check (version > 0),
  rules jsonb not null default '{}'::jsonb check (jsonb_typeof(rules) = 'object' and pg_column_size(rules) < 20000),
  notes text check (notes is null or char_length(notes) <= 4000),
  changelog text check (changelog is null or char_length(changelog) <= 500),
  published_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz not null default now(),
  unique (ruleset_id, version)
);
alter table public.ruleset_versions enable row level security;

create function private.scene_is_active(sid uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.scenes s where s.id = sid and s.status = 'active'); $$;
revoke all on function private.scene_is_active(uuid) from public;
grant execute on function private.scene_is_active(uuid) to anon, authenticated;

grant select on public.rulesets, public.ruleset_versions to anon, authenticated;
grant insert (scene_id, game, name, created_by) on public.rulesets to authenticated;
grant insert (ruleset_id, version, rules, notes, changelog, published_by) on public.ruleset_versions to authenticated;

create policy "Rulesets of active scenes are public"
  on public.rulesets for select to anon, authenticated
  using (private.scene_is_active(scene_id));
create policy "Scene admins create rulesets"
  on public.rulesets for insert to authenticated
  with check (created_by = (select auth.uid()) and private.is_scene_admin(scene_id, (select auth.uid())));

create policy "Versions follow ruleset visibility"
  on public.ruleset_versions for select to anon, authenticated
  using (exists (select 1 from public.rulesets r where r.id = ruleset_id));
-- No update/delete policies: published versions are permanent history.
create policy "Scene admins publish versions"
  on public.ruleset_versions for insert to authenticated
  with check (
    published_by = (select auth.uid())
    and exists (
      select 1 from public.rulesets r
      where r.id = ruleset_id and private.is_scene_admin(r.scene_id, (select auth.uid()))
    )
  );

-- ---------- Rulesets attached to events ----------
-- target_type 'series' = every edition of a weekly (key like "the-contract--san-antonio")
-- target_type 'tournament' = one start.gg tournament (key = its slug)
create table public.event_rulesets (
  id uuid primary key default gen_random_uuid(),
  ruleset_id uuid not null references public.rulesets (id) on delete cascade,
  game text not null check (game in ('melee', 'ultimate', 'pplus')),
  target_type text not null check (target_type in ('series', 'tournament')),
  target_key text not null check (char_length(target_key) between 1 and 200),
  attached_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (target_type, target_key, game)
);
alter table public.event_rulesets enable row level security;

grant select on public.event_rulesets to anon, authenticated;
grant insert (ruleset_id, game, target_type, target_key, attached_by) on public.event_rulesets to authenticated;
grant delete on public.event_rulesets to authenticated;

create policy "Attachments of visible rulesets are public"
  on public.event_rulesets for select to anon, authenticated
  using (exists (select 1 from public.rulesets r where r.id = ruleset_id));
create policy "Scene admins attach their rulesets"
  on public.event_rulesets for insert to authenticated
  with check (
    attached_by = (select auth.uid())
    and exists (
      select 1 from public.rulesets r
      where r.id = ruleset_id and r.game = event_rulesets.game
        and private.is_scene_admin(r.scene_id, (select auth.uid()))
    )
  );
create policy "Scene admins detach their rulesets"
  on public.event_rulesets for delete to authenticated
  using (exists (
    select 1 from public.rulesets r
    where r.id = ruleset_id and private.is_scene_admin(r.scene_id, (select auth.uid()))
  ));

-- ---------- Ruleset discussion: posts can belong to a ruleset ----------
alter table public.posts add column ruleset_id uuid references public.rulesets (id) on delete cascade;
create index posts_ruleset_idx on public.posts (ruleset_id, created_at) where parent_id is null;
revoke insert on public.posts from authenticated;
grant insert (author_id, parent_id, game, body, ruleset_id) on public.posts to authenticated;

-- Replies inherit the parent's ruleset (extends the existing trigger function).
create or replace function private.before_post_insert() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare
  parent record;
begin
  if new.parent_id is not null then
    select p.parent_id, p.game, p.ruleset_id into parent from public.posts p where p.id = new.parent_id;
    if not found then raise exception 'Post not found'; end if;
    if parent.parent_id is not null then raise exception 'Replies can''t have replies'; end if;
    new.game := parent.game;
    new.ruleset_id := parent.ruleset_id;
  elsif new.ruleset_id is not null then
    select r.game into new.game from public.rulesets r where r.id = new.ruleset_id;
  end if;

  if (select count(*) from public.posts p
       where p.author_id = new.author_id and p.created_at > now() - interval '1 minute') >= 5 then
    raise exception 'You''re posting too fast. Wait a minute and try again.' using errcode = 'P0429';
  end if;
  return new;
end;
$$;

-- Supabase grants table-wide writes to API roles by default. Remove them all, then re-grant
-- only the exact columns users may write (so nobody can e.g. set their own scene to 'active').
revoke insert, update, delete on public.scenes, public.scene_admins, public.rulesets,
  public.ruleset_versions, public.event_rulesets from anon, authenticated;

grant insert (slug, name, region, cities, games, description, requested_by) on public.scenes to authenticated;
grant insert (scene_id, user_id, message) on public.scene_admins to authenticated;
grant insert (scene_id, game, name, created_by) on public.rulesets to authenticated;
grant insert (ruleset_id, version, rules, notes, changelog, published_by) on public.ruleset_versions to authenticated;
grant insert (ruleset_id, game, target_type, target_key, attached_by) on public.event_rulesets to authenticated;
grant delete on public.event_rulesets to authenticated;
