-- Photos and videos together on a post (round 450, Matthew's request): up to 4 attachments in any mix,
-- at most 2 of them videos. Each video now has a place in the post's order (0–3), shared with the
-- photos' positions (the server gives every attachment its own place). Before this, a post had photos
-- or one video, never both.
-- Loosens one rule (one video per post) and adds a column with a default, so every existing post is
-- unchanged: its video keeps place 0.

alter table public.post_videos add column position smallint not null default 0 check (position between 0 and 3);

drop index public.post_videos_post_idx;
create unique index post_videos_post_position_idx on public.post_videos (post_id, position) where post_id is not null;

-- Backstop for the 2-video limit (the server checks first; only the server writes this table).
create or replace function private.post_videos_limit() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if new.post_id is not null
     and (select count(*) from public.post_videos v where v.post_id = new.post_id and v.id <> new.id) >= 2 then
    raise exception 'A post can have at most 2 videos.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.post_videos_limit() from public;
create trigger post_videos_limit before insert or update of post_id on public.post_videos
  for each row execute function private.post_videos_limit();
