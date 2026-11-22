-- Review fix: channels found automatically (from majors' start.gg stream names, which any TO can type)
-- no longer go live in Reels by themselves. They wait for a site admin to approve them.
-- Also: comments/quotes on a hidden clip (or one from an unapproved/blocked channel) are refused.

alter table public.reel_channels add column approved boolean not null default false;
update public.reel_channels set approved = true where source = 'admin';

drop policy "Visible reels are public" on public.reels;
create policy "Visible reels are public" on public.reels for select to anon, authenticated
  using (
    not hidden
    and exists (select 1 from public.reel_channels c where c.login = channel_login and c.approved and not c.blocked)
  );

-- Can't talk about a clip people can't see. (Foreign keys skip row rules, so check it here.)
create or replace function private.check_reel_post() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare clip text := coalesce(new.reel_clip_id, new.quote_reel_id);
begin
  if clip is not null and not exists (
    select 1 from public.reels r join public.reel_channels c on c.login = r.channel_login
    where r.clip_id = clip and not r.hidden and c.approved and not c.blocked
  ) then
    raise exception 'This clip isn''t available.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger posts_check_reel before insert on public.posts
  for each row when (new.reel_clip_id is not null or new.quote_reel_id is not null)
  execute function private.check_reel_post();
