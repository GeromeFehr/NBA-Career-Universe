-- Draft origin is permanent; rookie status is derived from rookie_season_id.
-- Missing draft data remains unknown, never implicitly undrafted.
alter table public.career_profiles add column draft_status text not null default 'unknown';
update public.career_profiles set draft_status='drafted' where draft_pick is not null;
-- Older creation forms silently defaulted the round to 1 even with no pick.
update public.career_profiles set draft_round=null where draft_pick is null;
alter table public.career_profiles add constraint career_draft_status_valid
  check (draft_status in ('drafted','undrafted','unknown'));
alter table public.career_profiles add constraint career_draft_origin_valid
  check ((draft_status='drafted' and draft_pick is not null and draft_pick between 1 and 100
    and (draft_round is null or draft_round in (1,2)))
    or (draft_status in ('undrafted','unknown') and draft_pick is null and draft_round is null));

create or replace function public.create_career_universe(p_actor uuid,p_data jsonb) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare u uuid; c uuid; s seasons; d date; l text; ds text; dp int; dr int; begin
 if not exists(select 1 from auth.users where id=p_actor) then raise exception 'FORBIDDEN'; end if;
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
