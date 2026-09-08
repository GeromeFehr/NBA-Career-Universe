-- The API verifies the actor with auth.getUser() before calling this service-only RPC.
-- The existing owner foreign key validates account existence without reading auth.users.
create or replace function public.create_career_universe(p_actor uuid,p_data jsonb) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare u uuid; c uuid; s seasons; d date; l text; ds text; dp int; dr int; begin
 if p_actor is null then raise exception 'FORBIDDEN'; end if;
 select * into s from seasons where current order by start_date desc limit 1;
 if s.id is null then raise exception 'NO_SEASON'; end if;
 d:=coalesce((p_data->>'universeDate')::date,s.start_date);l:=coalesce(p_data->>'language','de');
 dp:=nullif(p_data->>'draftPick','')::int;
 ds:=coalesce(nullif(p_data->>'draftStatus',''),case when dp is null then 'unknown' else 'drafted' end);
 if ds not in ('drafted','undrafted','unknown') then raise exception 'INVALID_DRAFT'; end if;
 if ds='drafted' then
   if dp is null or dp<1 or dp>100 then raise exception 'INVALID_DRAFT'; end if;
   dr:=nullif(p_data->>'draftRound','')::int;
   if dr is not null and dr not in (1,2) then raise exception 'INVALID_DRAFT'; end if;
 else dp:=null; dr:=null;
 end if;
 insert into universes(owner_id,name,language,current_season_id,universe_date) values(p_actor,p_data->>'name',l,s.id,d) returning id into u;
 insert into career_profiles(universe_id,player_name,position,jersey_number,overall,draft_status,draft_year,draft_round,draft_pick,current_team_id,rookie_season_id,universe_date) values(u,p_data->>'playerName',p_data->>'position',nullif(p_data->>'jerseyNumber','')::int,coalesce((p_data->>'overall')::int,75),ds,nullif(p_data->>'draftYear','')::int,dr,dp,(p_data->>'teamId')::uuid,s.id,d) returning id into c;
 insert into world_settings(career_id,universe_date,current_season_id) values(c,d,s.id);
 insert into team_stints(career_id,team_id,start_date,acquisition,notes_language) values(c,(p_data->>'teamId')::uuid,d,case when l='en' then 'Career debut' else 'Karrierestart' end,l);
 return u;
end $$;
revoke all on function public.create_career_universe(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_career_universe(uuid,jsonb) to service_role;
