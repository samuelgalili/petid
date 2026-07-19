create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  upload_id uuid not null references public.user_uploads(id) on delete restrict,
  caption text,
  location text,
  media_type text not null check (media_type in ('image', 'video')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  allow_comments boolean not null default true,
  poll_question text,
  poll_options jsonb not null default '[]'::jsonb,
  moderation_status text not null default 'published' check (moderation_status in ('published', 'hidden', 'review')),
  archived boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (caption is null or char_length(caption) <= 2000),
  check (location is null or char_length(location) <= 160),
  check (poll_question is null or char_length(poll_question) <= 240),
  check (jsonb_typeof(poll_options) = 'array')
);

create table if not exists public.social_post_reactions (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  reaction text not null default 'like' check (reaction in ('like')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.social_post_saves (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.social_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  parent_id uuid references public.social_post_comments(id) on delete cascade,
  body text not null,
  status text not null default 'published' check (status in ('published', 'deleted', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(body) between 1 and 500)
);

create table if not exists public.social_poll_votes (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  option_index integer not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_social_posts_feed
  on public.social_posts(published_at desc, id desc)
  where archived = false and moderation_status = 'published' and visibility = 'public';

create index if not exists idx_social_posts_user
  on public.social_posts(user_id, published_at desc)
  where archived = false;

create index if not exists idx_social_posts_pet
  on public.social_posts(pet_id, published_at desc)
  where archived = false;

create index if not exists idx_social_reactions_post
  on public.social_post_reactions(post_id, created_at desc);

create index if not exists idx_social_saves_user
  on public.social_post_saves(user_id, created_at desc);

create index if not exists idx_social_comments_post
  on public.social_post_comments(post_id, created_at asc)
  where status = 'published';

create index if not exists idx_social_poll_votes_post
  on public.social_poll_votes(post_id, option_index);
