-- Profile pictures. The server shrinks each to a 400px square, removes hidden data, runs the same
-- safety check as post photos, then stores it (bucket "avatars", random names). People can't set
-- avatar_path themselves.
alter table public.profiles add column avatar_path text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp'])
on conflict (id) do nothing;
