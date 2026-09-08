begin;
alter table public.player_game_stats add column localized_notes jsonb not null default '{}';
alter table public.universe_games add column localized_notes jsonb not null default '{}';
alter table public.milestones drop constraint if exists milestones_career_id_game_id_code_key;
create unique index milestones_language_key on public.milestones(career_id,game_id,code,language);
create function public.replace_career_records(p_actor uuid,p_career uuid,p_language text,p_rows jsonb) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 perform 1 from career_profiles where id=p_career for update;
 if not exists(select 1 from career_profiles c join universes u on u.id=c.universe_id where c.id=p_career and u.owner_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where r->>'career_id'<>p_career::text or r->>'language'<>p_language) then raise exception 'FORBIDDEN'; end if;
 -- Preserve record identities when a value changes; remove only obsolete derived scopes.
 insert into career_records(career_id,season_id,scope,category,value,game_id,label,language,updated_at)
 select p_career,x.season_id,x.scope,x.category,x.value,x.game_id,x.label,p_language,now() from jsonb_to_recordset(p_rows) as x(season_id uuid,scope text,category text,value numeric,game_id uuid,label text)
 on conflict(career_id,season_id,scope,category,language) do update set value=excluded.value,game_id=excluded.game_id,label=excluded.label,updated_at=now();
 delete from career_records r where r.career_id=p_career and r.language=p_language and not exists(select 1 from jsonb_to_recordset(p_rows) as x(season_id uuid,scope text,category text) where x.season_id is not distinct from r.season_id and x.scope=r.scope and x.category=r.category);
end $$;
create function public.replace_career_milestones(p_actor uuid,p_career uuid,p_language text,p_rows jsonb) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 perform 1 from career_profiles where id=p_career for update;
 if not exists(select 1 from career_profiles c join universes u on u.id=c.universe_id where c.id=p_career and u.owner_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 insert into milestones(career_id,game_id,code,title,description,language,achieved_at)
 select p_career,x.game_id,x.code,x.title,x.description,p_language,x.achieved_at from jsonb_to_recordset(p_rows) as x(game_id uuid,code text,title text,description text,achieved_at timestamptz)
 on conflict(career_id,game_id,code,language) do update set title=excluded.title,description=excluded.description,achieved_at=excluded.achieved_at;
 delete from milestones m where m.career_id=p_career and m.language=p_language and m.code in ('PTS_50','REB_20','BLK_10','TRIPLE_DOUBLE','FIVE_BY_FIVE','CAREER_HIGH_PTS','CAREER_HIGH_BLK') and not exists(select 1 from jsonb_to_recordset(p_rows) as x(game_id uuid,code text) where x.game_id=m.game_id and x.code=m.code);
end $$;
create function private.validate_career_game_reference() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare v jsonb; gid uuid; uid uuid; game_uid uuid; begin
 v:=to_jsonb(new);gid:=coalesce(nullif(v->>'game_id','')::uuid,nullif(v->>'source_game_id','')::uuid);if gid is null then return new;end if;
 uid:=nullif(v->>'universe_id','')::uuid;
 if uid is null then select universe_id into uid from career_profiles where id=(v->>'career_id')::uuid;end if;
 select universe_id into game_uid from games where id=gid;
 if not found or uid is null or (game_uid is not null and game_uid<>uid) then raise exception 'GAME_NOT_FOUND';end if;return new;
end $$;
revoke all on function private.validate_career_game_reference() from public,anon,authenticated;
do $$ declare t text; begin foreach t in array array['player_game_stats','universe_games','game_notables','injuries','media_posts','pregame_coverage','postgame_grades','career_records','interviews','milestones','screenshot_scans'] loop execute format('create trigger validate_game_reference before insert or update on public.%I for each row execute function private.validate_career_game_reference()',t);end loop;end $$;
revoke all on function public.replace_career_records(uuid,uuid,text,jsonb),public.replace_career_milestones(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.replace_career_records(uuid,uuid,text,jsonb),public.replace_career_milestones(uuid,uuid,text,jsonb) to service_role;
create or replace function public.save_career_game(p_actor uuid,p_career uuid,p_game uuid,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
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
 s.localized_notes:=coalesce(old.localized_notes,'{}')||jsonb_build_object(coalesce(old.notes_language,'de'),jsonb_build_object('story_notes',old.story_notes,'injury_note',old.injury_note))||jsonb_build_object(lang,jsonb_build_object('story_notes',s.story_notes,'injury_note',s.injury_note));
 if s.appearance_status not in ('played','dnp_injury','dnp_coach','suspended','inactive') then raise exception 'INVALID_STATUS'; end if;
 if s.points>(case when team=g.home_team_id then home else away end) then raise exception 'INVALID_POINTS'; end if;
 insert into universe_games(universe_id,game_id,home_score,away_score,status,story_notes,localized_notes,notes_language,completed_at,updated_at) values(u.id,g.id,home,away,'completed',s.story_notes,s.localized_notes,lang,now(),now()) on conflict(universe_id,game_id) do update set home_score=excluded.home_score,away_score=excluded.away_score,status='completed',story_notes=excluded.story_notes,localized_notes=excluded.localized_notes,notes_language=lang,updated_at=now();
 insert into player_game_stats(career_id,game_id,team_id,appearance_status,minutes,points,rebounds,assists,steals,blocks,turnovers,fouls,technical_fouls,flagrant_fouls,fgm,fga,tpm,tpa,ftm,fta,plus_minus,started,fouled_out,ejected,injured,injury_note,story_notes,localized_notes,notes_language,updated_at) values(c.id,g.id,team,s.appearance_status,s.minutes,s.points,s.rebounds,s.assists,s.steals,s.blocks,s.turnovers,s.fouls,s.technical_fouls,s.flagrant_fouls,s.fgm,s.fga,s.tpm,s.tpa,s.ftm,s.fta,s.plus_minus,s.started,s.fouled_out,s.ejected,s.injured,s.injury_note,s.story_notes,s.localized_notes,lang,now()) on conflict(career_id,game_id) do update set appearance_status=excluded.appearance_status,minutes=excluded.minutes,points=excluded.points,rebounds=excluded.rebounds,assists=excluded.assists,steals=excluded.steals,blocks=excluded.blocks,turnovers=excluded.turnovers,fouls=excluded.fouls,technical_fouls=excluded.technical_fouls,flagrant_fouls=excluded.flagrant_fouls,fgm=excluded.fgm,fga=excluded.fga,tpm=excluded.tpm,tpa=excluded.tpa,ftm=excluded.ftm,fta=excluded.fta,plus_minus=excluded.plus_minus,started=excluded.started,fouled_out=excluded.fouled_out,ejected=excluded.ejected,injured=excluded.injured,injury_note=excluded.injury_note,story_notes=excluded.story_notes,localized_notes=excluded.localized_notes,notes_language=lang,updated_at=now() returning * into s;
 delete from game_notables where career_id=c.id and game_id=g.id and notes_language=lang;
 for item in select * from jsonb_array_elements(coalesce(p_payload->'notables','[]')) loop
 insert into game_notables(career_id,game_id,player_name,team_abbreviation,note,notes_language) values(c.id,g.id,item->>'player_name',item->>'team_abbreviation',item->>'note',lang);
 end loop;
 if s.injured and nullif(s.injury_note,'') is not null then
  select id into eid from injuries where career_id=c.id and source_game_id=g.id order by created_at limit 1;
  if eid is null then insert into injuries(career_id,source_game_id,start_date,injury,severity,status,notes_language) values(c.id,g.id,g.game_day,s.injury_note,'unknown','active',lang);
  else update injuries set injury=s.injury_note,notes_language=lang where id=eid; end if;
 elsif was_edit and not s.injured then update injuries set status='corrected',end_date=g.game_day where career_id=c.id and source_game_id=g.id and status='active'; end if;
 select id into eid from career_events where career_id=c.id and event_type='game' and metadata @> jsonb_build_object('game_id',g.id) order by created_at limit 1;
 if eid is null then insert into career_events(career_id,event_date,event_type,title,description,metadata,language) values(c.id,g.game_day,'game',case when lang='en' then 'Game completed' else 'Spiel abgeschlossen' end,coalesce(s.story_notes,s.points||' PTS · '||s.rebounds||' REB · '||s.assists||' AST'),jsonb_build_object('game_id',g.id,'stat_id',s.id),lang);
 else update career_events set description=coalesce(s.story_notes,s.points||' PTS · '||s.rebounds||' REB · '||s.assists||' AST'),language=lang where id=eid; end if;
 if not was_edit and g.game_day>c.universe_date then perform set_career_date(p_actor,c.id,g.game_day); end if;
 return jsonb_build_object('stat',to_jsonb(s),'isEdit',was_edit,'game',to_jsonb(g)||jsonb_build_object('home_score',home,'away_score',away));
end $$;


commit;
