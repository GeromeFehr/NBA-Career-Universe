create function public.fc_update_profile(p_actor uuid,p_universe uuid,p_data jsonb) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare u universes;r fc_profiles;begin
 select * into u from universes where id=p_universe and owner_id=p_actor and game='fc' for update;
 if u.id is null then raise exception 'FORBIDDEN';end if;
 r=jsonb_populate_record(null::fc_profiles,p_data->'profile');
 update fc_profiles set person_name=r.person_name,position=r.position,overall=r.overall,jersey_number=r.jersey_number,nationality=r.nationality,birth_date=r.birth_date,formation=r.formation,budget=r.budget,weekly_wage=r.weekly_wage,contract_until=r.contract_until where universe_id=u.id;
 update universes set name=p_data->>'name',language=p_data->>'language',universe_date=(p_data->>'universe_date')::date,updated_at=now() where id=u.id;
end $$;
revoke all on function public.fc_update_profile(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.fc_update_profile(uuid,uuid,jsonb) to service_role;

