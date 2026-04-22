-- Orbit public profiles (run via Supabase CLI or SQL Editor: Dashboard → SQL → New query).
-- Links each auth user to a unique @handle and optional display fields.

create table if not exists public.profiles (
  id uuid not null primary key references auth.users (id) on delete cascade,
  handle text,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_format check (
    handle is null
    or (
      char_length(handle) >= 3
      and char_length(handle) <= 30
      and handle ~ '^[a-z0-9_]+$'
    )
  )
);

create unique index if not exists profiles_handle_lower_uidx on public.profiles (lower(handle));

comment on table public.profiles is 'Orbit user-facing profile; handle matches auth user_metadata.username';

-- RLS
alter table public.profiles enable row level security;

create policy "profiles_select_public"
  on public.profiles for select
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- New auth users get a profile row (handle from signup metadata when present).
create or replace function public.orbit_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
begin
  v_handle := nullif(lower(trim(new.raw_user_meta_data ->> 'username')), '');
  if v_handle is not null and not (v_handle ~ '^[a-z0-9_]{3,30}$') then
    v_handle := null;
  end if;

  insert into public.profiles (id, handle, updated_at)
  values (new.id, v_handle, now())
  on conflict (id) do update
    set
      handle = coalesce(excluded.handle, public.profiles.handle),
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists orbit_on_auth_user_created on auth.users;
create trigger orbit_on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.orbit_handle_new_user();
