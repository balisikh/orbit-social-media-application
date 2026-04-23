-- Orbit follows (who follows who).

create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followed_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id)
);

create index if not exists follows_followed_idx on public.follows (followed_id, created_at desc);

comment on table public.follows is 'Follow relationships between auth users.';

alter table public.follows enable row level security;

create policy "follows_select_public"
  on public.follows for select
  using (true);

create policy "follows_insert_own"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "follows_delete_own"
  on public.follows for delete
  using (auth.uid() = follower_id);

