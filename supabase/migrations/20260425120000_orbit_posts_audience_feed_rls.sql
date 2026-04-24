-- Post audience + feed-safe RLS: public posts readable broadly; "followers" posts only for author + followers.

alter table public.posts
  add column if not exists audience text not null default 'public';

alter table public.posts
  drop constraint if exists posts_audience_check;

alter table public.posts
  add constraint posts_audience_check check (audience in ('public', 'followers'));

comment on column public.posts.audience is 'public: visible on profiles to everyone; followers: only author and accounts that follow the author.';

-- Replace wide-open read policy with audience-aware rules.
drop policy if exists "posts_select_public" on public.posts;

create policy "posts_select_audience"
  on public.posts for select
  using (
    auth.uid() = user_id
    or audience = 'public'
    or (
      audience = 'followers'
      and auth.uid() is not null
      and exists (
        select 1
        from public.follows f
        where f.follower_id = auth.uid()
          and f.followed_id = posts.user_id
      )
    )
  );
