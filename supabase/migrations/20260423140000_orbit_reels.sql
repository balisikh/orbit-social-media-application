-- Orbit reels (short videos for the Reels player).

create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  caption text,
  video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reels_user_id_created_at_idx on public.reels (user_id, created_at desc);

comment on table public.reels is 'Orbit reels authored by a user.';

alter table public.reels enable row level security;

create policy "reels_select_public"
  on public.reels for select
  using (true);

create policy "reels_insert_own"
  on public.reels for insert
  with check (auth.uid() = user_id);

create policy "reels_update_own"
  on public.reels for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reels_delete_own"
  on public.reels for delete
  using (auth.uid() = user_id);

