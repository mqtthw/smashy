-- Socials on player pages (round 425): Twitch, YouTube, X, Instagram and Bluesky, so streamers and
-- creators can point people to their channels.
--
-- Each is stored as a bare handle (the site builds the link), so a field can only ever lead to that
-- site's profile page, never to an arbitrary link. Names, bios, cities and crews stay free of contact
-- info as before (private.check_profile_contact); these fields are the one place handles go.
--
-- Adults only: under-18 accounts can't share contact details anywhere on Smashy, and an account with
-- no birthday counts as under 18 (private.is_minor), the same rule the rest of the site uses.

alter table public.profiles
  add column social_twitch text check (social_twitch is null or social_twitch ~ '^[A-Za-z0-9_]{3,25}$'),
  add column social_youtube text check (social_youtube is null or social_youtube ~ '^[A-Za-z0-9._-]{3,30}$'),
  add column social_x text check (social_x is null or social_x ~ '^[A-Za-z0-9_]{1,15}$'),
  add column social_instagram text check (social_instagram is null or social_instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  add column social_bluesky text check (social_bluesky is null or (char_length(social_bluesky) <= 100 and social_bluesky ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'));

create function private.check_profile_socials() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if (new.social_twitch is not null or new.social_youtube is not null or new.social_x is not null
      or new.social_instagram is not null or new.social_bluesky is not null)
     and private.is_minor(new.id) then
    raise exception 'Socials on your profile are for players 18 and older.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger profiles_socials_adults before insert or update of social_twitch, social_youtube, social_x, social_instagram, social_bluesky
  on public.profiles for each row execute function private.check_profile_socials();

grant update (social_twitch, social_youtube, social_x, social_instagram, social_bluesky) on public.profiles to authenticated;
