-- Row Level Security for affirmations tables

-- Affirmations: anyone authenticated can read approved; authors can see their own
alter table public.affirmations enable row level security;

create policy "Anyone can read approved affirmations"
  on public.affirmations for select
  to authenticated
  using (status = 'approved');

create policy "Users can insert affirmations (submissions)"
  on public.affirmations for insert
  to authenticated
  with check (submitted_by = auth.uid());

create policy "Users can see own pending submissions"
  on public.affirmations for select
  to authenticated
  using (submitted_by = auth.uid());

-- Saved affirmations: users manage their own
alter table public.saved_affirmations enable row level security;

create policy "Users can manage own saved affirmations"
  on public.saved_affirmations for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Affirmation preferences: users manage their own
alter table public.affirmation_preferences enable row level security;

create policy "Users can manage own affirmation preferences"
  on public.affirmation_preferences for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
