-- AI request/token/cost telemetry. Safe to run after the same SQL was added manually.
create table if not exists ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  career_id uuid references career_profiles(id) on delete cascade,
  universe_id uuid references universes(id) on delete cascade,
  game_id uuid references games(id) on delete set null,
  feature text not null,
  model text not null,
  request_count int not null default 1,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  total_tokens int not null default 0,
  estimated_cost_usd numeric(10,6) not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table ai_usage_logs enable row level security;
drop policy if exists ai_usage_logs_select on ai_usage_logs;
create policy ai_usage_logs_select on ai_usage_logs
for select to anon,authenticated using(public.can_read_career(career_id));
drop policy if exists ai_usage_logs_write on ai_usage_logs;
create policy ai_usage_logs_write on ai_usage_logs
for all to authenticated using(public.can_write_career(career_id))
with check(public.can_write_career(career_id));

create index if not exists ai_usage_logs_career_created_idx
  on ai_usage_logs(career_id,created_at desc);
