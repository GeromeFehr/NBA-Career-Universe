-- Additive extension: existing universes, MyNBA records and co-op links stay NBA.
alter table public.universes add column game text not null default 'nba' check (game in ('nba','fc'));
create index universes_owner_game_idx on public.universes(owner_id,game);

create table public.fc_seasons (
 id uuid primary key default gen_random_uuid(), universe_id uuid not null references public.universes(id) on delete cascade,
 name text not null check(length(name) between 1 and 40), start_date date not null, end_date date not null,
 league text not null, clubs jsonb not null default '[]' check(jsonb_typeof(clubs)='array'),
 status text not null default 'active' check(status in ('active','completed')), created_at timestamptz not null default now(),
 unique(id,universe_id), check(end_date>start_date)
);
create index fc_seasons_universe_idx on public.fc_seasons(universe_id);
create unique index fc_one_active_season on public.fc_seasons(universe_id) where status='active';

create table public.fc_profiles (
 id uuid primary key default gen_random_uuid(), universe_id uuid not null unique references public.universes(id) on delete cascade,
 mode text not null check(mode in ('player','manager')), person_name text not null, club_name text not null,
 club_code text, club_color text not null default '#28684b' check(club_color ~ '^#[0-9a-fA-F]{6}$'), league text not null,
 position text not null default 'ST', overall int not null default 75 check(overall between 1 and 99),
 jersey_number int check(jersey_number between 1 and 99), nationality text, birth_date date,
 formation text not null default '4-2-3-1', budget numeric not null default 0 check(budget>=0),
 weekly_wage numeric not null default 0 check(weekly_wage>=0), contract_until date,
 current_season_id uuid not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(current_season_id,universe_id) references public.fc_seasons(id,universe_id) deferrable initially deferred
);
create index fc_profiles_season_idx on public.fc_profiles(current_season_id,universe_id);

create table public.fc_matches (
 id uuid primary key default gen_random_uuid(), universe_id uuid not null references public.universes(id) on delete cascade,
 season_id uuid not null, match_date date not null, competition text not null, stage text not null default 'league',
 round int check(round>0), home_club text not null, away_club text not null, tracked_club text not null,
 status text not null default 'scheduled' check(status in ('scheduled','completed')),
 home_score int check(home_score between 0 and 99), away_score int check(away_score between 0 and 99),
 home_penalties int check(home_penalties between 0 and 99), away_penalties int check(away_penalties between 0 and 99),
 extra_time boolean not null default false, player_stats jsonb,
 possession numeric check(possession between 0 and 100), shots int check(shots>=0), shots_on_target int check(shots_on_target>=0),
 xg numeric check(xg>=0), notes text, scorers jsonb not null default '[]' check(jsonb_typeof(scorers)='array'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,universe_id),
 foreign key(season_id,universe_id) references public.fc_seasons(id,universe_id),
 check(home_club<>away_club), check(status<>'completed' or (home_score is not null and away_score is not null)),
 check((home_penalties is null and away_penalties is null) or (status='completed' and home_score=away_score and home_penalties is not null and away_penalties is not null and home_penalties<>away_penalties)),
 check(shots_on_target is null or shots is null or shots_on_target<=shots)
);
create index fc_matches_universe_date_idx on public.fc_matches(universe_id,match_date);
create index fc_matches_season_idx on public.fc_matches(season_id,universe_id);

create table public.fc_squad (
 id uuid primary key default gen_random_uuid(), universe_id uuid not null references public.universes(id) on delete cascade,
 name text not null, position text not null, overall int not null check(overall between 1 and 99), age int check(age between 14 and 65),
 nationality text, jersey_number int check(jersey_number between 1 and 99), market_value numeric not null default 0 check(market_value>=0),
 weekly_wage numeric not null default 0 check(weekly_wage>=0), contract_until date, role text not null default 'rotation',
 status text not null default 'available' check(status in ('available','injured','suspended','loaned','departed')),
 lineup_slot int check(lineup_slot between 0 and 10), notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(lineup_slot is null or status='available')
);
create index fc_squad_universe_idx on public.fc_squad(universe_id);
create unique index fc_lineup_slot_unique on public.fc_squad(universe_id,lineup_slot) where lineup_slot is not null;

create table public.fc_transfers (
 id uuid primary key default gen_random_uuid(), universe_id uuid not null references public.universes(id) on delete cascade,
 season_id uuid not null, player_name text not null, from_club text not null, to_club text not null, transfer_date date not null,
 kind text not null check(kind in ('permanent','loan','free','return','manager')), fee numeric not null default 0 check(fee>=0),
 weekly_wage numeric not null default 0 check(weekly_wage>=0), contract_until date,
 direction text not null check(direction in ('in','out','career')), notes text, created_at timestamptz not null default now(),
 foreign key(season_id,universe_id) references public.fc_seasons(id,universe_id), check(from_club<>to_club)
);
create index fc_transfers_universe_date_idx on public.fc_transfers(universe_id,transfer_date);
create index fc_transfers_season_idx on public.fc_transfers(season_id,universe_id);

create table public.fc_events (
 id uuid primary key default gen_random_uuid(), universe_id uuid not null references public.universes(id) on delete cascade,
 season_id uuid, event_date date not null, kind text not null, title text not null, body text, created_at timestamptz not null default now(),
 foreign key(season_id,universe_id) references public.fc_seasons(id,universe_id)
);
create index fc_events_universe_date_idx on public.fc_events(universe_id,event_date);
create index fc_events_season_idx on public.fc_events(season_id,universe_id);

create table public.fc_media (
 id uuid primary key default gen_random_uuid(), universe_id uuid not null references public.universes(id) on delete cascade,
 match_id uuid not null, language text not null check(language in ('de','en')), kind text not null,
 author text not null, headline text not null, body text not null, source text not null check(source in ('editorial','openai')),
 match_version timestamptz not null, created_at timestamptz not null default now(),
 foreign key(match_id,universe_id) references public.fc_matches(id,universe_id) on delete cascade,
 unique(match_id,language,kind)
);
create index fc_media_universe_created_idx on public.fc_media(universe_id,created_at desc);

create table public.fc_interviews (
 id uuid primary key default gen_random_uuid(), universe_id uuid not null references public.universes(id) on delete cascade,
 match_id uuid not null, language text not null check(language in ('de','en')), question text not null,
 options jsonb not null check(jsonb_typeof(options)='array'), answer text, answered_at timestamptz, created_at timestamptz not null default now(),
 foreign key(match_id,universe_id) references public.fc_matches(id,universe_id) on delete cascade, unique(match_id,language)
);
create index fc_interviews_universe_idx on public.fc_interviews(universe_id);

create table public.fc_trophies (
 id uuid primary key default gen_random_uuid(), universe_id uuid not null references public.universes(id) on delete cascade,
 season_id uuid not null, name text not null, kind text not null check(kind in ('team','individual')), award_date date not null, notes text,
 created_at timestamptz not null default now(), foreign key(season_id,universe_id) references public.fc_seasons(id,universe_id)
);
create index fc_trophies_universe_idx on public.fc_trophies(universe_id);
create index fc_trophies_season_idx on public.fc_trophies(season_id,universe_id);

create table public.fc_media_jobs (
 match_id uuid primary key, universe_id uuid not null references public.universes(id) on delete cascade,
 match_version timestamptz not null, language text not null, token uuid not null default gen_random_uuid(),
 status text not null check(status in ('running','completed','failed')), updated_at timestamptz not null default now(),
 foreign key(match_id,universe_id) references public.fc_matches(id,universe_id) on delete cascade
);
create index fc_media_jobs_universe_idx on public.fc_media_jobs(universe_id);
create table public.fc_ai_usage (
 id uuid primary key default gen_random_uuid(), universe_id uuid not null references public.universes(id) on delete cascade,
 model text not null, feature text not null, input_tokens int not null default 0, output_tokens int not null default 0,
 created_at timestamptz not null default now()
);
create index fc_ai_usage_universe_idx on public.fc_ai_usage(universe_id);

create table public.fc_coop_links (
 id uuid primary key default gen_random_uuid(), host_universe_id uuid not null unique references public.universes(id) on delete cascade,
 guest_universe_id uuid unique references public.universes(id) on delete set null, name text not null,
 invite_hash text unique, invite_expires_at timestamptz, created_at timestamptz not null default now(),
 check(guest_universe_id is null or guest_universe_id<>host_universe_id)
);

-- Server API is the only writer. Authenticated direct reads are owner-scoped;
-- public sharing passes through the read-only server page and an explicit visibility check.
do $$ declare t text; begin
 foreach t in array array['fc_profiles','fc_seasons','fc_matches','fc_squad','fc_transfers','fc_events','fc_media','fc_interviews','fc_trophies','fc_media_jobs','fc_ai_usage'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
  execute format('create policy fc_owner_read on public.%I for select to authenticated using (exists(select 1 from public.universes u where u.id=universe_id and u.owner_id=(select auth.uid())))',t);
 end loop;
end $$;
alter table public.fc_coop_links enable row level security;
revoke all on public.fc_coop_links from anon,authenticated;
grant select,insert,update,delete on public.fc_coop_links to service_role;

create function public.fc_touch_updated_at() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin new.updated_at=clock_timestamp();return new;end $$;
create trigger fc_profiles_touch before update on public.fc_profiles for each row execute function public.fc_touch_updated_at();
create trigger fc_matches_touch before update on public.fc_matches for each row execute function public.fc_touch_updated_at();
create trigger fc_squad_touch before update on public.fc_squad for each row execute function public.fc_touch_updated_at();
revoke all on function public.fc_touch_updated_at() from public,anon,authenticated;

create function public.fc_immutable_game() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin if new.game<>old.game then raise exception 'WRONG_GAME';end if;return new;end $$;
create trigger universe_game_immutable before update of game on public.universes for each row execute function public.fc_immutable_game();
revoke all on function public.fc_immutable_game() from public,anon,authenticated;

-- All RPCs use SECURITY INVOKER, accept an already-authenticated actor and are
-- executable only by service_role. Row locks serialize writes within a career.
create function public.create_football_universe(p_actor uuid,p_data jsonb) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare u uuid;s uuid;d date;begin
 if p_actor is null then raise exception 'FORBIDDEN';end if;
 d=(p_data->>'universe_date')::date;
 insert into universes(owner_id,name,game,language,universe_date) values(p_actor,p_data->>'name','fc',p_data->>'language',d) returning id into u;
 insert into fc_seasons(universe_id,name,start_date,end_date,league,clubs) values(u,p_data->>'season_name',d,(p_data->>'end_date')::date,p_data->>'league',p_data->'clubs') returning id into s;
 insert into fc_profiles(universe_id,mode,person_name,club_name,club_code,club_color,league,position,overall,jersey_number,nationality,birth_date,formation,budget,weekly_wage,contract_until,current_season_id)
 values(u,p_data->>'mode',p_data->>'person_name',p_data->>'club_name',p_data->>'club_code',p_data->>'club_color',p_data->>'league',p_data->>'position',(p_data->>'overall')::int,(p_data->>'jersey_number')::int,p_data->>'nationality',(p_data->>'birth_date')::date,p_data->>'formation',(p_data->>'budget')::numeric,(p_data->>'weekly_wage')::numeric,(p_data->>'contract_until')::date,s);
 insert into fc_events(universe_id,season_id,event_date,kind,title,body) values(u,s,d,'debut',case when p_data->>'language'='en' then 'A new chapter begins' else 'Ein neues Kapitel beginnt' end,(p_data->>'person_name')||' · '||(p_data->>'club_name'));
 return u;
end $$;

create function public.fc_save_match(p_actor uuid,p_universe uuid,p_id uuid,p_expected timestamptz,p_data jsonb) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare u universes;m fc_matches;r fc_matches;begin
 select * into u from universes where id=p_universe and owner_id=p_actor and game='fc' for update;
 if u.id is null then raise exception 'FORBIDDEN';end if;
 if not exists(select 1 from fc_seasons where id=(p_data->>'season_id')::uuid and universe_id=u.id) then raise exception 'INVALID_SEASON';end if;
 r=jsonb_populate_record(null::fc_matches,p_data);
 if p_id is not null then
  select * into m from fc_matches where id=p_id and universe_id=u.id for update;
  if m.id is null then raise exception 'GAME_NOT_FOUND';end if;
  if p_expected is null or m.updated_at<>p_expected then raise exception 'STALE_GAME';end if;
  update fc_matches set season_id=r.season_id,match_date=r.match_date,competition=r.competition,stage=r.stage,round=r.round,home_club=r.home_club,away_club=r.away_club,tracked_club=r.tracked_club,
    status=r.status,home_score=r.home_score,away_score=r.away_score,home_penalties=r.home_penalties,away_penalties=r.away_penalties,extra_time=r.extra_time,player_stats=r.player_stats,
    possession=r.possession,shots=r.shots,shots_on_target=r.shots_on_target,xg=r.xg,notes=r.notes,scorers=r.scorers where id=p_id;
 else
  insert into fc_matches(universe_id,season_id,match_date,competition,stage,round,home_club,away_club,tracked_club,status,home_score,away_score,home_penalties,away_penalties,extra_time,player_stats,possession,shots,shots_on_target,xg,notes,scorers)
  values(u.id,r.season_id,r.match_date,r.competition,r.stage,r.round,r.home_club,r.away_club,r.tracked_club,r.status,r.home_score,r.away_score,r.home_penalties,r.away_penalties,r.extra_time,r.player_stats,r.possession,r.shots,r.shots_on_target,r.xg,r.notes,r.scorers) returning id into p_id;
 end if;
 if r.status='completed' and r.tracked_club in(r.home_club,r.away_club) then
  update universes set universe_date=greatest(universe_date,r.match_date),updated_at=now() where id=u.id;
 end if;
 return p_id;
end $$;

create function public.fc_new_season(p_actor uuid,p_universe uuid,p_data jsonb) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare u universes;c fc_profiles;s uuid;begin
 select * into u from universes where id=p_universe and owner_id=p_actor and game='fc' for update;
 if u.id is null then raise exception 'FORBIDDEN';end if;
 select * into c from fc_profiles where universe_id=u.id for update;
 if (p_data->>'start_date')::date<=u.universe_date or (p_data->>'end_date')::date<=(p_data->>'start_date')::date then raise exception 'INVALID_SEASON';end if;
 update fc_seasons set status='completed' where id=c.current_season_id;
 insert into fc_seasons(universe_id,name,start_date,end_date,league,clubs) values(u.id,p_data->>'name',(p_data->>'start_date')::date,(p_data->>'end_date')::date,p_data->>'league',p_data->'clubs') returning id into s;
 update fc_profiles set current_season_id=s,league=p_data->>'league' where id=c.id;
 update universes set universe_date=(p_data->>'start_date')::date,updated_at=now() where id=u.id;
 insert into fc_events(universe_id,season_id,event_date,kind,title) values(u.id,s,(p_data->>'start_date')::date,'season',case when u.language='en' then 'New season: ' else 'Neue Saison: ' end||(p_data->>'name'));
 return s;
end $$;

create function public.fc_record_transfer(p_actor uuid,p_universe uuid,p_data jsonb,p_squad_id uuid default null) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare u universes;c fc_profiles;t uuid;d date;begin
 select * into u from universes where id=p_universe and owner_id=p_actor and game='fc' for update;
 if u.id is null then raise exception 'FORBIDDEN';end if;
 select * into c from fc_profiles where universe_id=u.id for update;d=(p_data->>'transfer_date')::date;
 if p_data->>'direction'='career' then
  if d<u.universe_date or p_data->>'from_club'<>c.club_name or p_data->>'player_name'<>c.person_name then raise exception 'INVALID_TRANSFER';end if;
  update fc_profiles set club_name=p_data->>'to_club',club_code=null,club_color=coalesce(p_data->>'club_color','#28684b'),weekly_wage=(p_data->>'weekly_wage')::numeric,contract_until=(p_data->>'contract_until')::date where id=c.id;
  update universes set universe_date=d,updated_at=now() where id=u.id;
  -- Old club fixtures and statistics keep their tracked club. New fixtures are added by the user.
  if c.mode='manager' then update fc_squad set status='departed',lineup_slot=null where universe_id=u.id and status<>'departed';end if;
 elsif p_data->>'direction'='in' then
  if p_data->>'to_club'<>c.club_name then raise exception 'INVALID_TRANSFER';end if;
  if (p_data->>'fee')::numeric>c.budget then raise exception 'INSUFFICIENT_BUDGET';end if;
  update fc_profiles set budget=budget-(p_data->>'fee')::numeric where id=c.id;
 elsif p_data->>'direction'='out' then
  if p_data->>'from_club'<>c.club_name then raise exception 'INVALID_TRANSFER';end if;
  update fc_profiles set budget=budget+(p_data->>'fee')::numeric where id=c.id;
  if p_squad_id is not null then
   update fc_squad set status=case when p_data->>'kind'='loan' then 'loaned' else 'departed' end,lineup_slot=null where id=p_squad_id and universe_id=u.id;
   if not found then raise exception 'FORBIDDEN';end if;
  end if;
 end if;
 insert into fc_transfers(universe_id,season_id,player_name,from_club,to_club,transfer_date,kind,fee,weekly_wage,contract_until,direction,notes)
 values(u.id,c.current_season_id,p_data->>'player_name',p_data->>'from_club',p_data->>'to_club',d,p_data->>'kind',(p_data->>'fee')::numeric,(p_data->>'weekly_wage')::numeric,(p_data->>'contract_until')::date,p_data->>'direction',p_data->>'notes') returning id into t;
 insert into fc_events(universe_id,season_id,event_date,kind,title,body) values(u.id,c.current_season_id,d,'transfer',(p_data->>'player_name')||' → '||(p_data->>'to_club'),p_data->>'notes');
 return t;
end $$;

create function public.fc_save_lineup(p_actor uuid,p_universe uuid,p_formation text,p_slots jsonb) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare u uuid;e jsonb;begin
 select id into u from universes where id=p_universe and owner_id=p_actor and game='fc' for update;
 if u is null then raise exception 'FORBIDDEN';end if;
 if jsonb_array_length(p_slots)<>11 or p_formation not in('4-2-3-1','4-3-3','4-4-2','3-5-2','4-5-1') then raise exception 'INVALID_LINEUP';end if;
 if (select count(distinct value) from jsonb_array_elements_text(p_slots) where value is not null)<>(select count(*) from jsonb_array_elements_text(p_slots) where value is not null) then raise exception 'INVALID_LINEUP';end if;
 update fc_squad set lineup_slot=null where universe_id=u;
 for e in select jsonb_build_object('id',value,'slot',ordinality-1) from jsonb_array_elements_text(p_slots) with ordinality where value is not null loop
  update fc_squad set lineup_slot=(e->>'slot')::int where id=(e->>'id')::uuid and universe_id=u and status='available';
  if not found then raise exception 'INVALID_LINEUP';end if;
 end loop;
 update fc_profiles set formation=p_formation where universe_id=u;
end $$;

create function public.fc_claim_media(p_actor uuid,p_universe uuid,p_match uuid,p_language text,p_ai boolean) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare m fc_matches;j fc_media_jobs;t uuid;begin
 if not exists(select 1 from universes where id=p_universe and owner_id=p_actor and game='fc') then raise exception 'FORBIDDEN';end if;
 select * into m from fc_matches where id=p_match and universe_id=p_universe and status='completed' for update;
 if m.id is null then raise exception 'GAME_NOT_FOUND';end if;
 select * into j from fc_media_jobs where match_id=m.id for update;
 if j.status='running' and j.updated_at>now()-interval '70 seconds' then raise exception 'ACTION_RUNNING';end if;
 if exists(select 1 from fc_media where match_id=m.id and language=p_language and match_version=m.updated_at and (not p_ai or source='openai')) then return jsonb_build_object('cached',true);end if;
 t=gen_random_uuid();
 insert into fc_media_jobs(match_id,universe_id,match_version,language,token,status) values(m.id,p_universe,m.updated_at,p_language,t,'running')
 on conflict(match_id) do update set match_version=m.updated_at,language=p_language,token=t,status='running',updated_at=now();
 return jsonb_build_object('cached',false,'token',t,'version',m.updated_at);
end $$;

create function public.fc_finish_media(p_actor uuid,p_universe uuid,p_match uuid,p_token uuid,p_items jsonb,p_interview jsonb) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare m fc_matches;j fc_media_jobs;e jsonb;begin
 if not exists(select 1 from universes where id=p_universe and owner_id=p_actor and game='fc') then raise exception 'FORBIDDEN';end if;
 select * into m from fc_matches where id=p_match and universe_id=p_universe for update;
 select * into j from fc_media_jobs where match_id=m.id and token=p_token and status='running' for update;
 if j.match_id is null or j.match_version<>m.updated_at then raise exception 'STALE_GAME';end if;
 delete from fc_media where match_id=m.id and language=j.language;
 for e in select value from jsonb_array_elements(p_items) loop
  insert into fc_media(universe_id,match_id,language,kind,author,headline,body,source,match_version)
  values(p_universe,m.id,j.language,e->>'kind',e->>'author',e->>'headline',e->>'body',e->>'source',m.updated_at);
 end loop;
 insert into fc_interviews(universe_id,match_id,language,question,options) values(p_universe,m.id,j.language,p_interview->>'question',p_interview->'options')
 on conflict(match_id,language) do update set question=case when fc_interviews.answer is null then excluded.question else fc_interviews.question end,options=case when fc_interviews.answer is null then excluded.options else fc_interviews.options end;
 update fc_media_jobs set status='completed',updated_at=now() where match_id=m.id;
end $$;

create function public.fc_generate_schedule(p_actor uuid,p_universe uuid,p_season uuid,p_clubs jsonb,p_fixtures jsonb) returns int language plpgsql security invoker set search_path=public,pg_temp as $$
declare u uuid;e jsonb;n int=0;begin
 select id into u from universes where id=p_universe and owner_id=p_actor and game='fc' for update;
 if u is null then raise exception 'FORBIDDEN';end if;
 if not exists(select 1 from fc_profiles where universe_id=u and current_season_id=p_season) then raise exception 'INVALID_SEASON';end if;
 if exists(select 1 from fc_matches m join fc_seasons s on s.id=m.season_id where m.universe_id=u and m.season_id=p_season and m.competition=s.league) then raise exception 'SCHEDULE_EXISTS';end if;
 update fc_seasons set clubs=p_clubs where id=p_season and universe_id=u;
 for e in select value from jsonb_array_elements(p_fixtures) loop
  insert into fc_matches(universe_id,season_id,match_date,competition,round,home_club,away_club,tracked_club)
  values(u,p_season,(e->>'match_date')::date,e->>'competition',(e->>'round')::int,e->>'home_club',e->>'away_club',e->>'tracked_club');
  n=n+1;
 end loop;
 return n;
end $$;

create function public.fc_create_coop(p_actor uuid,p_universe uuid,p_hash text,p_name text) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare u uuid;l uuid;begin
 select id into u from universes where id=p_universe and owner_id=p_actor and game='fc' for update;
 if u is null then raise exception 'FORBIDDEN';end if;
 if exists(select 1 from fc_coop_links where host_universe_id=u or guest_universe_id=u) then raise exception 'COOP_ALREADY_LINKED';end if;
 insert into fc_coop_links(host_universe_id,name,invite_hash,invite_expires_at) values(u,p_name,p_hash,now()+interval '24 hours') returning id into l;return l;
end $$;

create function public.fc_join_coop(p_actor uuid,p_universe uuid,p_hash text) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare u universes;h universes;l fc_coop_links;begin
 select * into u from universes where id=p_universe and owner_id=p_actor and game='fc' for update;
 if u.id is null then raise exception 'FORBIDDEN';end if;
 if exists(select 1 from fc_coop_links where host_universe_id=u.id or guest_universe_id=u.id) then raise exception 'COOP_ALREADY_LINKED';end if;
 select * into l from fc_coop_links where invite_hash=p_hash and invite_expires_at>now() and guest_universe_id is null for update;
 if l.id is null then raise exception 'COOP_INVALID_INVITE';end if;
 select * into h from universes where id=l.host_universe_id;
 if h.owner_id=u.owner_id then raise exception 'COOP_DIFFERENT_ACCOUNT';end if;
 if h.language<>u.language then raise exception 'COOP_LANGUAGE_MISMATCH';end if;
 if (select name from fc_seasons where id=(select current_season_id from fc_profiles where universe_id=h.id))<>(select name from fc_seasons where id=(select current_season_id from fc_profiles where universe_id=u.id)) then raise exception 'FC_COOP_SEASON_MISMATCH';end if;
 update fc_coop_links set guest_universe_id=u.id,invite_hash=null,invite_expires_at=null where id=l.id;
 return l.id;
end $$;

do $$ declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('create_football_universe','fc_save_match','fc_new_season','fc_record_transfer','fc_save_lineup','fc_claim_media','fc_finish_media','fc_join_coop','fc_create_coop','fc_generate_schedule') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;

