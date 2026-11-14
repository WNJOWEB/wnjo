-- Your judgement of each site the template test writes, so quality can be compared across runs and models.
-- Only the server writes and reads this (with the service role), so row-level security is on with no policies.
create table if not exists public.template_test_ratings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  template text not null,
  business text not null,
  rating text not null check (rating in ('good', 'needs_work')),
  note text,
  rated_by uuid,
  created_at timestamptz not null default now()
);

alter table public.template_test_ratings enable row level security;
