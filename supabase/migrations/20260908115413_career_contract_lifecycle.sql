begin;

-- A salary form submission is atomic and repeatable; an unsigned draft can be corrected.
create or replace function public.prepare_career_salary(
  p_actor uuid, p_career uuid, p_start date, p_end date, p_annual numeric, p_bonus numeric
) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare c career_profiles; v career_contracts; team_code text; lang text; result_id uuid;
begin
  select * into c from career_profiles where id=p_career for update;
  select language into lang from universes where id=c.universe_id and owner_id=p_actor;
  if lang is null then raise exception 'FORBIDDEN'; end if;
  if p_start is null or p_end is null or p_end<=p_start or p_end<=c.universe_date
     or p_end>p_start+interval '10 years' then raise exception 'INVALID_DATE'; end if;
  if p_annual is null or p_bonus is null or p_annual not between 1 and 1000000000
     or p_bonus not between 0 and 1000000000 then raise exception 'INVALID_VALUES'; end if;
  select abbreviation into team_code from teams where id=c.current_team_id;
  if team_code is null then raise exception 'INVALID_TEAM'; end if;
  select * into v from career_contracts
    where career_id=c.id and kind='salary' and brand=team_code and offered_on=c.universe_date for update;
  if v.id is not null and v.status<>'offered' then raise exception 'CONTRACT_ALREADY_RECORDED'; end if;
  if exists(select 1 from career_contracts where career_id=c.id and signed_at is not null
    and category='salary' and start_date<p_end and end_date>p_start) then raise exception 'CONTRACT_CONFLICT'; end if;
  insert into career_contracts(career_id,kind,category,brand,team_id,status,annual_value,signing_bonus,
    agent_fee_pct,start_date,end_date,offered_on,expires_on,language,terms)
  values(c.id,'salary','salary',team_code,c.current_team_id,'offered',round(p_annual,2),round(p_bonus,2),
    4,p_start,p_end,c.universe_date,c.universe_date+14,lang,'{"simulation":true,"transferable":true}')
  on conflict(career_id,brand,offered_on,kind) do update
    set annual_value=excluded.annual_value,signing_bonus=excluded.signing_bonus,
        start_date=excluded.start_date,end_date=excluded.end_date,language=excluded.language
  returning id into result_id;
  return result_id;
end $$;

-- Only completed periods are payable. The unique ledger key also protects retries.
create or replace function public.settle_career_contracts(p_actor uuid,p_career uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare c career_profiles; v career_contracts; m date; month_end date; a date; b date;
  last_paid date; gross_amount numeric(14,2); fee numeric(14,2); n integer:=0; inserted integer;
begin
  select * into c from career_profiles where id=p_career for update;
  if not exists(select 1 from universes where id=c.universe_id and owner_id=p_actor) then raise exception 'FORBIDDEN'; end if;
  for v in select * from career_contracts where career_id=c.id and signed_at is not null loop
    select max(period_end) into last_paid from career_ledger where contract_id=v.id and kind='installment';
    m:=date_trunc('month',greatest(v.start_date,coalesce(last_paid+1,v.start_date)))::date;
    while m<v.end_date and m<=c.universe_date loop
      month_end:=(m+interval '1 month')::date;
      a:=greatest(m,v.start_date); b:=least(month_end,v.end_date);
      if b<=c.universe_date+1 and b>a then
        gross_amount:=round(v.annual_value/12*(b-a)::numeric/(month_end-m),2);
        fee:=round(gross_amount*v.agent_fee_pct/100,2);
        insert into career_ledger(career_id,contract_id,period_start,period_end,paid_on,kind,gross,agent_fee,net)
        values(c.id,v.id,a,b-1,b-1,'installment',gross_amount,fee,gross_amount-fee) on conflict do nothing;
        get diagnostics inserted=row_count; n:=n+inserted;
      end if;
      m:=month_end;
    end loop;
  end loop;
  update career_contracts set status=case when end_date<=c.universe_date then 'expired' else 'active' end
    where career_id=c.id and signed_at is not null;
  return jsonb_build_object('payments',n);
end $$;

create or replace function public.respond_career_contract(p_actor uuid,p_career uuid,p_contract uuid,p_action text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare c career_profiles; v career_contracts; fee numeric(14,2); new_start date; new_end date;
begin
  select * into c from career_profiles where id=p_career for update;
  if not exists(select 1 from universes where id=c.universe_id and owner_id=p_actor) then raise exception 'FORBIDDEN'; end if;
  select * into v from career_contracts where id=p_contract and career_id=c.id for update;
  if v.id is null then raise exception 'STALE_OFFER'; end if;
  -- A retry of the same decision is successful without a second bonus or installment.
  if p_action='accept' and v.signed_at is not null then return jsonb_build_object('status',v.status); end if;
  if p_action='decline' and v.status='declined' then return jsonb_build_object('status','declined'); end if;
  if v.status<>'offered' or v.expires_on<c.universe_date or v.end_date<=c.universe_date then raise exception 'STALE_OFFER'; end if;
  if p_action='decline' then
    update career_contracts set status='declined' where id=v.id;
    return jsonb_build_object('status','declined');
  end if;
  if p_action<>'accept' then raise exception 'INVALID_ANSWER'; end if;
  new_start:=case when v.kind='sponsorship' then c.universe_date else v.start_date end;
  new_end:=case when v.kind='sponsorship' then (c.universe_date+interval '2 years')::date else v.end_date end;
  if exists(select 1 from career_contracts where career_id=c.id and signed_at is not null
    and category=v.category and start_date<new_end and end_date>new_start) then raise exception 'CONTRACT_CONFLICT'; end if;
  update career_contracts set status='active',signed_at=now(),start_date=new_start,end_date=new_end where id=v.id;
  if v.signing_bonus>0 then
    fee:=round(v.signing_bonus*v.agent_fee_pct/100,2);
    insert into career_ledger(career_id,contract_id,period_start,period_end,paid_on,kind,gross,agent_fee,net)
    values(c.id,v.id,c.universe_date,c.universe_date,c.universe_date,'signing_bonus',v.signing_bonus,fee,v.signing_bonus-fee)
    on conflict do nothing;
  end if;
  perform settle_career_contracts(p_actor,c.id);
  return jsonb_build_object('status','active');
end $$;

-- Every existing date-advance flow (game, trade, season and manual date) uses this RPC.
create or replace function public.set_career_date(p_actor uuid,p_career uuid,p_date date,p_season uuid default null)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare c career_profiles;
begin
  select * into c from career_profiles where id=p_career for update;
  if not exists(select 1 from universes where id=c.universe_id and owner_id=p_actor) then raise exception 'FORBIDDEN'; end if;
  if p_date is null then raise exception 'INVALID_DATE'; end if;
  update career_profiles set universe_date=p_date,updated_at=now() where id=c.id;
  update universes set universe_date=p_date,current_season_id=coalesce(p_season,current_season_id),updated_at=now() where id=c.universe_id;
  update world_settings set universe_date=p_date,current_season_id=coalesce(p_season,current_season_id),updated_at=now() where career_id=c.id;
  perform settle_career_contracts(p_actor,c.id);
end $$;

revoke all on function public.prepare_career_salary(uuid,uuid,date,date,numeric,numeric) from public,anon,authenticated;
grant execute on function public.prepare_career_salary(uuid,uuid,date,date,numeric,numeric) to service_role;
-- CREATE OR REPLACE preserves the existing service-role-only grants on the other RPCs.
commit;
