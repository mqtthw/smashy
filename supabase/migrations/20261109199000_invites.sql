-- Private beta: making a profile needs an invite code (while invite-only is on). Accounts that
-- already have a profile aren't affected. Site admins create codes on Admin > Invites.

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  invite_only boolean not null default true
);
insert into public.app_settings default values;

create table public.invite_codes (
  code text primary key check (code ~ '^[A-Z0-9-]{4,32}$'),
  note text check (note is null or char_length(note) <= 80),   -- who it's for, e.g. "SA weekly crew"
  max_uses int not null default 1 check (max_uses between 1 and 500),
  uses int not null default 0,
  disabled boolean not null default false,
  expires_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.invite_redemptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text references public.invite_codes (code) on delete set null,
  redeemed_at timestamptz not null default now()
);

-- Server-only tables (codes must not be listable by anyone).
alter table public.app_settings enable row level security;
alter table public.invite_codes enable row level security;
alter table public.invite_redemptions enable row level security;
revoke all on public.app_settings, public.invite_codes, public.invite_redemptions from anon, authenticated;

create function private.invite_only() returns boolean
  language sql stable security definer set search_path = ''
as $$ select coalesce((select invite_only from public.app_settings where id = 1), true); $$;

-- Use a code for your account (once). Raises a friendly message if it can't be used.
create function public.redeem_invite(p_code text) returns void
  language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid(); c record; k text := upper(btrim(coalesce(p_code, '')));
begin
  if me is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.invite_redemptions where user_id = me) then return; end if;
  perform private.rate_limit('invite', 10, interval '1 hour');
  select * into c from public.invite_codes where code = k for update;
  if c is null or c.disabled or c.uses >= c.max_uses or (c.expires_at is not null and c.expires_at < now()) then
    raise exception 'That invite code isn''t valid or has been used up.' using errcode = 'P0001';
  end if;
  update public.invite_codes set uses = uses + 1 where code = k;
  insert into public.invite_redemptions (user_id, code) values (me, k);
end;
$$;
revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;

-- Can I make a profile without a code? (For the Welcome page.)
create function public.needs_invite() returns boolean
  language sql stable security definer set search_path = ''
as $$ select private.invite_only() and not exists (select 1 from public.invite_redemptions where user_id = auth.uid()); $$;
revoke all on function public.needs_invite() from public, anon;
grant execute on function public.needs_invite() to authenticated;

create function private.before_profile_invite() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.invite_only() and not exists (select 1 from public.invite_redemptions where user_id = new.id) then
    raise exception 'Smashy is invite-only right now. Enter an invite code to join.' using errcode = 'P0001';
  end if;
  return new;
end; $$;
create trigger profiles_invite_gate before insert on public.profiles for each row execute function private.before_profile_invite();
