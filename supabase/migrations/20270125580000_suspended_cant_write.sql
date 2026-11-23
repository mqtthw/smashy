-- A suspended account can't write with the session it already has (review 2.7, round 768).
--
-- Suspending uses Supabase Auth's ban: no new sign-in, and the session isn't renewed. Smashy's own
-- actions ask the sign-in service each time, so they refuse a suspended account at once (checked with
-- a test account). But the session token itself stays good for up to an hour, and with it someone can
-- still write straight to the database wherever the rules allow a member to (posts, messages, chat,
-- likes, follows and so on).
--
-- This adds a list of suspended accounts (kept by the app when an admin suspends or lifts a
-- suspension) and one extra rule on every table members can write to: not while suspended.
-- Reading is unchanged. Safe to run twice.

create table if not exists public.suspended_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  suspended_at timestamptz not null default now()
);
alter table public.suspended_accounts enable row level security;
-- Server-only: no policies, and no access for visitors or members.
revoke all on public.suspended_accounts from anon, authenticated;

-- Accounts that are suspended right now.
insert into public.suspended_accounts (user_id)
select id from auth.users where banned_until is not null and banned_until > now()
on conflict (user_id) do nothing;

create or replace function private.is_suspended()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.suspended_accounts where user_id = (select auth.uid()));
$$;
revoke all on function private.is_suspended() from public;
grant execute on function private.is_suspended() to anon, authenticated;

-- The extra rule, on every table in public that lets a member add or change rows.
do $$
declare
  t record;
begin
  for t in
    select distinct tablename
    from pg_policies
    where schemaname = 'public'
      and cmd in ('INSERT', 'UPDATE', 'ALL')
      and permissive = 'PERMISSIVE'
      and tablename <> 'suspended_accounts'
  loop
    execute format('drop policy if exists "Not while suspended (add)" on public.%I', t.tablename);
    execute format('drop policy if exists "Not while suspended (change)" on public.%I', t.tablename);
    execute format(
      'create policy "Not while suspended (add)" on public.%I as restrictive for insert to authenticated with check (not (select private.is_suspended()))',
      t.tablename);
    execute format(
      'create policy "Not while suspended (change)" on public.%I as restrictive for update to authenticated using (not (select private.is_suspended())) with check (not (select private.is_suspended()))',
      t.tablename);
  end loop;
end $$;
