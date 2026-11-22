-- Reddit on player pages (round 426), next to the socials from round 425. Same rules: a bare
-- username only (the site builds the link), adults only.

alter table public.profiles
  add column social_reddit text check (social_reddit is null or social_reddit ~ '^[A-Za-z0-9_-]{3,20}$');

create or replace function private.check_profile_socials() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if (new.social_twitch is not null or new.social_youtube is not null or new.social_x is not null
      or new.social_instagram is not null or new.social_bluesky is not null or new.social_reddit is not null)
     and private.is_minor(new.id) then
    raise exception 'Socials on your profile are for players 18 and older.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger profiles_socials_adults on public.profiles;
create trigger profiles_socials_adults before insert or update of social_twitch, social_youtube, social_x, social_instagram, social_bluesky, social_reddit
  on public.profiles for each row execute function private.check_profile_socials();

grant update (social_reddit) on public.profiles to authenticated;
