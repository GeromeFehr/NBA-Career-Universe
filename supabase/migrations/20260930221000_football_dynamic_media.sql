-- Keep legacy reports and the five-argument API usable during the rollout.
alter table public.fc_media
 add column outlet text,
 add column model text,
 add column generation_version smallint not null default 1;

create function public.fc_claim_media(p_actor uuid,p_universe uuid,p_match uuid,p_language text,p_ai boolean,p_force boolean)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare m fc_matches;j fc_media_jobs;t uuid;begin
 if not exists(select 1 from universes where id=p_universe and owner_id=p_actor and game='fc') then raise exception 'FORBIDDEN';end if;
 select * into m from fc_matches where id=p_match and universe_id=p_universe and status='completed' for update;
 if m.id is null then raise exception 'GAME_NOT_FOUND';end if;
 select * into j from fc_media_jobs where match_id=m.id for update;
 if j.status='running' and j.updated_at>now()-interval '70 seconds' then raise exception 'ACTION_RUNNING';end if;
 if not p_force and (select count(*) from fc_media where match_id=m.id and language=p_language and match_version=m.updated_at and generation_version=2 and (not p_ai or source='openai'))=9 then return jsonb_build_object('cached',true);end if;
 t=gen_random_uuid();
 insert into fc_media_jobs(match_id,universe_id,match_version,language,token,status) values(m.id,p_universe,m.updated_at,p_language,t,'running')
 on conflict(match_id) do update set match_version=m.updated_at,language=p_language,token=t,status='running',updated_at=now();
 return jsonb_build_object('cached',false,'token',t,'version',m.updated_at);
end $$;

create or replace function public.fc_claim_media(p_actor uuid,p_universe uuid,p_match uuid,p_language text,p_ai boolean)
returns jsonb language sql security invoker set search_path=public,pg_temp as $$
 select public.fc_claim_media(p_actor,p_universe,p_match,p_language,p_ai,false);
$$;

create or replace function public.fc_finish_media(p_actor uuid,p_universe uuid,p_match uuid,p_token uuid,p_items jsonb,p_interview jsonb)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare m fc_matches;j fc_media_jobs;e jsonb;begin
 if not exists(select 1 from universes where id=p_universe and owner_id=p_actor and game='fc') then raise exception 'FORBIDDEN';end if;
 select * into m from fc_matches where id=p_match and universe_id=p_universe for update;
 select * into j from fc_media_jobs where match_id=m.id and token=p_token and status='running' for update;
 if j.match_id is null or j.match_version<>m.updated_at then raise exception 'STALE_GAME';end if;
 delete from fc_media where match_id=m.id and language=j.language;
 for e in select value from jsonb_array_elements(p_items) loop
  insert into fc_media(universe_id,match_id,language,kind,author,headline,body,source,match_version,outlet,model,generation_version)
  values(p_universe,m.id,j.language,e->>'kind',e->>'author',e->>'headline',e->>'body',e->>'source',m.updated_at,nullif(e->>'outlet',''),nullif(e->>'model',''),coalesce((e->>'generation_version')::smallint,1));
 end loop;
 insert into fc_interviews(universe_id,match_id,language,question,options) values(p_universe,m.id,j.language,p_interview->>'question',p_interview->'options')
 on conflict(match_id,language) do update set question=case when fc_interviews.answer is null then excluded.question else fc_interviews.question end,options=case when fc_interviews.answer is null then excluded.options else fc_interviews.options end;
 update fc_media_jobs set status='completed',updated_at=now() where match_id=m.id and token=p_token;
end $$;

revoke all on function public.fc_claim_media(uuid,uuid,uuid,text,boolean,boolean) from public,anon,authenticated;
revoke all on function public.fc_claim_media(uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
revoke all on function public.fc_finish_media(uuid,uuid,uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.fc_claim_media(uuid,uuid,uuid,text,boolean,boolean) to service_role;
grant execute on function public.fc_claim_media(uuid,uuid,uuid,text,boolean) to service_role;
grant execute on function public.fc_finish_media(uuid,uuid,uuid,uuid,jsonb,jsonb) to service_role;
notify pgrst,'reload schema';
