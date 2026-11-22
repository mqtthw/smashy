-- Safety: the "no contact info" rule (links, emails, phone numbers, social handles, "add me on…")
-- already covered Play chat and lobbies. Now it also covers everything a teen posts: posts, replies,
-- quotes, set comments and clip comments. Same filter as chat (private.has_contact_info).
create or replace function private.check_teen_contact() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if private.is_minor(new.author_id) and private.has_contact_info(new.body) then
    raise exception 'Sharing or asking for contact info isn''t allowed here.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger posts_teen_contact before insert on public.posts
  for each row execute function private.check_teen_contact();
