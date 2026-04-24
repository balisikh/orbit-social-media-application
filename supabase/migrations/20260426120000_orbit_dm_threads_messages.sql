-- Direct messages: one row per user pair, messages with sender + body.

create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references auth.users (id) on delete cascade,
  user_high uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dm_threads_distinct_users check (user_low <> user_high),
  constraint dm_threads_ordered_pair check (
    user_low = least (user_low, user_high)
    and user_high = greatest (user_low, user_high)
  ),
  constraint dm_threads_pair_unique unique (user_low, user_high)
);

create index if not exists dm_threads_user_low_updated_idx on public.dm_threads (user_low, updated_at desc);
create index if not exists dm_threads_user_high_updated_idx on public.dm_threads (user_high, updated_at desc);

comment on table public.dm_threads is '1:1 DM thread between two auth users (ordered pair user_low < user_high).';

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint dm_messages_body_len check (char_length(body) <= 2000),
  constraint dm_messages_body_nonempty check (btrim(body) <> '')
);

create index if not exists dm_messages_thread_created_idx on public.dm_messages (thread_id, created_at desc);

comment on table public.dm_messages is 'Text DM body; attachments can be added later (e.g. storage URLs).';

-- Bump thread updated_at when a message is inserted (runs as table owner).
create or replace function public.dm_threads_set_updated_on_message ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dm_threads
  set updated_at = new.created_at
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists dm_messages_touch_thread on public.dm_messages;
create trigger dm_messages_touch_thread
  after insert on public.dm_messages
  for each row
  execute function public.dm_threads_set_updated_on_message ();

-- Get or create thread for auth.uid() and peer (ordered pair enforced inside).
create or replace function public.orbit_get_or_create_dm_thread (peer_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  lo uuid;
  hi uuid;
  tid uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if peer_id = uid then
    raise exception 'invalid peer';
  end if;
  lo := least(uid, peer_id);
  hi := greatest(uid, peer_id);
  insert into public.dm_threads (user_low, user_high)
  values (lo, hi)
  on conflict on constraint dm_threads_pair_unique do nothing
  returning id into tid;
  if tid is not null then
    return tid;
  end if;
  select t.id into tid
  from public.dm_threads t
  where t.user_low = lo and t.user_high = hi;
  return tid;
end;
$$;

grant execute on function public.orbit_get_or_create_dm_thread (uuid) to authenticated;

alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;

-- Threads: participants only
create policy "dm_threads_select_participant"
  on public.dm_threads for select
  using (auth.uid () = user_low or auth.uid () = user_high);

create policy "dm_threads_insert_participant"
  on public.dm_threads for insert
  with check (auth.uid () = user_low or auth.uid () = user_high);

create policy "dm_threads_delete_participant"
  on public.dm_threads for delete
  using (auth.uid () = user_low or auth.uid () = user_high);

-- Messages: read if in thread; insert only as self and only if participant
create policy "dm_messages_select_participant"
  on public.dm_messages for select
  using (
    exists (
      select 1
      from public.dm_threads t
      where t.id = dm_messages.thread_id
        and (t.user_low = auth.uid () or t.user_high = auth.uid ())
    )
  );

create policy "dm_messages_insert_sender_participant"
  on public.dm_messages for insert
  with check (
    sender_id = auth.uid ()
    and exists (
      select 1
      from public.dm_threads t
      where t.id = thread_id
        and (t.user_low = auth.uid () or t.user_high = auth.uid ())
    )
  );

create policy "dm_messages_delete_own"
  on public.dm_messages for delete
  using (sender_id = auth.uid ());
