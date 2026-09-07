-- NBA Career Universe v2: multi-user + multi-universe architecture

create table if not exists universes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique default encode(gen_random_bytes(8),'hex'),
  visibility text not null default 'private' check (visibility in ('private','public')),
  current_season_id uuid references seasons(id),
  universe_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table career_profiles
  add column if not exists universe_id uuid references universes(id) on delete cascade;

create unique index if not exists career_profiles_universe_unique
  on career_profiles(universe_id);

create table if not exists universe_games (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references universes(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  home_score int,
  away_score int,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  story_notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(universe_id, game_id)
);

create index if not exists universe_games_universe_idx on universe_games(universe_id, game_id);

alter table game_notables
  add column if not exists career_id uuid references career_profiles(id) on delete cascade;

create index if not exists game_notables_career_game_idx on game_notables(career_id, game_id);

-- Convert every pre-v2 career into its own unclaimed legacy universe.
do $$
declare
  r record;
  u uuid;
begin
  for r in
    select id, player_name, universe_date, rookie_season_id
    from career_profiles
    where universe_id is null
  loop
    insert into universes(owner_id, name, current_season_id, universe_date)
    values (
      null,
      coalesce(nullif(r.player_name,''), 'Legacy Career') || ' · Legacy',
      r.rookie_season_id,
      r.universe_date
    )
    returning id into u;

    update career_profiles set universe_id = u where id = r.id;

    insert into universe_games(universe_id, game_id, home_score, away_score, status, story_notes, completed_at)
    select
      u,
      p.game_id,
      g.home_score,
      g.away_score,
      'completed',
      p.story_notes,
      coalesce(p.updated_at, p.created_at, now())
    from player_game_stats p
    join games g on g.id = p.game_id
    where p.career_id = r.id
    on conflict(universe_id, game_id) do update
      set home_score = excluded.home_score,
          away_score = excluded.away_score,
          status = excluded.status,
          story_notes = excluded.story_notes,
          completed_at = excluded.completed_at,
          updated_at = now();
  end loop;

  update game_notables n
  set career_id = p.career_id
  from player_game_stats p
  where n.career_id is null and p.game_id = n.game_id;
end $$;

alter table career_profiles alter column universe_id set not null;

create or replace function public.can_read_universe(target_universe uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from universes u
    where u.id = target_universe
      and (u.visibility = 'public' or u.owner_id = auth.uid())
  );
$$;

create or replace function public.can_write_universe(target_universe uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from universes u
    where u.id = target_universe
      and u.owner_id = auth.uid()
  );
$$;

create or replace function public.can_read_career(target_career uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from career_profiles c
    where c.id = target_career
      and public.can_read_universe(c.universe_id)
  );
$$;

create or replace function public.can_write_career(target_career uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from career_profiles c
    where c.id = target_career
      and public.can_write_universe(c.universe_id)
  );
$$;

alter table universes enable row level security;
alter table universe_games enable row level security;

drop policy if exists shared_read_teams on teams;
create policy shared_read_teams on teams for select to anon, authenticated using (true);

drop policy if exists shared_read_seasons on seasons;
create policy shared_read_seasons on seasons for select to anon, authenticated using (true);

drop policy if exists shared_read_games on games;
create policy shared_read_games on games for select to anon, authenticated using (true);

drop policy if exists universes_select on universes;
create policy universes_select on universes
for select to anon, authenticated
using (public.can_read_universe(id));

drop policy if exists universes_insert on universes;
create policy universes_insert on universes
for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists universes_update on universes;
create policy universes_update on universes
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists universes_delete on universes;
create policy universes_delete on universes
for delete to authenticated
using (owner_id = auth.uid());

drop policy if exists universe_games_select on universe_games;
create policy universe_games_select on universe_games
for select to anon, authenticated
using (public.can_read_universe(universe_id));

drop policy if exists universe_games_write on universe_games;
create policy universe_games_write on universe_games
for all to authenticated
using (public.can_write_universe(universe_id))
with check (public.can_write_universe(universe_id));

drop policy if exists career_profiles_select on career_profiles;
create policy career_profiles_select on career_profiles
for select to anon, authenticated
using (public.can_read_universe(universe_id));

drop policy if exists career_profiles_write on career_profiles;
create policy career_profiles_write on career_profiles
for all to authenticated
using (public.can_write_universe(universe_id))
with check (public.can_write_universe(universe_id));

drop policy if exists world_settings_select on world_settings;
create policy world_settings_select on world_settings for select to anon, authenticated using (public.can_read_career(career_id));
drop policy if exists world_settings_write on world_settings;
create policy world_settings_write on world_settings for all to authenticated using (public.can_write_career(career_id)) with check (public.can_write_career(career_id));

drop policy if exists team_stints_select on team_stints;
create policy team_stints_select on team_stints for select to anon, authenticated using (public.can_read_career(career_id));
drop policy if exists team_stints_write on team_stints;
create policy team_stints_write on team_stints for all to authenticated using (public.can_write_career(career_id)) with check (public.can_write_career(career_id));

drop policy if exists player_game_stats_select on player_game_stats;
create policy player_game_stats_select on player_game_stats for select to anon, authenticated using (public.can_read_career(career_id));
drop policy if exists player_game_stats_write on player_game_stats;
create policy player_game_stats_write on player_game_stats for all to authenticated using (public.can_write_career(career_id)) with check (public.can_write_career(career_id));

drop policy if exists game_notables_select on game_notables;
create policy game_notables_select on game_notables for select to anon, authenticated using (career_id is not null and public.can_read_career(career_id));
drop policy if exists game_notables_write on game_notables;
create policy game_notables_write on game_notables for all to authenticated using (career_id is not null and public.can_write_career(career_id)) with check (career_id is not null and public.can_write_career(career_id));

drop policy if exists injuries_select on injuries;
create policy injuries_select on injuries for select to anon, authenticated using (public.can_read_career(career_id));
drop policy if exists injuries_write on injuries;
create policy injuries_write on injuries for all to authenticated using (public.can_write_career(career_id)) with check (public.can_write_career(career_id));

drop policy if exists career_events_select on career_events;
create policy career_events_select on career_events for select to anon, authenticated using (public.can_read_career(career_id));
drop policy if exists career_events_write on career_events;
create policy career_events_write on career_events for all to authenticated using (public.can_write_career(career_id)) with check (public.can_write_career(career_id));

drop policy if exists story_arcs_select on story_arcs;
create policy story_arcs_select on story_arcs for select to anon, authenticated using (public.can_read_career(career_id));
drop policy if exists story_arcs_write on story_arcs;
create policy story_arcs_write on story_arcs for all to authenticated using (public.can_write_career(career_id)) with check (public.can_write_career(career_id));

drop policy if exists trade_interest_select on trade_interest;
create policy trade_interest_select on trade_interest for select to anon, authenticated using (public.can_read_career(career_id));
drop policy if exists trade_interest_write on trade_interest;
create policy trade_interest_write on trade_interest for all to authenticated using (public.can_write_career(career_id)) with check (public.can_write_career(career_id));

drop policy if exists trade_offers_select on trade_offers;
create policy trade_offers_select on trade_offers for select to anon, authenticated using (public.can_read_career(career_id));
drop policy if exists trade_offers_write on trade_offers;
create policy trade_offers_write on trade_offers for all to authenticated using (public.can_write_career(career_id)) with check (public.can_write_career(career_id));

drop policy if exists media_posts_select on media_posts;
create policy media_posts_select on media_posts for select to anon, authenticated using (public.can_read_career(career_id));
drop policy if exists media_posts_write on media_posts;
create policy media_posts_write on media_posts for all to authenticated using (public.can_write_career(career_id)) with check (public.can_write_career(career_id));

drop policy if exists award_snapshots_select on award_snapshots;
create policy award_snapshots_select on award_snapshots for select to anon, authenticated using (public.can_read_career(career_id));
drop policy if exists award_snapshots_write on award_snapshots;
create policy award_snapshots_write on award_snapshots for all to authenticated using (public.can_write_career(career_id)) with check (public.can_write_career(career_id));

drop policy if exists milestones_select on milestones;
create policy milestones_select on milestones for select to anon, authenticated using (public.can_read_career(career_id));
drop policy if exists milestones_write on milestones;
create policy milestones_write on milestones for all to authenticated using (public.can_write_career(career_id)) with check (public.can_write_career(career_id));

drop policy if exists relationships_select on relationships;
create policy relationships_select on relationships for select to anon, authenticated using (public.can_read_career(career_id));
drop policy if exists relationships_write on relationships;
create policy relationships_write on relationships for all to authenticated using (public.can_write_career(career_id)) with check (public.can_write_career(career_id));
