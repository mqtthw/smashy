-- Fix: hiding the connect_code column from readers also blocked counting sign-ups (the event pages and
-- cards count hosted_entrants), so events showed "not found". Connect codes move to their own table that
-- only their owner can read (the server shows them to the opponent and the host), and sign-ups are
-- readable again.

create table public.hosted_connect_codes (
  event_id uuid not null references public.hosted_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  code text not null check (
    code ~ '^[A-Za-z0-9#: /-]{2,40}$'
    and (code ~* '^SW[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}$' or not private.has_contact_info(code))
  ),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.hosted_connect_codes enable row level security;
revoke all on public.hosted_connect_codes from anon, authenticated;
grant select, delete on public.hosted_connect_codes to authenticated;
grant insert (event_id, user_id, code) on public.hosted_connect_codes to authenticated;
grant update (code, updated_at) on public.hosted_connect_codes to authenticated;
create policy "Own connect codes" on public.hosted_connect_codes for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.hosted_entrants e where e.event_id = hosted_connect_codes.event_id and e.user_id = (select auth.uid())));

-- Carry over codes already saved, then clear the old column (no longer used).
insert into public.hosted_connect_codes (event_id, user_id, code)
  select event_id, user_id, connect_code from public.hosted_entrants where connect_code is not null
  on conflict do nothing;
update public.hosted_entrants set connect_code = null where connect_code is not null;
revoke update (connect_code) on public.hosted_entrants from authenticated;

-- Sign-ups readable again (and countable) by everyone.
grant select on public.hosted_entrants to anon, authenticated;
