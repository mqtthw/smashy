-- Notifications for Smashy's store apps (apps/mobile). Inside an app, web push isn't available, so each
-- phone gives Smashy a device token from its own push service (Firebase on Android, Apple's on iPhone).
-- This keeps those tokens next to web push devices (push_subscriptions), with the same rules: people see
-- and remove only their own, and an 11th device replaces the oldest. Nothing existing changes.

create table public.app_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  -- Firebase tokens are letters, digits and : _ - ; Apple's are 64 hex characters.
  token text not null unique check (token ~ '^[A-Za-z0-9:_-]+$' and char_length(token) between 32 and 4096),
  created_at timestamptz not null default now()
);
create index app_push_devices_user_idx on public.app_push_devices (user_id);

alter table public.app_push_devices enable row level security;
revoke all on public.app_push_devices from anon, authenticated;
grant select, delete on public.app_push_devices to authenticated;
grant insert (user_id, platform, token) on public.app_push_devices to authenticated;
create policy "Own app push devices" on public.app_push_devices
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- An 11th device replaces the oldest one (as for web push).
create or replace function private.cap_app_push_devices() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  delete from public.app_push_devices d
   where d.user_id = new.user_id
     and d.id in (select o.id from public.app_push_devices o where o.user_id = new.user_id order by o.created_at desc offset 9);
  return new;
end;
$$;
create trigger app_push_devices_cap before insert on public.app_push_devices for each row execute function private.cap_app_push_devices();
