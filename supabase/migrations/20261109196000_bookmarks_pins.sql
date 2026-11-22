-- Bookmarks (private saved posts) and one pinned post per profile.
create table public.bookmarks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index bookmarks_user_idx on public.bookmarks (user_id, created_at desc);
alter table public.bookmarks enable row level security;
revoke all on public.bookmarks from anon, authenticated;
grant select, insert, delete on public.bookmarks to authenticated;
create policy "Bookmarks are private" on public.bookmarks for select to authenticated using (user_id = (select auth.uid()));
create policy "People save for themselves" on public.bookmarks for insert to authenticated with check (user_id = (select auth.uid()));
create policy "People unsave for themselves" on public.bookmarks for delete to authenticated using (user_id = (select auth.uid()));

alter table public.profiles add column pinned_post_id uuid references public.posts (id) on delete set null;
grant update (pinned_post_id) on public.profiles to authenticated;
-- You can only pin your own top-level post.
create function private.check_pinned_post() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.pinned_post_id is not null and new.pinned_post_id is distinct from old.pinned_post_id
     and not exists (select 1 from public.posts where id = new.pinned_post_id and author_id = new.id and parent_id is null and removed_at is null) then
    raise exception 'You can only pin your own posts.' using errcode = 'P0001';
  end if;
  return new;
end; $$;
create trigger profiles_check_pinned before update of pinned_post_id on public.profiles for each row execute function private.check_pinned_post();
