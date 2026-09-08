-- Run as postgres inside BEGIN / ROLLBACK. Fixtures never persist.
-- Exercise the actual API database role, not the migration administrator.
select set_config('test.creation_actor',gen_random_uuid()::text,true);
select set_config('test.creation_partner',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role) values
 (current_setting('test.creation_actor')::uuid,'authenticated','authenticated'),
 (current_setting('test.creation_partner')::uuid,'authenticated','authenticated');
set local role service_role;
do $$
declare actor uuid:=current_setting('test.creation_actor')::uuid;
 partner uuid:=current_setting('test.creation_partner')::uuid;
 team uuid; u uuid; v uuid; c uuid; payload jsonb; before_count bigint;
begin
 select id into team from public.teams where abbreviation='ORL' and active limit 1;
 if team is null then raise exception 'ORL fixture unavailable'; end if;
 payload:=jsonb_build_object('name','Creation regression','playerName','Test Player',
   'teamId',team,'position','C','overall',79,'jerseyNumber',19,'draftStatus','drafted',
   'draftYear',2026,'draftPick',2,'draftRound',1,'universeDate','2026-10-20','language','de');
 u:=public.create_career_universe(actor,payload);
 v:=public.create_career_universe(partner,payload||'{"draftStatus":"undrafted","language":"en"}'::jsonb);
 if u=v or not exists(select 1 from public.universes where id=u and owner_id=actor and visibility='private')
   or not exists(select 1 from public.universes where id=v and owner_id=partner and visibility='private')
   then raise exception 'Career owners were not isolated'; end if;
 select id into c from public.career_profiles where universe_id=u and draft_status='drafted'
   and draft_pick=2 and draft_round=1 and overall=79 and jersey_number=19 and current_team_id=team;
 if c is null or not exists(select 1 from public.world_settings where career_id=c)
   or not exists(select 1 from public.team_stints where career_id=c and team_id=team)
   then raise exception 'Career initialization incomplete'; end if;
 if not exists(select 1 from public.career_profiles where universe_id=v and draft_status='undrafted'
   and draft_pick is null and draft_round is null) then raise exception 'Undrafted creation failed'; end if;
 select count(*) into before_count from public.universes;
 begin
   perform public.create_career_universe(null,payload);
   raise exception 'Null owner accepted';
 exception when raise_exception then if sqlerrm<>'FORBIDDEN' then raise; end if; end;
 begin
   perform public.create_career_universe(gen_random_uuid(),payload);
   raise exception 'Nonexistent account accepted';
 exception when foreign_key_violation then null; end;
 begin
   perform public.create_career_universe(actor,payload||jsonb_build_object('teamId',gen_random_uuid()));
   raise exception 'Nonexistent team accepted';
 exception when foreign_key_violation then null; end;
 if (select count(*) from public.universes)<>before_count then raise exception 'Failed creation left partial data'; end if;
 if has_function_privilege('anon','public.create_career_universe(uuid,jsonb)','EXECUTE')
   or has_function_privilege('authenticated','public.create_career_universe(uuid,jsonb)','EXECUTE')
   then raise exception 'Creation exposed to untrusted callers'; end if;
end $$;
reset role;
select 'career creation passed as service_role for two accounts; invalid input rolled back' as result;
