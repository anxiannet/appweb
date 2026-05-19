create extension if not exists pgcrypto;

create table if not exists public.life_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  author_id uuid references auth.users(id) on delete set null,
  body text not null,
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
  image_path text,
  reply_count integer not null default 0 check (reply_count >= 0)
);

alter table public.life_posts
add column if not exists image_path text;

alter table public.life_posts
drop constraint if exists life_posts_body_check;

alter table public.life_posts
add constraint life_posts_body_check
check (
  char_length(body) <= 500
  and (char_length(body) >= 1 or image_path is not null)
);

alter table public.life_posts enable row level security;

drop policy if exists "anyone can read public life posts" on public.life_posts;
create policy "anyone can read public life posts"
on public.life_posts
for select
to anon, authenticated
using (true);

drop policy if exists "anyone can publish short public life posts" on public.life_posts;
create policy "anyone can publish short public life posts"
on public.life_posts
for insert
to anon, authenticated
with check (
  char_length(body) <= 500
  and (char_length(body) >= 1 or image_path is not null)
  and (author_id is null or auth.uid() = author_id)
);

grant usage on schema public to anon, authenticated;
grant select, insert on public.life_posts to anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'life-post-images',
  'life-post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anyone can view life post images" on storage.objects;
create policy "anyone can view life post images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'life-post-images');

drop policy if exists "anyone can upload life post images" on storage.objects;
create policy "anyone can upload life post images"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'life-post-images'
  and lower((storage.foldername(name))[1]) = 'public'
);

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
