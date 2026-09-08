-- Run as a database administrator. Every fixture and write is rolled back.
begin;
create temporary table workflow_checks(name text primary key) on commit drop;
do $$
declare actor uuid; source career_profiles; season uuid; u uuid; c uuid; u2 uuid; c2 uuid;
  salary uuid; sponsor uuid; conflict uuid; g uuid; enemy uuid; other_game uuid;
  count_before integer; total_before numeric; response jsonb; payload jsonb; stat_id uuid;
begin
  select cp.* into source from career_profiles cp join universes un on un.id=cp.universe_id
    where un.owner_id is not null limit 1;
  select owner_id,current_season_id into actor,season from universes where id=source.universe_id;
  if actor is null or season is null then raise exception 'Test requires one owned career with a season'; end if;
  insert into universes(owner_id,name,current_season_id,universe_date,language)
    values(actor,'Rollback workflow fixture',season,'2026-01-15','de') returning id into u;
  insert into career_profiles(universe_id,player_name,current_team_id,universe_date)
    values(u,'Rollback player',source.current_team_id,'2026-01-15') returning id into c;
  insert into world_settings(career_id,universe_date,current_season_id) values(c,'2026-01-15',season);
  insert into team_stints(career_id,team_id,start_date) values(c,source.current_team_id,'2026-01-01');
  insert into universes(owner_id,name,current_season_id,universe_date,language)
    values(actor,'Other rollback fixture',season,'2026-01-15','en') returning id into u2;
  insert into career_profiles(universe_id,player_name,current_team_id,universe_date)
    values(u2,'Other player',source.current_team_id,'2026-01-15') returning id into c2;

  salary:=prepare_career_salary(actor,c,'2026-01-15','2027-01-15',120000,1200);
  if prepare_career_salary(actor,c,'2026-01-15','2027-01-15',120000,1200)<>salary then raise exception 'Duplicate salary draft'; end if;
  insert into workflow_checks values('salary draft retry keeps one contract');
  begin
    perform respond_career_contract(gen_random_uuid(),c,salary,'accept');
    raise exception 'Unauthorized owner accepted';
  exception when raise_exception then if sqlerrm<>'FORBIDDEN' then raise; end if; end;
  begin
    perform respond_career_contract(actor,c2,salary,'accept');
    raise exception 'Foreign contract accepted';
  exception when raise_exception then if sqlerrm<>'STALE_OFFER' then raise; end if; end;
  insert into workflow_checks values('owner and career isolation');

  perform respond_career_contract(actor,c,salary,'accept');
  perform respond_career_contract(actor,c,salary,'accept');
  if (select count(*) from career_ledger where career_id=c)<>1 then raise exception 'Duplicate signing bonus'; end if;
  if (select net from career_ledger where contract_id=salary)<>1152 then raise exception 'Wrong signing fee'; end if;
  insert into workflow_checks values('signature retry and 4 percent fee');
  perform set_career_date(actor,c,'2026-01-30');
  if (select count(*) from career_ledger where career_id=c)<>1 then raise exception 'Premature installment'; end if;
  perform set_career_date(actor,c,'2026-01-31');
  if (select gross from career_ledger where contract_id=salary and kind='installment')<>5483.87 then raise exception 'Wrong partial January'; end if;
  perform set_career_date(actor,c,'2026-02-28');
  if (select gross from career_ledger where contract_id=salary and period_start='2026-02-01')<>10000 then raise exception 'Wrong February'; end if;
  insert into workflow_checks values('automatic monthly and prorated salary payments');
  select count(*),sum(net) into count_before,total_before from career_ledger where career_id=c;
  perform settle_career_contracts(actor,c);
  perform set_career_date(actor,c,'2026-01-15');
  perform set_career_date(actor,c,'2026-02-28');
  if (select count(*) from career_ledger where career_id=c)<>count_before or
     (select sum(net) from career_ledger where career_id=c)<>total_before then raise exception 'Rewind duplicated payments'; end if;
  insert into workflow_checks values('repeat settlement and career rewind preserve ledger');

  insert into career_contracts(career_id,kind,category,brand,annual_value,signing_bonus,agent_fee_pct,
    start_date,end_date,offered_on,expires_on,language)
  values(c,'sponsorship','footwear','Nike',12000,1000,15,'2026-02-20','2028-02-20','2026-02-20','2026-03-06','de') returning id into sponsor;
  perform respond_career_contract(actor,c,sponsor,'accept');
  if (select start_date from career_contracts where id=sponsor)<>'2026-02-28' then raise exception 'Sponsor backdated'; end if;
  if (select net from career_ledger where contract_id=sponsor and kind='signing_bonus')<>850 then raise exception 'Wrong sponsor fee'; end if;
  insert into workflow_checks values('sponsorship starts at signature with 15 percent fee');
  insert into career_contracts(career_id,kind,category,brand,annual_value,signing_bonus,agent_fee_pct,
    start_date,end_date,offered_on,expires_on,language)
  values(c,'sponsorship','footwear','adidas',12000,1000,15,'2026-02-28','2028-02-28','2026-02-28','2026-03-14','de') returning id into conflict;
  begin
    perform respond_career_contract(actor,c,conflict,'accept');
    raise exception 'Overlapping sponsorship accepted';
  exception when raise_exception then if sqlerrm<>'CONTRACT_CONFLICT' then raise; end if; end;
  perform respond_career_contract(actor,c,conflict,'decline');
  perform respond_career_contract(actor,c,conflict,'decline');
  insert into workflow_checks values('exclusive category and repeat decline');

  select id into enemy from teams where active and id<>source.current_team_id limit 1;
  insert into games(season_id,source_key,game_date,game_day,home_team_id,away_team_id,universe_id)
    values(season,'rollback:'||gen_random_uuid(),'2026-03-01 20:00Z','2026-03-01',source.current_team_id,enemy,u) returning id into g;
  payload:='{"homeScore":115,"awayScore":102,"stat":{"appearance_status":"played","minutes":36,"points":30,"rebounds":10,"assists":10,"steals":1,"blocks":2,"turnovers":3,"fouls":2,"technical_fouls":0,"flagrant_fouls":0,"fgm":10,"fga":20,"tpm":4,"tpa":8,"ftm":6,"fta":6,"plus_minus":13,"started":true,"fouled_out":false,"ejected":false,"injured":false,"story_notes":"Deutsche Spielnotiz"},"notables":[]}'::jsonb;
  response:=save_career_game(actor,c,g,payload);
  stat_id:=(response->'stat'->>'id')::uuid;
  begin
    perform save_career_game(actor,c,g,payload);
    raise exception 'Stale save accepted';
  exception when raise_exception then if sqlerrm<>'STALE_GAME' then raise; end if; end;
  begin
    perform save_career_game(actor,c2,g,payload);
    raise exception 'Other universe game accepted';
  exception when raise_exception then if sqlerrm<>'GAME_NOT_FOUND' then raise; end if; end;
  insert into workflow_checks values('atomic game save, stale edit and manual game isolation');
  perform move_career_team(actor,c,enemy,'2026-03-02','Rollback trade');
  update universes set language='en' where id=u;
  payload:=jsonb_set(payload,'{expectedUpdatedAt}',response->'stat'->'updated_at');
  payload:=jsonb_set(payload,'{stat,story_notes}','"English game note"');
  response:=save_career_game(actor,c,g,payload);
  if (response->'stat'->>'team_id')::uuid<>source.current_team_id then raise exception 'Historical team changed'; end if;
  if response->'stat'->'localized_notes'->'de'->>'story_notes'<>'Deutsche Spielnotiz' then raise exception 'German note erased'; end if;
  if (select count(*) from career_events where career_id=c and event_type='game')<>1 then raise exception 'Duplicated game event'; end if;
  if (select team_id from career_contracts where id=salary)<>source.current_team_id then raise exception 'Original salary employer lost'; end if;
  insert into workflow_checks values('trade preserves historical team, contract and both note languages');

  perform set_career_date(actor,c,'2027-01-15');
  if (select status from career_contracts where id=salary)<>'expired' then raise exception 'Salary did not expire'; end if;
  if (select gross from career_ledger where contract_id=salary and period_start='2027-01-01')<>4516.13 then raise exception 'Wrong final partial month'; end if;
  begin
    perform prepare_career_salary(actor,c,'2026-12-01','2028-01-01',240000,0);
    raise exception 'Expired contract overlap accepted';
  exception when raise_exception then if sqlerrm<>'CONTRACT_CONFLICT' then raise; end if; end;
  insert into workflow_checks values('contract expiry, final payment and retrospective overlap');

  if has_function_privilege('anon','public.respond_career_contract(uuid,uuid,uuid,text)','EXECUTE')
    or has_function_privilege('authenticated','public.prepare_career_salary(uuid,uuid,date,date,numeric,numeric)','EXECUTE')
    then raise exception 'Privileged RPC exposed'; end if;
  if has_table_privilege('anon','public.career_ledger','SELECT') then raise exception 'Ledger exposed'; end if;
  insert into workflow_checks values('private financial data and service-only mutation RPCs');
end $$;
select name,'passed' as result from workflow_checks order by name;
rollback;
