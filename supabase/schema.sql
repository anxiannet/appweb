create extension if not exists pgcrypto;

create table if not exists public.life_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  body text not null check (char_length(body) between 1 and 500),
  author_name text not null default '匿名用户',
  author_handle text,
  category text not null check (
    category in ('租房', '二手', '拼车', '美食', '避雷', '找搭子', '活动', '求职')
  ),
  district text,
  school text,
  price text,
  time_hint text,
  place text,
  tags text[] not null default '{}',
  ai_summary text not null,
  reply_count integer not null default 0 check (reply_count >= 0)
);

alter table public.life_posts enable row level security;

create policy "anyone can read public life posts"
on public.life_posts
for select
to anon, authenticated
using (true);

create policy "anyone can publish short public life posts"
on public.life_posts
for insert
to anon, authenticated
with check (char_length(body) between 1 and 500);

grant usage on schema public to anon, authenticated;
grant select, insert on public.life_posts to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'life_posts'
  ) then
    alter publication supabase_realtime add table public.life_posts;
  end if;
end $$;
