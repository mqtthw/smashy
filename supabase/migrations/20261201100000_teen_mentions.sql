-- Under-18s can @mention people (Matthew's decision, 2026-11-10).
--
-- The rule that keeps contact info out of teens' posts reads "@name" as a social media handle, so a
-- teen who picked someone from the composer's @ suggestions got "Sharing or asking for contact info
-- isn't allowed here." Now an @name that belongs to someone on Smashy is treated as a mention, and
-- everything else in the post is still checked as before. An @name that isn't a Smashy handle is
-- still refused, and so is "add @name on insta" (the rest of the sentence gives it away).
--
-- Only posts and replies (and editing them) change. Titles, messages, profiles, highlights, polls
-- and event details have no mentions, so they keep the strict rule.

-- The text with the "@" taken off every @name that is a real Smashy handle ("gg @mango!" becomes
-- "gg mango!"). Uses the same idea of what a mention is as the mention notifications.
create or replace function private.without_mentions(t text) returns text
  language plpgsql stable security definer
  set search_path = ''
as $$
declare h text; cleaned text := t; n int := 0;
begin
  if t is null or position('@' in t) = 0 then return t; end if;
  for h in
    select distinct m[1]
      from regexp_matches(t, '(?:^|[^A-Za-z0-9_&/])@([A-Za-z0-9_]{3,20})(?![A-Za-z0-9_])', 'g') as m
  loop
    exit when n >= 20; -- far more @names than a post can notify: stop looking
    n := n + 1;
    if exists (select 1 from public.profiles p where p.handle = lower(h)) then
      cleaned := regexp_replace(cleaned, '(^|[^A-Za-z0-9_&/])@' || h || '(?![A-Za-z0-9_])', '\1' || h, 'g');
    end if;
  end loop;
  return cleaned;
end;
$$;
revoke all on function private.without_mentions(text) from public;

-- New posts and replies by under-18s. Unchanged except that real mentions are allowed.
create or replace function private.check_teen_contact() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if private.is_minor(new.author_id) and private.has_contact_info(private.without_mentions(new.body)) then
    raise exception 'Sharing or asking for contact info isn''t allowed here.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Editing a post. Unchanged except that real mentions are allowed.
create or replace function public.edit_post(post uuid, new_body text) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare p record; b text := btrim(coalesce(new_body, ''));
begin
  select * into p from public.posts where id = post;
  if p is null or p.author_id is distinct from auth.uid() then raise exception 'You can only edit your own posts.' using errcode = 'P0001'; end if;
  if p.removed_at is not null then raise exception 'This post was removed.' using errcode = 'P0001'; end if;
  if p.created_at < now() - interval '15 minutes' then raise exception 'Posts can only be edited for 15 minutes.' using errcode = 'P0001'; end if;
  if char_length(b) not between 1 and (case when p.title is null then 500 else 5000 end) then
    raise exception 'Posts can be 1 to % characters.', (case when p.title is null then 500 else 5000 end) using errcode = 'P0001';
  end if;
  if private.is_minor(p.author_id) and private.has_contact_info(private.without_mentions(b)) then
    raise exception 'Posts can''t include phone numbers, emails or social handles.' using errcode = 'P0001';
  end if;
  perform private.rate_limit('edit_post', 20, interval '10 minutes');
  update public.posts set body = b, edited_at = now() where id = post;
end;
$$;
