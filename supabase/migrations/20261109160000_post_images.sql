-- Images on posts (up to 4). The server does everything: it shrinks each image, removes hidden data
-- (like where a photo was taken), checks it with an automatic safety service, then stores it in the
-- "post-images" bucket. People never write to storage or this table directly.
--
-- Files have long random names. The table's rows follow the post's privacy (a teen's post's images
-- are only listed to signed-in people), but like any image on the web, someone who has the exact
-- address can open the file.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 2097152, array['image/webp'])
on conflict (id) do nothing;

create table public.post_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,   -- who uploaded it
  post_id uuid references public.posts (id) on delete set null,      -- null until posted (or after the post is deleted)
  position smallint not null default 0 check (position between 0 and 3),
  path text not null unique,                                         -- file in the post-images bucket
  width int not null check (width > 0),
  height int not null check (height > 0),
  alt text not null default '' check (char_length(alt) <= 300),      -- description for screen readers
  attached_at timestamptz,
  created_at timestamptz not null default now()
);
create index post_images_post_idx on public.post_images (post_id, position) where post_id is not null;
create index post_images_user_idx on public.post_images (user_id, created_at desc);
create index post_images_loose_idx on public.post_images (created_at) where post_id is null;

alter table public.post_images enable row level security;
revoke all on public.post_images from anon, authenticated;
grant select on public.post_images to anon, authenticated;
-- Visible when its post is visible to you (the posts table's own rules decide: teen posts need sign-in,
-- removed posts only to their author, and so on).
create policy "Images follow their post" on public.post_images for select to anon, authenticated
  using (post_id is not null and exists (select 1 from public.posts p where p.id = post_id));
