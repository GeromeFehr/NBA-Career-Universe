-- Run inside a transaction and roll back: no career fixtures persist.
do $$
declare actor uuid; team uuid; u uuid; c uuid; r uuid; s uuid; before_rookie uuid; begin
 select id into actor from auth.users order by created_at limit 1;
 select id into team from public.teams where active limit 1;
 if actor is null or team is null then raise exception 'Test requires an existing account and team'; end if;
 u:=public.create_career_universe(actor,jsonb_build_object('name','Background rollback test','playerName','Test Player','teamId',team,'language','de','draftStatus','undrafted','draftYear',2024,'draftPick',2,'draftRound',1));
 select id,rookie_season_id into c,before_rookie from public.career_profiles where universe_id=u;
 if not exists(select 1 from public.career_profiles where id=c and draft_status='undrafted' and draft_pick is null and draft_round is null and draft_year=2024) then raise exception 'Undrafted origin incorrect'; end if;
 begin
  update public.career_profiles set draft_pick=2 where id=c;
  raise exception 'Contradictory undrafted pick accepted';
 exception when check_violation then null; end;
 insert into public.seasons(label,start_date,end_date,current) values('Background test '||gen_random_uuid(),'2027-10-01','2028-06-30',false) returning id into s;
 perform public.set_career_date(actor,c,'2027-10-01',s);
 if not exists(select 1 from public.career_profiles cp join public.universes un on un.id=cp.universe_id where cp.id=c and cp.rookie_season_id=before_rookie and un.current_season_id=s and cp.draft_status='undrafted') then raise exception 'Season transition changed career origin'; end if;
 u:=public.create_career_universe(actor,jsonb_build_object('name','Unknown rollback test','playerName','Test Player','teamId',team,'language','en'));
 if not exists(select 1 from public.career_profiles where universe_id=u and draft_status='unknown' and draft_pick is null and draft_round is null) then raise exception 'Unknown mistaken for undrafted'; end if;
 u:=public.create_career_universe(actor,jsonb_build_object('name','Drafted rollback test','playerName','Test Player','teamId',team,'language','en','draftStatus','drafted','draftYear',2026,'draftPick',42,'draftRound',2));
 if not exists(select 1 from public.career_profiles where universe_id=u and draft_status='drafted' and draft_pick=42 and draft_round=2) then raise exception 'Second round not preserved'; end if;
 if has_function_privilege('anon','public.create_career_universe(uuid,jsonb)','EXECUTE') or has_function_privilege('authenticated','public.create_career_universe(uuid,jsonb)','EXECUTE') then raise exception 'Privileged creation exposed'; end if;
end $$;
select 'player background and season transition checks passed' as result;
