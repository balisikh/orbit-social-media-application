-- Follow requests (when profile owner enables approval before new followers).

alter table public.profiles
  add column if not exists require_follow_approval boolean not null default false;

comment on column public.profiles.require_follow_approval is
  'When true, Follow creates a pending follow_requests row instead of inserting into follows.';

create table if not exists public.follow_requests (
  id uuid not null primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users (id) on delete cascade,
  followed_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- At most one pending request per pair; new request after decline is a new row.
create unique index if not exists follow_requests_one_pending_per_pair
  on public.follow_requests (follower_id, followed_id)
  where (status = 'pending');

create index if not exists follow_requests_followed_pending_idx
  on public.follow_requests (followed_id, created_at desc)
  where (status = 'pending');

comment on table public.follow_requests is
  'Pending or resolved follow requests; pending rows gate access until accepted.';

alter table public.follow_requests enable row level security;

create policy "follow_requests_select_participant"
  on public.follow_requests for select
  using (auth.uid() = follower_id or auth.uid() = followed_id);

create policy "follow_requests_insert_as_follower"
  on public.follow_requests for insert
  with check (auth.uid() = follower_id and follower_id <> followed_id);

create policy "follow_requests_update_as_followed"
  on public.follow_requests for update
  using (auth.uid() = followed_id)
  with check (auth.uid() = followed_id);

create policy "follow_requests_delete_follower_pending"
  on public.follow_requests for delete
  using (auth.uid() = follower_id and status = 'pending');

grant select, insert, update, delete on public.follow_requests to authenticated;

-- Atomic accept: mark resolved + insert into follows (idempotent on duplicate follow).
create or replace function public.orbit_accept_follow_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.follow_requests%rowtype;
begin
  select * into r from public.follow_requests where id = request_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if r.followed_id <> auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if r.status <> 'pending' then
    raise exception 'not_pending' using errcode = 'P0001';
  end if;

  update public.follow_requests
  set status = 'accepted', resolved_at = now()
  where id = request_id;

  insert into public.follows (follower_id, followed_id)
  values (r.follower_id, r.followed_id)
  on conflict do nothing;
end;
$$;

comment on function public.orbit_accept_follow_request(uuid) is
  'Profile owner accepts a pending follow request and creates the follows row.';

revoke all on function public.orbit_accept_follow_request(uuid) from public;
grant execute on function public.orbit_accept_follow_request(uuid) to authenticated;
