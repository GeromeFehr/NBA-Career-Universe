begin;
create table public.career_contracts(
 id uuid primary key default gen_random_uuid(),career_id uuid not null references public.career_profiles(id) on delete cascade,
 kind text not null check(kind in ('salary','sponsorship')),category text not null,brand text not null,
 team_id uuid references public.teams(id),status text not null default 'offered' check(status in ('offered','active','declined','expired')),
 annual_value numeric(14,2) not null check(annual_value>0 and annual_value<=1000000000),signing_bonus numeric(14,2) not null default 0 check(signing_bonus>=0),agent_fee_pct numeric(5,2) not null check(agent_fee_pct between 0 and 30),
 start_date date not null,end_date date not null,offered_on date not null,expires_on date not null,
 terms jsonb not null default '{}',language text not null check(language in ('de','en')),signed_at timestamptz,
 created_at timestamptz not null default now(),check(end_date>start_date),unique(career_id,brand,offered_on,kind)
);
create index contracts_career_status_idx on public.career_contracts(career_id,status);
create index contracts_team_idx on public.career_contracts(team_id);
create table public.career_ledger(
 id uuid primary key default gen_random_uuid(),career_id uuid not null references public.career_profiles(id) on delete cascade,
 contract_id uuid not null references public.career_contracts(id) on delete restrict,
 period_start date not null,period_end date not null,paid_on date not null,kind text not null check(kind in ('installment','signing_bonus')),
 gross numeric(14,2) not null check(gross>=0),agent_fee numeric(14,2) not null check(agent_fee>=0),net numeric(14,2) not null check(net>=0),
 created_at timestamptz not null default now(),unique(contract_id,period_start,kind),check(gross-agent_fee=net)
);
create index ledger_career_date_idx on public.career_ledger(career_id,paid_on desc);
alter table public.career_contracts enable row level security;
alter table public.career_ledger enable row level security;
grant select on public.career_contracts,public.career_ledger to authenticated;
grant all on public.career_contracts,public.career_ledger to service_role;
revoke all on public.career_contracts,public.career_ledger from anon;
create policy contracts_owner on public.career_contracts for select to authenticated using(private.can_write_career(career_id));
create policy ledger_owner on public.career_ledger for select to authenticated using(private.can_write_career(career_id));
create function public.settle_career_contracts(p_actor uuid,p_career uuid) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare c career_profiles; v career_contracts; m date; month_end date; a date; b date; gross_amount numeric(14,2); fee numeric(14,2); n integer:=0; inserted integer;
begin
 select * into c from career_profiles where id=p_career for update;
 if not exists(select 1 from universes where id=c.universe_id and owner_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 for v in select * from career_contracts where career_id=c.id and status in ('active','expired') and signed_at is not null loop
  m:=date_trunc('month',v.start_date)::date;
  while m<v.end_date and m<=c.universe_date loop
   month_end:=(m+interval '1 month')::date;
   a:=greatest(m,v.start_date);b:=least(month_end,v.end_date);
   if b<=c.universe_date+1 and b>a then
    gross_amount:=round(v.annual_value/12*(b-a)::numeric/(month_end-m),2);fee:=round(gross_amount*v.agent_fee_pct/100,2);
    insert into career_ledger(career_id,contract_id,period_start,period_end,paid_on,kind,gross,agent_fee,net) values(c.id,v.id,a,b-1,b-1,'installment',gross_amount,fee,gross_amount-fee) on conflict do nothing;
    get diagnostics inserted=row_count;n:=n+inserted;
   end if;
   m:=month_end;
  end loop;
 end loop;
 update career_contracts set status='expired' where career_id=c.id and status='active' and end_date<=c.universe_date;
 return jsonb_build_object('payments',n);
end $$;
create function public.respond_career_contract(p_actor uuid,p_career uuid,p_contract uuid,p_action text) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare c career_profiles; v career_contracts; fee numeric(14,2); begin
 select * into c from career_profiles where id=p_career for update;
 if not exists(select 1 from universes where id=c.universe_id and owner_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 select * into v from career_contracts where id=p_contract and career_id=c.id for update;
 if v.id is null or v.status<>'offered' or v.expires_on<c.universe_date then raise exception 'STALE_OFFER'; end if;
 if p_action='decline' then update career_contracts set status='declined' where id=v.id;return jsonb_build_object('status','declined'); end if;
 if p_action<>'accept' then raise exception 'INVALID_ANSWER'; end if;
 if exists(select 1 from career_contracts where career_id=c.id and status='active' and category=v.category and start_date<v.end_date and end_date>v.start_date) then raise exception 'CONTRACT_CONFLICT'; end if;
 update career_contracts set status='active',signed_at=now() where id=v.id;
 if v.signing_bonus>0 then fee:=round(v.signing_bonus*v.agent_fee_pct/100,2);
 insert into career_ledger(career_id,contract_id,period_start,period_end,paid_on,kind,gross,agent_fee,net) values(c.id,v.id,c.universe_date,c.universe_date,c.universe_date,'signing_bonus',v.signing_bonus,fee,v.signing_bonus-fee) on conflict do nothing;end if;
 perform settle_career_contracts(p_actor,c.id);
 return jsonb_build_object('status','active');
end $$;
create function public.respond_trade_story(p_actor uuid,p_career uuid,p_saga uuid,p_choice text) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare c career_profiles; u universes; s trade_sagas; cfg jsonb; txt text; h int; st text; begin
 select * into c from career_profiles where id=p_career for update;
 select * into u from universes where id=c.universe_id and owner_id=p_actor;
 if u.id is null then raise exception 'FORBIDDEN'; end if;
 select * into s from trade_sagas where id=p_saga and career_id=c.id and language=u.language and status='active' for update;
 if s.id is null then raise exception 'STALE_OFFER'; end if;
 if s.metadata->>'last_response_date'=c.universe_date::text then raise exception 'DAILY_RESPONSE'; end if;
 cfg:=case p_choice
 when 'demand' then '{"heat":18,"hype":8,"fans":-3,"expert":-2,"hater":8,"de":"Ich will einen Trade. Die Situation muss sich ändern.","en":"I want a trade. The situation has to change."}'::jsonb
 when 'silent' then '{"heat":4,"hype":2,"fans":0,"expert":1,"hater":2,"de":"Kein Kommentar zu den Gerüchten.","en":"No comment on the rumors."}'::jsonb
 when 'deny' then '{"heat":-10,"hype":-3,"fans":4,"expert":2,"hater":-1,"de":"Mein Fokus liegt auf Basketball. Die Gerüchte stimmen so nicht.","en":"My focus is basketball. The rumors are not accurate."}'::jsonb
 when 'happy' then '{"heat":-16,"hype":-4,"fans":7,"expert":3,"hater":-2,"de":"Ich bin hier glücklich und will mit diesem Team gewinnen.","en":"I am happy here and want to win with this team."}'::jsonb else null end;
 if cfg is null then raise exception 'INVALID_ANSWER'; end if;
 txt:=cfg->>u.language;h:=greatest(0,least(100,s.heat+(cfg->>'heat')::int));st:=case when p_choice='happy' then 'resolved' else 'active' end;
 update trade_sagas set heat=h,status=st,summary=txt,metadata=metadata||jsonb_build_object('last_player_response',p_choice,'last_response_date',c.universe_date),updated_at=now() where id=s.id;
 insert into trade_saga_updates(saga_id,update_date,kind,headline,body,language) values(s.id,c.universe_date,'player_response',case when u.language='en' then 'Player responds to trade rumors' else 'Stellungnahme zu den Trade-Gerüchten' end,txt,u.language);
 insert into universe_reputation(career_id) values(c.id) on conflict do nothing;
 update universe_reputation set media_hype=greatest(0,least(100,media_hype+(cfg->>'hype')::int)),fan_approval=greatest(0,least(100,fan_approval+(cfg->>'fans')::int)),expert_respect=greatest(0,least(100,expert_respect+(cfg->>'expert')::int)),hater_heat=greatest(0,least(100,hater_heat+(cfg->>'hater')::int)),updated_at=now() where career_id=c.id;
 insert into media_posts(career_id,outlet,kind,author_name,tone,headline,body,virality,generation_source,language) values(c.id,'Career Universe','rumor','R. Fields','measured',case when u.language='en' then 'A statement on the trade rumors' else 'Eine Stellungnahme zu den Trade-Gerüchten' end,txt,68,'player_choice',u.language);
 return jsonb_build_object('heat',h,'status',st);
end $$;
do $$ declare f record; begin for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in ('settle_career_contracts','respond_career_contract','respond_trade_story') loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to service_role',f.signature);end loop;end $$;
commit;
