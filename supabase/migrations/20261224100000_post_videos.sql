-- Videos on posts (one per post). Like photos, the server does the work: the browser drops the
-- raw file in a private "post-video-uploads" bucket (straight to storage: it's too big to pass
-- through the website's server), then the server checks it, re-saves it as a plain MP4 (which also
-- removes hidden data such as where a phone video was filmed), checks frames from it with the
-- automatic safety service, and stores the result in the public "post-videos" bucket. People never
-- write to the public bucket or this table directly.
--
-- The finished files have long random names. The table's rows follow the post's privacy (a teen's
-- post's video is only listed to signed-in people), but like any video on the web, someone who has
-- the exact address can open the file.

-- Raw uploads: private, at most 50 MB (Supabase's free plan allows 50 MB per file), common phone and
-- camera formats. Files here are deleted as soon as they're processed (or after a day if not).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-video-uploads', 'post-video-uploads', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

-- Finished videos (MP4) and their still pictures (WebP): public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-videos', 'post-videos', true, 52428800, array['video/mp4', 'image/webp'])
on conflict (id) do nothing;

create table public.post_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,   -- who uploaded it
  post_id uuid references public.posts (id) on delete set null,      -- null until posted (or after the post is deleted)
  status text not null default 'uploading' check (status in ('uploading', 'ready', 'failed')),
  raw_path text not null unique,                                     -- the upload, in post-video-uploads (removed once processed)
  path text unique,                                                  -- the finished MP4, in post-videos
  poster_path text unique,                                           -- its still picture (WebP), in post-videos
  width int check (width > 0),
  height int check (height > 0),
  duration_ms int check (duration_ms > 0),
  attached_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'ready' or (path is not null and poster_path is not null and width is not null and height is not null and duration_ms is not null))
);
-- One video per post.
create unique index post_videos_post_idx on public.post_videos (post_id) where post_id is not null;
create index post_videos_user_idx on public.post_videos (user_id, created_at desc);
create index post_videos_loose_idx on public.post_videos (created_at) where post_id is null;

alter table public.post_videos enable row level security;
revoke all on public.post_videos from anon, authenticated;
grant select on public.post_videos to anon, authenticated;
-- Visible when it's finished and its post is visible to you (the posts table's own rules decide:
-- teen posts need sign-in, removed posts only to their author, and so on).
create policy "Videos follow their post" on public.post_videos for select to anon, authenticated
  using (status = 'ready' and post_id is not null and exists (select 1 from public.posts p where p.id = post_id));
