-- Opening sign-ups (2026-11-10): slower posting for new accounts. For an account's first 7 days it
-- can make at most 10 posts and replies an hour. Everything else in this function is unchanged
-- from 20261107210000_reposts_quotes.sql (including the 5-a-minute limit for everyone).
create or replace function private.before_post_insert() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
declare
  parent record;
begin
  if new.parent_id is not null then
    select p.parent_id, p.game, p.ruleset_id, p.removed_at into parent from public.posts p where p.id = new.parent_id;
    if not found or parent.removed_at is not null then raise exception 'Post not found'; end if;
    if parent.parent_id is not null then raise exception 'Replies can''t have replies'; end if;
    if new.quote_of is not null then raise exception 'Replies can''t quote posts'; end if;
    new.game := parent.game;
    new.ruleset_id := parent.ruleset_id;
  elsif new.ruleset_id is not null then
    select r.game into new.game from public.rulesets r where r.id = new.ruleset_id;
  end if;

  if new.quote_of is not null and not exists (
    select 1 from public.posts q where q.id = new.quote_of and q.removed_at is null
  ) then
    raise exception 'Post not found';
  end if;

  if (select count(*) from public.posts p
       where p.author_id = new.author_id and p.created_at > now() - interval '1 minute') >= 5 then
    raise exception 'You''re posting too fast. Wait a minute and try again.' using errcode = 'P0429';
  end if;

  -- New accounts: at most 10 posts and replies an hour for their first 7 days. Only counts when
  -- the person is posting as themself (not the server), and never applies to site admins.
  if (select auth.uid()) = new.author_id
     and not private.is_site_admin(new.author_id)
     and exists (select 1 from public.profiles pr
                  where pr.id = new.author_id and pr.created_at > now() - interval '7 days')
     and (select count(*) from public.posts p
           where p.author_id = new.author_id and p.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'New accounts can post 10 times an hour in their first week. Try again in a bit.' using errcode = 'P0429';
  end if;
  return new;
end;
$$;
