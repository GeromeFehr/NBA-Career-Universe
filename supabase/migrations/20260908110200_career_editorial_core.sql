begin;
-- Additive migration. No career, narrative, interview or stat rows are removed.
create schema if not exists private;
revoke create on schema public from public, anon, authenticated;
grant usage on schema private to anon, authenticated, service_role;
alter function public.can_read_universe(uuid) set schema private;
alter function public.can_write_universe(uuid) set schema private;
alter function public.can_read_career(uuid) set schema private;
alter function public.can_write_career(uuid) set schema private;
create or replace function private.can_read_universe(target_universe uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.universes where id=target_universe and (visibility='public' or owner_id=(select auth.uid()))); $$;
create or replace function private.can_write_universe(target_universe uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.universes where id=target_universe and owner_id=(select auth.uid())); $$;
create or replace function private.can_read_career(target_career uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.career_profiles where id=target_career and private.can_read_universe(universe_id)); $$;
create or replace function private.can_write_career(target_career uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.career_profiles where id=target_career and private.can_write_universe(universe_id)); $$;
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to anon, authenticated, service_role;
alter view public.team_game_results set (security_invoker=true);
alter view public.standings set (security_invoker=true);
drop policy if exists ai_usage_logs_select on public.ai_usage_logs;
drop policy if exists ai_usage_logs_write on public.ai_usage_logs;
create policy ai_usage_logs_owner_read on public.ai_usage_logs for select to authenticated using (private.can_write_career(career_id));
drop policy if exists screenshot_scans_select on public.screenshot_scans;
drop policy if exists screenshot_scans_write on public.screenshot_scans;
create policy screenshot_scans_owner_read on public.screenshot_scans for select to authenticated using (private.can_write_career(career_id));
revoke insert,update,delete on public.ai_usage_logs,public.screenshot_scans from anon,authenticated;
create unique index fanbase_metrics_upsert_key on public.fanbase_metrics(career_id,segment,team_id) nulls not distinct;
create unique index career_records_upsert_key on public.career_records(career_id,season_id,scope,category,language) nulls not distinct;
create index media_posts_career_language_date_idx on public.media_posts(career_id,language,created_at desc,id);
create index games_universe_season_date_idx on public.games(universe_id,season_id,game_day);
create index player_stats_career_game_idx on public.player_game_stats(career_id,game_id);
create index interviews_open_idx on public.interviews(career_id,language,importance desc) where status='open';
create index trade_updates_saga_date_idx on public.trade_saga_updates(saga_id,update_date desc);
do $$ declare t text; begin foreach t in array array['player_game_stats','universe_games','game_notables','injuries','rivalries','games','team_stints'] loop execute format('alter table public.%I add column notes_language text not null default ''de'' check(notes_language in (''de'',''en''))',t); end loop; end $$;
alter table public.player_game_stats add constraint stat_values_nonnegative check(minutes>=0 and points>=0 and rebounds>=0 and assists>=0 and steals>=0 and blocks>=0 and turnovers>=0 and fouls>=0 and technical_fouls>=0 and flagrant_fouls>=0 and fgm>=0 and fga>=fgm and tpm>=0 and tpa>=tpm and ftm>=0 and fta>=ftm and tpm<=fgm and tpa<=fga) not valid;
alter table public.universe_games add constraint final_scores_valid check(status<>'completed' or (home_score>=0 and away_score>=0 and home_score<>away_score)) not valid;

create table public.action_jobs(
 career_id uuid not null references public.career_profiles(id) on delete cascade,
 job_key text not null,
 status text not null check(status in ('running','completed','failed')),
 token uuid not null default gen_random_uuid(),
 result jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(career_id,job_key)
);
alter table public.action_jobs enable row level security;
grant all on public.action_jobs to service_role;
revoke all on public.action_jobs from anon,authenticated;
create index action_jobs_rate_idx on public.action_jobs(career_id,created_at desc);
create function public.claim_action(p_career uuid,p_key text) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare j action_jobs; begin
 perform pg_advisory_xact_lock(hashtextextended(p_career::text,0));
 select * into j from action_jobs where career_id=p_career and job_key=p_key for update;
 if found and j.status='completed' then return jsonb_build_object('cached',true,'result',j.result); end if;
 if j.status='running' and j.updated_at>now()-interval '5 minutes' then raise exception 'ACTION_RUNNING' using errcode='P0001'; end if;
 if (select count(*) from action_jobs where career_id=p_career and created_at>now()-interval '1 minute')>=6 then raise exception 'RATE_LIMITED' using errcode='P0001'; end if;
 insert into action_jobs(career_id,job_key,status) values(p_career,p_key,'running') on conflict(career_id,job_key) do update set status='running',token=gen_random_uuid(),updated_at=now() returning * into j;
 return jsonb_build_object('cached',false,'token',j.token);
end $$;

create function public.set_career_date(p_actor uuid,p_career uuid,p_date date,p_season uuid default null) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare c career_profiles; begin
 select * into c from career_profiles where id=p_career for update;
 if not exists(select 1 from universes where id=c.universe_id and owner_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 if p_date is null then raise exception 'INVALID_DATE'; end if;
 update career_profiles set universe_date=p_date,updated_at=now() where id=c.id;
 update universes set universe_date=p_date,current_season_id=coalesce(p_season,current_season_id),updated_at=now() where id=c.universe_id;
 update world_settings set universe_date=p_date,current_season_id=coalesce(p_season,current_season_id),updated_at=now() where career_id=c.id;
end $$;

create function public.save_career_game(p_actor uuid,p_career uuid,p_game uuid,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare c career_profiles; u universes; g games; old player_game_stats; s player_game_stats; team uuid; item jsonb; was_edit boolean; home integer; away integer; lang text; eid uuid;
begin
 select * into c from career_profiles where id=p_career for update;
 select * into u from universes where id=c.universe_id and owner_id=p_actor;
 if u.id is null then raise exception 'FORBIDDEN'; end if;
 select * into g from games where id=p_game;
 if g.id is null or (g.universe_id is not null and g.universe_id<>u.id) then raise exception 'GAME_NOT_FOUND'; end if;
 select * into old from player_game_stats where career_id=c.id and game_id=g.id;
 was_edit:=old.id is not null;
 if was_edit and (p_payload->>'expectedUpdatedAt')::timestamptz is distinct from old.updated_at then raise exception 'STALE_GAME'; end if;
 team:=old.team_id;
 if team is null then select team_id into team from team_stints where career_id=c.id and start_date<=g.game_day and (end_date is null or end_date>=g.game_day) order by start_date desc,created_at desc limit 1; end if;
 team:=coalesce(team,c.current_team_id);
 if g.home_team_id is null or g.away_team_id is null or team is null or team not in (g.home_team_id,g.away_team_id) then raise exception 'TEAM_NOT_IN_GAME'; end if;
 home:=(p_payload->>'homeScore')::integer; away:=(p_payload->>'awayScore')::integer; lang:=u.language;
 if home is null or away is null or home<0 or away<0 or home=away then raise exception 'INVALID_SCORE'; end if;
 s:=jsonb_populate_record(null::player_game_stats,p_payload->'stat');
 if s.appearance_status not in ('played','dnp_injury','dnp_coach','suspended','inactive') then raise exception 'INVALID_STATUS'; end if;
 if s.points>(case when team=g.home_team_id then home else away end) then raise exception 'INVALID_POINTS'; end if;
 insert into universe_games(universe_id,game_id,home_score,away_score,status,story_notes,notes_language,completed_at,updated_at) values(u.id,g.id,home,away,'completed',s.story_notes,lang,now(),now()) on conflict(universe_id,game_id) do update set home_score=excluded.home_score,away_score=excluded.away_score,status='completed',story_notes=excluded.story_notes,notes_language=lang,updated_at=now();
 insert into player_game_stats(career_id,game_id,team_id,appearance_status,minutes,points,rebounds,assists,steals,blocks,turnovers,fouls,technical_fouls,flagrant_fouls,fgm,fga,tpm,tpa,ftm,fta,plus_minus,started,fouled_out,ejected,injured,injury_note,story_notes,notes_language,updated_at) values(c.id,g.id,team,s.appearance_status,s.minutes,s.points,s.rebounds,s.assists,s.steals,s.blocks,s.turnovers,s.fouls,s.technical_fouls,s.flagrant_fouls,s.fgm,s.fga,s.tpm,s.tpa,s.ftm,s.fta,s.plus_minus,s.started,s.fouled_out,s.ejected,s.injured,s.injury_note,s.story_notes,lang,now()) on conflict(career_id,game_id) do update set appearance_status=excluded.appearance_status,minutes=excluded.minutes,points=excluded.points,rebounds=excluded.rebounds,assists=excluded.assists,steals=excluded.steals,blocks=excluded.blocks,turnovers=excluded.turnovers,fouls=excluded.fouls,technical_fouls=excluded.technical_fouls,flagrant_fouls=excluded.flagrant_fouls,fgm=excluded.fgm,fga=excluded.fga,tpm=excluded.tpm,tpa=excluded.tpa,ftm=excluded.ftm,fta=excluded.fta,plus_minus=excluded.plus_minus,started=excluded.started,fouled_out=excluded.fouled_out,ejected=excluded.ejected,injured=excluded.injured,injury_note=excluded.injury_note,story_notes=excluded.story_notes,notes_language=lang,updated_at=now() returning * into s;
 delete from game_notables where career_id=c.id and game_id=g.id;
 for item in select * from jsonb_array_elements(coalesce(p_payload->'notables','[]')) loop
 insert into game_notables(career_id,game_id,player_name,team_abbreviation,note,notes_language) values(c.id,g.id,item->>'player_name',item->>'team_abbreviation',item->>'note',lang);
 end loop;
 if s.injured and nullif(s.injury_note,'') is not null then
  select id into eid from injuries where career_id=c.id and source_game_id=g.id order by created_at limit 1;
  if eid is null then insert into injuries(career_id,source_game_id,start_date,injury,severity,status,notes_language) values(c.id,g.id,g.game_day,s.injury_note,'unknown','active',lang);
  else update injuries set injury=s.injury_note,notes_language=lang where id=eid; end if;
 elsif was_edit then update injuries set status='corrected',end_date=g.game_day where career_id=c.id and source_game_id=g.id and status='active'; end if;
 select id into eid from career_events where career_id=c.id and event_type='game' and metadata @> jsonb_build_object('game_id',g.id) order by created_at limit 1;
 if eid is null then insert into career_events(career_id,event_date,event_type,title,description,metadata,language) values(c.id,g.game_day,'game',case when lang='en' then 'Game completed' else 'Spiel abgeschlossen' end,coalesce(s.story_notes,s.points||' PTS · '||s.rebounds||' REB · '||s.assists||' AST'),jsonb_build_object('game_id',g.id,'stat_id',s.id),lang);
 else update career_events set description=coalesce(s.story_notes,s.points||' PTS · '||s.rebounds||' REB · '||s.assists||' AST'),language=lang where id=eid; end if;
 if not was_edit and g.game_day>c.universe_date then perform set_career_date(p_actor,c.id,g.game_day); end if;
 return jsonb_build_object('stat',to_jsonb(s),'isEdit',was_edit,'game',to_jsonb(g)||jsonb_build_object('home_score',home,'away_score',away));
end $$;

create function public.move_career_team(p_actor uuid,p_career uuid,p_team uuid,p_date date,p_description text,p_offer uuid default null) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare c career_profiles; u universes; o trade_offers; begin
 select * into c from career_profiles where id=p_career for update;
 select * into u from universes where id=c.universe_id and owner_id=p_actor;
 if u.id is null then raise exception 'FORBIDDEN'; end if;
 if p_team=c.current_team_id or not exists(select 1 from teams where id=p_team and active) then raise exception 'INVALID_TEAM'; end if;
 if p_date<c.universe_date then raise exception 'TRADE_IN_PAST'; end if;
 if p_offer is not null then select * into o from trade_offers where id=p_offer and career_id=c.id and status='pending' and language=u.language for update;
 if o.id is null or o.to_team_id<>p_team or o.from_team_id<>c.current_team_id then raise exception 'STALE_OFFER'; end if; end if;
 update team_stints set end_date=p_date,departure='Trade' where career_id=c.id and end_date is null;
 insert into team_stints(career_id,team_id,start_date,acquisition,notes_language) values(c.id,p_team,p_date,'Trade',u.language);
 update career_profiles set current_team_id=p_team,updated_at=now() where id=c.id;
 perform set_career_date(p_actor,c.id,p_date);
 insert into career_events(career_id,event_date,event_type,from_team_id,to_team_id,title,description,language,metadata) values(c.id,p_date,'trade',c.current_team_id,p_team,case when u.language='en' then 'Trade completed' else 'Teamwechsel abgeschlossen' end,p_description,u.language,jsonb_build_object('offer_id',p_offer));
 update trade_offers set status=case when id=p_offer then 'accepted' else 'withdrawn' end,accepted_at=case when id=p_offer then now() else accepted_at end where career_id=c.id and status='pending';
 update trade_sagas set status='resolved',updated_at=now() where career_id=c.id and status='active';
end $$;

create function public.answer_career_interview(p_actor uuid,p_career uuid,p_interview uuid,p_option text) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare i interviews; opt jsonb; imp jsonb; begin
 perform 1 from career_profiles where id=p_career for update;
 if not exists(select 1 from career_profiles c join universes u on u.id=c.universe_id where c.id=p_career and u.owner_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 select * into i from interviews where id=p_interview and career_id=p_career and language=(select u.language from universes u join career_profiles c on c.universe_id=u.id where c.id=p_career) for update;
 if i.id is null or i.status<>'open' then raise exception 'INTERVIEW_CLOSED'; end if;
 select v into opt from jsonb_array_elements(i.options) v where v->>'id'=p_option;
 if opt is null then raise exception 'INVALID_ANSWER'; end if;
 imp:=coalesce(opt->'impact','{}');
 insert into universe_reputation(career_id) values(p_career) on conflict do nothing;
 update universe_reputation set media_hype=greatest(0,least(100,media_hype+coalesce((imp->>'hype')::int,0))),fan_approval=greatest(0,least(100,fan_approval+coalesce((imp->>'fans')::int,0))),expert_respect=greatest(0,least(100,expert_respect+coalesce((imp->>'expert')::int,0))),hater_heat=greatest(0,least(100,hater_heat+coalesce((imp->>'hater')::int,0))),star_power=greatest(0,least(100,star_power+coalesce((imp->>'star')::int,0))),cultural_impact=greatest(0,least(100,cultural_impact+coalesce((imp->>'culture')::int,0))),updated_at=now() where career_id=p_career;
 update interviews set answered_option=p_option,answer_text=opt->>'label',impact=imp,status='answered' where id=i.id;
 return opt;
end $$;

create function public.create_career_universe(p_actor uuid,p_data jsonb) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare u uuid; c uuid; s seasons; d date; l text; begin
 if not exists(select 1 from auth.users where id=p_actor) then raise exception 'FORBIDDEN'; end if;
 select * into s from seasons where current order by start_date desc limit 1;
 if s.id is null then raise exception 'NO_SEASON'; end if;
 d:=coalesce((p_data->>'universeDate')::date,s.start_date);l:=coalesce(p_data->>'language','de');
 insert into universes(owner_id,name,language,current_season_id,universe_date) values(p_actor,p_data->>'name',l,s.id,d) returning id into u;
 insert into career_profiles(universe_id,player_name,position,jersey_number,overall,draft_year,draft_round,draft_pick,current_team_id,rookie_season_id,universe_date) values(u,p_data->>'playerName',p_data->>'position',nullif(p_data->>'jerseyNumber','')::int,coalesce((p_data->>'overall')::int,75),nullif(p_data->>'draftYear','')::int,coalesce(nullif(p_data->>'draftRound','')::int,1),nullif(p_data->>'draftPick','')::int,(p_data->>'teamId')::uuid,s.id,d) returning id into c;
 insert into world_settings(career_id,universe_date,current_season_id) values(c,d,s.id);
 insert into team_stints(career_id,team_id,start_date,acquisition,notes_language) values(c,(p_data->>'teamId')::uuid,d,case when l='en' then 'Career debut' else 'Karrierestart' end,l);
 return u;
end $$;
-- Every new RPC is exclusively callable by the authenticated server service client.
do $$ declare f record; begin for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in ('claim_action','set_career_date','save_career_game','move_career_team','answer_career_interview','create_career_universe') loop execute format('revoke all on function %s from public,anon,authenticated',f.signature); execute format('grant execute on function %s to service_role',f.signature); end loop; end $$;
commit;
