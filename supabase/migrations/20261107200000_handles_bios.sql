-- Public profiles: every profile gets a unique @handle (used in /u/handle URLs) and a short bio.

alter table public.profiles add column handle text, add column bio text;

-- Give existing profiles a handle based on their tag (adding part of the id if it's taken or too short).
update public.profiles p
set handle = h.handle
from (
  select id,
         case
           when char_length(base) < 3 or row_number() over (partition by base order by created_at) > 1
             then left(coalesce(nullif(base, ''), 'player'), 14) || '_' || left(replace(id::text, '-', ''), 5)
           else base
         end as handle
  from (select id, created_at, left(lower(regexp_replace(tag, '[^a-zA-Z0-9_]', '', 'g')), 20) as base from public.profiles) b
) h
where p.id = h.id;

alter table public.profiles
  alter column handle set not null,
  add constraint profiles_handle_format check (handle ~ '^[a-z0-9_]{3,20}$'),
  add constraint profiles_handle_reserved check (handle not in ('admin', 'smashy', 'mod', 'moderator', 'support', 'staff', 'official', 'help', 'me', 'settings')),
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 160);
create unique index profiles_handle_key on public.profiles (handle);

-- Users may set these profile fields (insert at signup; update their own row).
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, tag, home_city, games, handle, bio) on public.profiles to authenticated;
grant update (tag, home_city, games, handle, bio) on public.profiles to authenticated;
