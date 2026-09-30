-- Preserve a user's edits when another tab has changed the career.
create function public.fc_mutate_checked(p_actor uuid,p_universe uuid,p_expected timestamptz,p_action text,p_data jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare u universes;p fc_profiles;v_result uuid;begin
 select * into u from universes where id=p_universe and owner_id=p_actor and game='fc' for update;
 if u.id is null then raise exception 'FORBIDDEN';end if;
 select * into p from fc_profiles where universe_id=u.id for update;
 if p_expected is null or p.updated_at<>p_expected then raise exception 'STALE_GAME';end if;
 if p_action='profile' then perform fc_update_profile(p_actor,u.id,p_data);
 elsif p_action='lineup' then perform fc_save_lineup(p_actor,u.id,p_data->>'formation',p_data->'slots');
 elsif p_action='season' then v_result=fc_new_season(p_actor,u.id,p_data);
 elsif p_action='transfer' then v_result=fc_record_transfer(p_actor,u.id,p_data,(p_data->>'squad_id')::uuid);
 else raise exception 'INVALID_VALUES';end if;
 return jsonb_build_object('id',v_result);
end $$;
revoke all on function public.fc_mutate_checked(uuid,uuid,timestamptz,text,jsonb) from public,anon,authenticated;
grant execute on function public.fc_mutate_checked(uuid,uuid,timestamptz,text,jsonb) to service_role;

-- Cache extracted values, never uploaded image bytes. A token prevents duplicate AI work.
create table public.fc_scan_cache(
 universe_id uuid not null references public.universes(id) on delete cascade,
 hash text not null check(hash ~ '^[0-9a-f]{64}$'),status text not null check(status in('running','completed','failed')),
 result jsonb,token uuid not null default gen_random_uuid(),updated_at timestamptz not null default now(),
 primary key(universe_id,hash)
);
alter table public.fc_scan_cache enable row level security;
revoke all on public.fc_scan_cache from anon,authenticated;
grant select on public.fc_scan_cache to authenticated;
grant select,insert,update,delete on public.fc_scan_cache to service_role;
create policy fc_scan_owner_read on public.fc_scan_cache for select to authenticated
 using(exists(select 1 from public.universes u where u.id=universe_id and u.owner_id=(select auth.uid())));
create function public.fc_claim_scan(p_actor uuid,p_universe uuid,p_hash text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare u uuid;r fc_scan_cache;t uuid;begin
 select id into u from universes where id=p_universe and owner_id=p_actor and game='fc' for update;
 if u is null then raise exception 'FORBIDDEN';end if;
 select * into r from fc_scan_cache where universe_id=u and hash=p_hash for update;
 if r.status='completed' then return jsonb_build_object('cached',true,'result',r.result);end if;
 if r.status='running' and r.updated_at>now()-interval '70 seconds' then raise exception 'ACTION_RUNNING';end if;
 if (select count(*) from fc_scan_cache where universe_id=u and updated_at>now()-interval '1 minute')>=3 then raise exception 'RATE_LIMITED';end if;
 t=gen_random_uuid();
 insert into fc_scan_cache(universe_id,hash,status,token) values(u,p_hash,'running',t)
 on conflict(universe_id,hash) do update set status='running',token=t,updated_at=now();
 return jsonb_build_object('cached',false,'token',t);
end $$;
revoke all on function public.fc_claim_scan(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.fc_claim_scan(uuid,uuid,text) to service_role;
