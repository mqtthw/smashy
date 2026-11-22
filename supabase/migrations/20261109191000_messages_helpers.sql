-- Helpers for the Messages pages.

-- Can I send in this conversation right now?
create function public.conversation_can_send(conv uuid) returns boolean
  language sql stable security invoker set search_path = ''
as $$ select private.can_send(conv, auth.uid()); $$;

-- People I could message: same age band, no block either way, not me. People I follow each other
-- with come first (their messages go straight through); a search finds anyone else (as a request).
create function public.messageable_people(q text default '') returns table (id uuid, tag text, handle text, mutual boolean)
  language sql stable security definer set search_path = ''
as $$
  select p.id, p.tag, p.handle, private.is_mutual(auth.uid(), p.id) as mutual
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and private.age_band(p.id) = private.age_band(auth.uid())
    and not private.is_blocked(auth.uid(), p.id)
    and (
      (coalesce(btrim(q), '') = '' and private.is_mutual(auth.uid(), p.id))
      or (char_length(btrim(q)) >= 2 and (p.handle ilike btrim(q) || '%' or p.tag ilike '%' || btrim(q) || '%'))
    )
  order by private.is_mutual(auth.uid(), p.id) desc, p.tag
  limit 30;
$$;

revoke all on function public.conversation_can_send(uuid), public.messageable_people(text) from public, anon;
grant execute on function public.conversation_can_send(uuid), public.messageable_people(text) to authenticated;
