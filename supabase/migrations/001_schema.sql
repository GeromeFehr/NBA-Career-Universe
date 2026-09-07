create extension if not exists pgcrypto;

create table if not exists teams(
  id uuid primary key default gen_random_uuid(),
  nba_id text unique,
  city text not null,
  name text not null,
  abbreviation text not null unique,
  conference text,
  division text,
  primary_color text,
  secondary_color text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists seasons(
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  start_date date not null,
  end_date date not null,
  current boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists career_profiles(
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  position text,
  jersey_number int,
  overall int not null default 75 check(overall between 25 and 99),
  draft_year int,
  draft_round int,
  draft_pick int,
  current_team_id uuid references teams(id),
  rookie_season_id uuid references seasons(id),
  universe_date date not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists world_settings(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null unique references career_profiles(id) on delete cascade,
  universe_date date not null,
  media_intensity int not null default 8 check(media_intensity between 0 and 10),
  auto_media boolean not null default true,
  auto_trade_rumors boolean not null default true,
  current_season_id uuid references seasons(id),
  updated_at timestamptz not null default now()
);

create table if not exists games(
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  source_key text not null unique,
  external_id text,
  game_date timestamptz not null,
  game_day date not null,
  stage text not null default 'Regular Season',
  home_team_id uuid references teams(id),
  away_team_id uuid references teams(id),
  home_score int,
  away_score int,
  status text not null default 'scheduled',
  venue text,
  broadcast text,
  data_source text,
  counts_toward_standings boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint different_teams check(home_team_id is null or away_team_id is null or home_team_id<>away_team_id)
);
create index if not exists games_date_idx on games(game_date);
create index if not exists games_day_idx on games(game_day);
create index if not exists games_home_idx on games(home_team_id);
create index if not exists games_away_idx on games(away_team_id);

create table if not exists team_stints(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  team_id uuid not null references teams(id),
  start_date date not null,
  end_date date,
  acquisition text,
  departure text,
  created_at timestamptz not null default now()
);
create index if not exists team_stints_career_idx on team_stints(career_id,start_date);

create table if not exists player_game_stats(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  team_id uuid not null references teams(id),
  appearance_status text not null default 'played',
  minutes numeric(5,1) not null default 0,
  points int not null default 0,
  rebounds int not null default 0,
  assists int not null default 0,
  steals int not null default 0,
  blocks int not null default 0,
  turnovers int not null default 0,
  fouls int not null default 0,
  technical_fouls int not null default 0,
  flagrant_fouls int not null default 0,
  fgm int not null default 0,
  fga int not null default 0,
  tpm int not null default 0,
  tpa int not null default 0,
  ftm int not null default 0,
  fta int not null default 0,
  plus_minus int,
  started boolean not null default false,
  fouled_out boolean not null default false,
  ejected boolean not null default false,
  injured boolean not null default false,
  injury_note text,
  story_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(career_id,game_id)
);

create table if not exists game_notables(
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_name text not null,
  team_abbreviation text,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists injuries(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  source_game_id uuid references games(id) on delete set null,
  start_date date not null,
  end_date date,
  injury text not null,
  severity text,
  status text not null default 'active',
  games_missed int not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists career_events(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  event_date date not null,
  event_type text not null,
  title text,
  from_team_id uuid references teams(id),
  to_team_id uuid references teams(id),
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists story_arcs(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  category text not null,
  title text not null,
  summary text not null,
  status text not null default 'active',
  intensity int not null default 50 check(intensity between 0 and 100),
  started_on date not null,
  resolved_on date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists trade_interest(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  team_id uuid not null references teams(id),
  interest_score int not null check(interest_score between 0 and 100),
  rationale text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(career_id,team_id)
);

create table if not exists trade_offers(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  from_team_id uuid references teams(id),
  to_team_id uuid not null references teams(id),
  interest_score int not null default 50,
  fairness_score int not null default 50,
  package_summary text not null,
  rationale text,
  pressure text,
  status text not null default 'pending',
  generated_by text not null default 'manual',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists media_posts(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  game_id uuid references games(id) on delete cascade,
  player_stat_id uuid references player_game_stats(id) on delete set null,
  outlet text not null,
  kind text not null,
  author_name text,
  tone text,
  headline text not null,
  body text not null,
  virality int not null default 50 check(virality between 0 and 100),
  generation_source text not null default 'manual',
  created_at timestamptz not null default now()
);
create index if not exists media_recent_idx on media_posts(career_id,created_at desc);

create table if not exists award_snapshots(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  season_id uuid not null references seasons(id),
  award text not null,
  rank int not null,
  score numeric,
  note text,
  as_of_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists milestones(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  game_id uuid references games(id) on delete cascade,
  code text not null,
  title text not null,
  description text not null,
  achieved_at timestamptz not null default now(),
  unique(career_id,game_id,code)
);

create table if not exists relationships(
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references career_profiles(id) on delete cascade,
  person_name text not null,
  role text,
  sentiment int not null default 0 check(sentiment between -100 and 100),
  notes text,
  updated_at timestamptz not null default now(),
  unique(career_id,person_name)
);

create table if not exists schedule_sync_log(
  id uuid primary key default gen_random_uuid(),
  source text not null,
  imported_count int not null default 0,
  skipped_count int not null default 0,
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create or replace view team_game_results as
select g.id game_id,g.season_id,g.home_team_id team_id,
  case when g.home_score>g.away_score then 1 else 0 end win,
  case when g.home_score<g.away_score then 1 else 0 end loss
from games g where g.status='completed' and g.counts_toward_standings=true and g.home_team_id is not null
union all
select g.id,g.season_id,g.away_team_id,
  case when g.away_score>g.home_score then 1 else 0 end,
  case when g.away_score<g.home_score then 1 else 0 end
from games g where g.status='completed' and g.counts_toward_standings=true and g.away_team_id is not null;

create or replace view standings as
select t.id team_id,t.abbreviation,t.city,t.name,r.season_id,
  coalesce(sum(r.win),0)::int wins,coalesce(sum(r.loss),0)::int losses
from teams t left join team_game_results r on r.team_id=t.id
group by t.id,t.abbreviation,t.city,t.name,r.season_id;

alter table teams enable row level security;
alter table seasons enable row level security;
alter table career_profiles enable row level security;
alter table world_settings enable row level security;
alter table games enable row level security;
alter table team_stints enable row level security;
alter table player_game_stats enable row level security;
alter table game_notables enable row level security;
alter table injuries enable row level security;
alter table career_events enable row level security;
alter table story_arcs enable row level security;
alter table trade_interest enable row level security;
alter table trade_offers enable row level security;
alter table media_posts enable row level security;
alter table award_snapshots enable row level security;
alter table milestones enable row level security;
alter table relationships enable row level security;
alter table schedule_sync_log enable row level security;

-- No anon policies on purpose. The app reads/writes through server-side service-role calls only.
