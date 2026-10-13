-- Apply in your Supabase SQL editor. One owner workspace per account for this prototype.
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  role text not null check (role in ('Site reliability engineer', 'Backend engineer', 'Platform / DevOps', 'Exploring the product')),
  source text not null check (source in ('demo', 'later')),
  team_size text not null check (team_size in ('Just me', '2–10', '11–50', '51+')),
  goal text not null check (goal in ('Investigate incidents faster', 'Review repairs with confidence', 'Verify recovery', 'Explore the prototype')),
  created_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
revoke all on public.workspaces from anon;
grant select, insert, update on public.workspaces to authenticated;
create policy "Owners read their workspace" on public.workspaces for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners create their workspace" on public.workspaces for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners update their workspace" on public.workspaces for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
