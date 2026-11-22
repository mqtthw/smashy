-- Highlights: guides, combo videos, and other showcases on profiles.
-- Tagged with game + character + type so the resource hub (next slice) can collect them.
-- Same visibility as posts: under-18 authors' highlights need sign-in; moderators can remove.

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('combo_video', 'guide', 'matchup', 'tech', 'frame_data', 'other')),
  title text not null check (char_length(btrim(title)) between 3 and 100),
  game text not null check (game in ('melee', 'ultimate', 'pplus')),
  character text check (character is null or character ~ '^[a-z0-9-]{2,40}$'),
  url text check (url is null or (url ~ '^https://[^\s]+$' and char_length(url) <= 500)),
  description text check (description is null or char_length(description) <= 300),
  guide_body text check (guide_body is null or char_length(guide_body) <= 20000),
  removed_at timestamptz,
  removed_reason text,
  created_at timestamptz not null default now(),
  check (url is not null or guide_body is not null)
);
create index highlights_author_idx on public.highlights (author_id, created_at desc);
create index highlights_hub_idx on public.highlights (game, character, created_at desc) where removed_at is null;

alter table public.highlights enable row level security;
revoke all on public.highlights from anon, authenticated;
grant select on public.highlights to anon, authenticated;
grant insert (author_id, type, title, game, character, url, description, guide_body) on public.highlights to authenticated;
grant delete on public.highlights to authenticated;

create policy "Highlights visible like posts"
  on public.highlights for select to anon, authenticated
  using (
    (removed_at is null or author_id = (select auth.uid()))
    and ((select auth.uid()) is not null or not private.is_minor(author_id))
  );

create policy "Users add their own highlights"
  on public.highlights for insert to authenticated
  with check (author_id = (select auth.uid()));

create policy "Users delete their own highlights"
  on public.highlights for delete to authenticated
  using (author_id = (select auth.uid()));

-- Spam brake: 10 highlights per hour.
create function private.before_highlight_insert() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.highlights h
       where h.author_id = new.author_id and h.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'You''ve added a lot of highlights recently. Try again in a bit.' using errcode = 'P0429';
  end if;
  return new;
end;
$$;
create trigger highlights_before_insert before insert on public.highlights
  for each row execute function private.before_highlight_insert();

-- Reports + moderation reuse the "live" reports queue.
alter table public.live_reports drop constraint live_reports_kind_check;
alter table public.live_reports add constraint live_reports_kind_check check (kind in ('chat', 'lobby', 'highlight'));
alter table public.moderation_actions drop constraint moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check
  check (action in ('remove_post', 'restore_post', 'dismiss_reports', 'remove_chat', 'close_lobby', 'dismiss_live', 'remove_highlight'));
