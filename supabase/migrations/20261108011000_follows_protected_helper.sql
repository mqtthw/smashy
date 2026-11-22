-- Fix: the follows visibility rule checked "is either account protected?" by reading profiles
-- as the viewer. Guests can't see teen profiles at all, so the check returned "not protected"
-- and could reveal that someone follows a teen. Check protection with a private helper instead.
create function private.is_protected(uid uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$ select coalesce((select p.protected from public.profiles p where p.id = uid), true); $$;
revoke all on function private.is_protected(uuid) from public;
grant execute on function private.is_protected(uuid) to anon, authenticated;

drop policy "Follows visible unless a protected account is involved" on public.follows;
create policy "Follows visible unless a protected account is involved"
  on public.follows for select to anon, authenticated
  using (
    follower_id = (select auth.uid()) or followee_id = (select auth.uid())
    or (status = 'active' and not private.is_protected(follower_id) and not private.is_protected(followee_id))
  );
