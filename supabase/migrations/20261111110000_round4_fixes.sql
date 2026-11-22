-- Round 4 fixes (backward compatible with the live site).

-- Invite codes: a wrong code used to raise an error, which rolled back the attempt the rate limit had
-- just logged, so wrong guesses were never counted. Now a wrong code just returns (the logged attempt
-- stays, so 10 tries an hour really is the limit); the app checks needs_invite() afterwards to say
-- the code didn't work. Older app code still gets a clear message when it then tries to make the
-- profile ("Smashy is invite-only right now...").
create or replace function public.redeem_invite(p_code text) returns void
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid(); c record; k text := upper(btrim(coalesce(p_code, '')));
begin
  if me is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.invite_redemptions where user_id = me) then return; end if;
  perform private.rate_limit('invite', 10, interval '1 hour');
  select * into c from public.invite_codes where code = k for update;
  if c is null or c.disabled or c.uses >= c.max_uses or (c.expires_at is not null and c.expires_at < now()) then
    return; -- not valid: keep the logged attempt (no error = no rollback)
  end if;
  update public.invite_codes set uses = uses + 1 where code = k;
  insert into public.invite_redemptions (user_id, code) values (me, k);
end;
$$;
