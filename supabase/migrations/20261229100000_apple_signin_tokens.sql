-- Sign in with Apple: the refresh token Apple gives for each person who signs in with Apple in the
-- iPhone app, so deleting their Smashy account can cancel the link (Apple's rule 5.1.1(v)); see
-- src/lib/appleSignIn.ts. Only the server reads or writes it: no access for guests or members.
-- Nothing existing changes.

create table public.apple_signin_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null check (char_length(refresh_token) between 10 and 2000),
  updated_at timestamptz not null default now()
);

alter table public.apple_signin_tokens enable row level security;
revoke all on public.apple_signin_tokens from anon, authenticated;
