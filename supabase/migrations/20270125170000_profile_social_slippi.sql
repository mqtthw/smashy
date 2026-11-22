-- Slippi connect code on player pages (round 690), next to the other socials (rounds 425-426): stored as
-- "ABCD#123" (the site links it to the player's slippi.gg page), adults only, same as the other socials:
-- a connect code lets someone start a match with you, so under-18 accounts (and accounts with no birthday,
-- private.is_minor) can't show one. First step toward "Challenge in Melee Unlocked" (docs/open-source-plan.md).

alter table public.profiles
  add column social_slippi text check (social_slippi is null or social_slippi ~ '^[A-Z0-9]{1,7}#[0-9]{1,7}$');

create or replace function private.check_profile_socials() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if (new.social_twitch is not null or new.social_youtube is not null or new.social_x is not null
      or new.social_instagram is not null or new.social_bluesky is not null or new.social_reddit is not null
      or new.social_slippi is not null)
     and private.is_minor(new.id) then
    raise exception 'Socials on your profile are for players 18 and older.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger profiles_socials_adults on public.profiles;
create trigger profiles_socials_adults before insert or update of social_twitch, social_youtube, social_x, social_instagram, social_bluesky, social_reddit, social_slippi
  on public.profiles for each row execute function private.check_profile_socials();

grant update (social_slippi) on public.profiles to authenticated;
