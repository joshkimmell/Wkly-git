-- Affirmations feature: core tables

-- 1. Affirmations: the main content table
create table if not exists public.affirmations (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text not null default 'General',
  author text,
  source text,
  is_featured boolean not null default false,
  submitted_by uuid references auth.users(id) on delete set null,
  is_anonymous boolean not null default false,
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  featured_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Saved affirmations (user favorites)
create table if not exists public.saved_affirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  affirmation_id uuid not null references public.affirmations(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique(user_id, affirmation_id)
);

-- 3. Affirmation preferences per user
create table if not exists public.affirmation_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  daily_notification boolean not null default true,
  notification_time time not null default '09:00',
  preferred_categories text[] not null default '{"General"}',
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_affirmations_featured_date on public.affirmations(featured_date);
create index if not exists idx_affirmations_status on public.affirmations(status);
create index if not exists idx_affirmations_category on public.affirmations(category);
create index if not exists idx_saved_affirmations_user on public.saved_affirmations(user_id);
create index if not exists idx_affirmation_prefs_user on public.affirmation_preferences(user_id);

-- Grant access to authenticated users
grant select on public.affirmations to authenticated;
grant insert on public.affirmations to authenticated;
grant select, insert, delete on public.saved_affirmations to authenticated;
grant select, insert, update on public.affirmation_preferences to authenticated;
