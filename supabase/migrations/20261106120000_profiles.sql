-- Slice 2a: accounts, 13+ age gate, basic profiles.
-- Row-level security (RLS) means the database itself enforces who can read/write each row,
-- so a bug in the app can't leak or overwrite someone else's data.

-- ---------- Private data: only the owner can read it ----------
create table public.private_profile_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Smashy is 13+. The database refuses younger birthdates even if the app has a bug.
  date_of_birth date not null
    check (date_of_birth <= (current_date - interval '13 years'))
    check (date_of_birth >= date '1900-01-01'),
  created_at timestamptz not null default now()
);

alter table public.private_profile_data enable row level security;

revoke all on public.private_profile_data from anon;
grant select, insert on public.private_profile_data to authenticated;

create policy "Users read their own private data"
  on public.private_profile_data for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add their own private data"
  on public.private_profile_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- No update/delete policies: birthdates can't be changed by users (prevents age-gate gaming).

-- ---------- Public profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tag text not null check (char_length(btrim(tag)) between 1 and 30),
  home_city text check (home_city is null or char_length(home_city) <= 60),
  games text[] not null default '{}'
    check (games <@ array['melee', 'ultimate', 'pplus']::text[]),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

create policy "Profiles are public"
  on public.profiles for select to anon, authenticated
  using (true);

-- A profile can only be created after the age gate (private data row exists).
create policy "Users create their own profile after the age gate"
  on public.profiles for insert to authenticated
  with check (
    (select auth.uid()) = id
    and exists (select 1 from public.private_profile_data p where p.user_id = (select auth.uid()))
  );

create policy "Users edit their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Keep updated_at current.
create function public.set_updated_at() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
