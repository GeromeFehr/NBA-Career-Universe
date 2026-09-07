-- v3.0 Universe OS: rivalries, reputation, personas, goals, records, playoffs,
-- trophy room, trade sagas, interviews, recaps and legacy scoring.

alter table media_posts add column if not exists language text not null default 'de'
  check (language in ('de','en'));
alter table story_arcs add column if not exists language text not null default 'de'
  check (language in ('de','en'));
alter table milestones add column if not exists language text not null default 'de'
  check (language in ('de','en'));
alter table career_events add column if not exists language text not null default 'de'
  check (language in ('de','en'));

create table if not exists universe_reputation(
  career_id uuid primary key references career_profiles(id) on delete cascade,
  league_reputation int not null default 50 check(league_reputation between 0 and 100),
  star_power int not null default 50 check(star_power between 0 and 100),
  media_hype int not null default 50 check(media_hype between 0 and 100),
  fan_approval int not null default 50 check(fan_approval between 0 and 100),
  expert_respect int not null default 50 check(expert_respect between 0 and 100),
  hater_heat int not null default 35 check(hater_heat between 0 and 100),
  cultural_impact int not null default 35 check(cultural_impact between 0 and 100),
  updated_at timestamptz not null default now()
);

create table if not exists rivalries(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  opponent_team_id uuid references teams(id),
  person_name text,
  rivalry_type text not null default 'team' check(rivalry_type in ('team','person')),
  heat int not null default 25 check(heat between 0 and 100),
  wins int not null default 0,
  losses int not null default 0,
  meetings int not null default 0,
  reason text,
  status text not null default 'active',
  last_game_id uuid references games(id) on delete set null,
  updated_at timestamptz not null default now()
);
create unique index if not exists rivalries_team_unique
  on rivalries(career_id,opponent_team_id) where opponent_team_id is not null;
create unique index if not exists rivalries_person_unique
  on rivalries(career_id,person_name) where person_name is not null;

create table if not exists persona_memories(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  persona_key text not null,
  persona_name text not null,
  role text not null,
  stance text not null default 'neutral',
  sentiment int not null default 0 check(sentiment between -100 and 100),
  memory text not null,
  source_game_id uuid references games(id) on delete set null,
  language text not null default 'de' check(language in ('de','en')),
  updated_at timestamptz not null default now(),
  unique(career_id,persona_key,language)
);

create table if not exists pregame_coverage(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  language text not null default 'de' check(language in ('de','en')),
  headline text not null,
  body text not null,
  key_question text not null,
  expert_picks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(career_id,game_id,language)
);

create table if not exists postgame_grades(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  language text not null default 'de' check(language in ('de','en')),
  overall_grade text not null,
  scoring int not null check(scoring between 0 and 100),
  playmaking int not null check(playmaking between 0 and 100),
  defense int not null check(defense between 0 and 100),
  efficiency int not null check(efficiency between 0 and 100),
  discipline int not null check(discipline between 0 and 100),
  summary text not null,
  created_at timestamptz not null default now(),
  unique(career_id,game_id,language)
);

create table if not exists season_goals(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  language text not null default 'de' check(language in ('de','en')),
  code text not null,
  title text not null,
  target numeric not null default 1,
  progress numeric not null default 0,
  status text not null default 'active' check(status in ('active','completed','failed')),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(career_id,season_id,code,language)
);

create table if not exists career_records(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  season_id uuid references seasons(id) on delete cascade,
  scope text not null check(scope in ('career','season','playoffs')),
  category text not null,
  value numeric not null,
  game_id uuid references games(id) on delete set null,
  label text not null,
  language text not null default 'de' check(language in ('de','en')),
  updated_at timestamptz not null default now()
);
create unique index if not exists career_records_unique
  on career_records(career_id,coalesce(season_id,'00000000-0000-0000-0000-000000000000'::uuid),scope,category,language);

create table if not exists trophies(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  season_id uuid references seasons(id) on delete set null,
  trophy_type text not null,
  title text not null,
  detail text,
  awarded_on date not null,
  language text not null default 'de' check(language in ('de','en')),
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists trade_sagas(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  target_team_id uuid references teams(id),
  status text not null default 'active' check(status in ('active','resolved','cancelled')),
  heat int not null default 40 check(heat between 0 and 100),
  title text not null,
  summary text not null,
  started_on date not null,
  language text not null default 'de' check(language in ('de','en')),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists trade_saga_updates(
  id uuid primary key default gen_random_uuid(),
  saga_id uuid not null references trade_sagas(id) on delete cascade,
  update_date date not null,
  kind text not null,
  headline text not null,
  body text not null,
  language text not null default 'de' check(language in ('de','en')),
  created_at timestamptz not null default now()
);

create table if not exists interviews(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  game_id uuid references games(id) on delete set null,
  interview_date date not null,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  answered_option text,
  answer_text text,
  impact jsonb not null default '{}'::jsonb,
  language text not null default 'de' check(language in ('de','en')),
  status text not null default 'open' check(status in ('open','answered','skipped')),
  created_at timestamptz not null default now()
);

create table if not exists fanbase_metrics(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  segment text not null,
  team_id uuid references teams(id) on delete cascade,
  approval int not null default 50 check(approval between 0 and 100),
  heat int not null default 20 check(heat between 0 and 100),
  updated_at timestamptz not null default now()
);
create unique index if not exists fanbase_metrics_unique
  on fanbase_metrics(career_id,segment,coalesce(team_id,'00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists season_recaps(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  language text not null default 'de' check(language in ('de','en')),
  title text not null,
  summary text not null,
  stats jsonb not null default '{}'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  legacy_delta int not null default 0,
  created_at timestamptz not null default now(),
  unique(career_id,season_id,language)
);

create table if not exists legacy_scores(
  career_id uuid primary key references career_profiles(id) on delete cascade,
  score int not null default 0 check(score between 0 and 100),
  breakdown jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists screenshot_scans(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  game_id uuid references games(id) on delete set null,
  overall_confidence int not null default 0 check(overall_confidence between 0 and 100),
  field_confidence jsonb not null default '{}'::jsonb,
  recognized_values jsonb not null default '{}'::jsonb,
  language text not null default 'de' check(language in ('de','en')),
  created_at timestamptz not null default now()
);

-- RLS
alter table universe_reputation enable row level security;
alter table rivalries enable row level security;
alter table persona_memories enable row level security;
alter table pregame_coverage enable row level security;
alter table postgame_grades enable row level security;
alter table season_goals enable row level security;
alter table career_records enable row level security;
alter table trophies enable row level security;
alter table trade_sagas enable row level security;
alter table trade_saga_updates enable row level security;
alter table interviews enable row level security;
alter table fanbase_metrics enable row level security;
alter table season_recaps enable row level security;
alter table legacy_scores enable row level security;
alter table screenshot_scans enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'universe_reputation','rivalries','persona_memories','pregame_coverage','postgame_grades',
    'season_goals','career_records','trophies','trade_sagas','interviews','fanbase_metrics',
    'season_recaps','legacy_scores','screenshot_scans'
  ] loop
    execute format('drop policy if exists %I_select on %I',t,t);
    execute format('create policy %I_select on %I for select to anon, authenticated using (public.can_read_career(career_id))',t,t);
    execute format('drop policy if exists %I_write on %I',t,t);
    execute format('create policy %I_write on %I for all to authenticated using (public.can_write_career(career_id)) with check (public.can_write_career(career_id))',t,t);
  end loop;
end $$;

drop policy if exists trade_saga_updates_select on trade_saga_updates;
create policy trade_saga_updates_select on trade_saga_updates
for select to anon,authenticated using (
  exists(select 1 from trade_sagas s where s.id=saga_id and public.can_read_career(s.career_id))
);
drop policy if exists trade_saga_updates_write on trade_saga_updates;
create policy trade_saga_updates_write on trade_saga_updates
for all to authenticated using (
  exists(select 1 from trade_sagas s where s.id=saga_id and public.can_write_career(s.career_id))
) with check (
  exists(select 1 from trade_sagas s where s.id=saga_id and public.can_write_career(s.career_id))
);

-- Seed baseline reputation/legacy for existing careers.
insert into universe_reputation(career_id)
select id from career_profiles
on conflict(career_id) do nothing;

insert into legacy_scores(career_id)
select id from career_profiles
on conflict(career_id) do nothing;
