-- Prevent mismatched or repeated squad departures from changing the budget.
create or replace function public.fc_record_transfer(p_actor uuid,p_universe uuid,p_data jsonb,p_squad_id uuid default null) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare u universes;c fc_profiles;t uuid;d date;begin
 select * into u from universes where id=p_universe and owner_id=p_actor and game='fc' for update;
 if u.id is null then raise exception 'FORBIDDEN';end if;
 select * into c from fc_profiles where universe_id=u.id for update;d=(p_data->>'transfer_date')::date;
 if p_data->>'direction' not in('in','out','career') or (c.mode='player' and p_data->>'direction'<>'career') then raise exception 'INVALID_TRANSFER';end if;
 if p_data->>'direction'='career' then
  if d<u.universe_date or p_data->>'from_club'<>c.club_name or p_data->>'player_name'<>c.person_name then raise exception 'INVALID_TRANSFER';end if;
  update fc_profiles set club_name=p_data->>'to_club',club_code=null,club_color=coalesce(p_data->>'club_color','#28684b'),league=coalesce(nullif(p_data->>'league',''),c.league),weekly_wage=(p_data->>'weekly_wage')::numeric,contract_until=(p_data->>'contract_until')::date where id=c.id;
  update universes set universe_date=d,updated_at=now() where id=u.id;
  -- Old club fixtures and statistics keep their tracked club. New fixtures are added by the user.
  if c.mode='manager' then update fc_squad set status='departed',lineup_slot=null where universe_id=u.id and status<>'departed';end if;
 elsif p_data->>'direction'='in' then
  if p_data->>'to_club'<>c.club_name then raise exception 'INVALID_TRANSFER';end if;
  if (p_data->>'fee')::numeric>c.budget then raise exception 'INSUFFICIENT_BUDGET';end if;
  update fc_profiles set budget=budget-(p_data->>'fee')::numeric where id=c.id;
 elsif p_data->>'direction'='out' then
  if p_data->>'from_club'<>c.club_name then raise exception 'INVALID_TRANSFER';end if;
  update fc_profiles set budget=budget+(p_data->>'fee')::numeric where id=c.id;
  if p_squad_id is not null then
   update fc_squad set status=case when p_data->>'kind'='loan' then 'loaned' else 'departed' end,lineup_slot=null where id=p_squad_id and universe_id=u.id and name=p_data->>'player_name' and status in('available','injured','suspended');
   if not found then raise exception 'INVALID_TRANSFER';end if;
  end if;
 end if;
 insert into fc_transfers(universe_id,season_id,player_name,from_club,to_club,transfer_date,kind,fee,weekly_wage,contract_until,direction,notes)
 values(u.id,c.current_season_id,p_data->>'player_name',p_data->>'from_club',p_data->>'to_club',d,p_data->>'kind',(p_data->>'fee')::numeric,(p_data->>'weekly_wage')::numeric,(p_data->>'contract_until')::date,p_data->>'direction',p_data->>'notes') returning id into t;
 insert into fc_events(universe_id,season_id,event_date,kind,title,body) values(u.id,c.current_season_id,d,'transfer',(p_data->>'player_name')||' → '||(p_data->>'to_club'),p_data->>'notes');
 return t;
end $$;


