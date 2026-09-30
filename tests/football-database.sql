-- Integration checks against an existing database. All fixture writes roll back.
begin;
do $$
declare
 actor uuid; stranger uuid=gen_random_uuid(); u uuid; season uuid; next_season uuid;
 player uuid; test_match uuid; stamp timestamptz; changed timestamptz; payload jsonb;
 job jsonb; scan jsonb; slots jsonb; transfer jsonb;
begin
 select owner_id into actor from public.universes limit 1;
 if actor is null then raise exception 'Integration checks require an existing account';end if;
 u=public.create_football_universe(actor,'{"name":"Rollback integration career","mode":"manager","person_name":"Integration Manager","club_name":"Integration Club","club_color":"#28684b","league":"Integration League","position":"ST","overall":75,"formation":"4-2-3-1","budget":100000,"weekly_wage":100,"language":"de","universe_date":"2026-07-01","season_name":"2026/27","end_date":"2027-06-30","clubs":["Integration Club","Other Club"]}'::jsonb);
 select current_season_id,updated_at into season,stamp from public.fc_profiles where universe_id=u;
 if (select game from public.universes where id=u)<>'fc' then raise exception 'Wrong game';end if;
 insert into public.fc_squad(universe_id,name,position,overall) values(u,'Integration Striker','ST',75) returning id into player;
 slots=jsonb_build_array(null,null,null,null,null,null,null,null,null,null,player);
 perform public.fc_mutate_checked(actor,u,stamp,'lineup',jsonb_build_object('formation','4-3-3','slots',slots));
 if (select lineup_slot from public.fc_squad where id=player)<>10 then raise exception 'Lineup not saved';end if;
 begin
  perform public.fc_mutate_checked(actor,u,stamp,'lineup',jsonb_build_object('formation','4-4-2','slots',slots));
  raise exception 'Stale edit incorrectly accepted';
 exception when others then if sqlerrm<>'STALE_GAME' then raise;end if;end;
 select updated_at into stamp from public.fc_profiles where universe_id=u;
 begin
  perform public.fc_mutate_checked(actor,u,stamp,'lineup',jsonb_build_object('formation','4-3-3','slots',jsonb_build_array(player,player,null,null,null,null,null,null,null,null,null)));
  raise exception 'Duplicate lineup incorrectly accepted';
 exception when others then if sqlerrm<>'INVALID_LINEUP' then raise;end if;end;
 if (select lineup_slot from public.fc_squad where id=player)<>10 then raise exception 'Failed lineup changed data';end if;
 payload=jsonb_build_object('season_id',season,'match_date','2026-08-01','competition','Integration League','stage','league','home_club','Integration Club','away_club','Other Club','tracked_club','Integration Club','status','completed','home_score',2,'away_score',2,'extra_time',false,'scorers','[]'::jsonb);
 test_match=public.fc_save_match(actor,u,null,null,payload);
 select updated_at into stamp from public.fc_matches where id=test_match;
 perform public.fc_save_match(actor,u,test_match,stamp,payload||'{"home_score":3}'::jsonb);
 begin
  perform public.fc_save_match(actor,u,test_match,stamp,payload);
  raise exception 'Stale match incorrectly accepted';
 exception when others then if sqlerrm<>'STALE_GAME' then raise;end if;end;
 begin
  perform public.fc_save_match(stranger,u,test_match,stamp,payload);
  raise exception 'Foreign owner incorrectly accepted';
 exception when others then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 if (select home_score from public.fc_matches where id=test_match)<>3 then raise exception 'Failed edit changed score';end if;
 job=public.fc_claim_media(actor,u,test_match,'de',false);
 perform public.fc_finish_media(actor,u,test_match,(job->>'token')::uuid,'[{"kind":"recap","author":"Integration Voice","headline":"Recorded result","body":"Integration Club 3–2 Other Club","source":"editorial"}]','{"question":"How was the match?","options":["Team first."]}');
 if not (public.fc_claim_media(actor,u,test_match,'de',false)->>'cached')::boolean then raise exception 'Media cache missed';end if;
 update public.fc_interviews set answer='Team first.' where match_id=test_match and universe_id=u;
 select updated_at into stamp from public.fc_matches where id=test_match;
 perform public.fc_save_match(actor,u,test_match,stamp,payload||'{"home_score":4}'::jsonb);
 job=public.fc_claim_media(actor,u,test_match,'de',false);
 perform public.fc_finish_media(actor,u,test_match,(job->>'token')::uuid,'[{"kind":"recap","author":"Integration Voice","headline":"Updated result","body":"Integration Club 4–2 Other Club","source":"editorial"}]','{"question":"New question?","options":["New option."]}');
 if (select answer from public.fc_interviews where universe_id=u)<>'Team first.' then raise exception 'Answered interview was lost';end if;
 select updated_at into stamp from public.fc_profiles where universe_id=u;
 transfer=jsonb_build_object('direction','out','kind','permanent','player_name','Integration Striker','from_club','Integration Club','to_club','Other Club','transfer_date','2026-08-02','fee',10000,'weekly_wage',100,'squad_id',player);
 perform public.fc_mutate_checked(actor,u,stamp,'transfer',transfer);
 if (select budget from public.fc_profiles where universe_id=u)<>110000 or (select status from public.fc_squad where id=player)<>'departed' or (select lineup_slot from public.fc_squad where id=player) is not null then raise exception 'Transfer integrity failed';end if;
 select updated_at into stamp from public.fc_profiles where universe_id=u;
 begin
  perform public.fc_mutate_checked(actor,u,stamp,'transfer',transfer);
  raise exception 'Repeated departure incorrectly accepted';
 exception when others then if sqlerrm<>'INVALID_TRANSFER' then raise;end if;end;
 if (select budget from public.fc_profiles where universe_id=u)<>110000 then raise exception 'Failed transfer changed budget';end if;
 next_season=(public.fc_mutate_checked(actor,u,stamp,'season','{"name":"2027/28","start_date":"2027-07-01","end_date":"2028-06-30","league":"Integration League","clubs":["Integration Club","Other Club"]}')->>'id')::uuid;
 if (select current_season_id from public.fc_profiles where universe_id=u)<>next_season or (select status from public.fc_seasons where id=season)<>'completed' or (select count(*) from public.fc_matches where universe_id=u)<>1 then raise exception 'Season transition lost history';end if;
 scan=public.fc_claim_scan(actor,u,repeat('a',64));
 begin
  perform public.fc_claim_scan(actor,u,repeat('a',64));
  raise exception 'Duplicate scan incorrectly accepted';
 exception when others then if sqlerrm<>'ACTION_RUNNING' then raise;end if;end;
 update public.fc_scan_cache set status='completed',result='{"fields":{"home_score":2},"notes":"Integration result"}' where universe_id=u and hash=repeat('a',64) and token=(scan->>'token')::uuid;
 if not (public.fc_claim_scan(actor,u,repeat('a',64))->>'cached')::boolean then raise exception 'Screenshot cache missed';end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'fc_%' or p.proname='create_football_universe') and has_function_privilege('authenticated',p.oid,'EXECUTE')) then raise exception 'Client has writer RPC permission';end if;
 if exists(select 1 from pg_tables where schemaname='public' and tablename like 'fc_%' and not rowsecurity) then raise exception 'Football table missing RLS';end if;
end $$;
rollback;
select 'Football transaction, ownership, history, cache and permission checks passed; all fixture writes rolled back.' as verification;
