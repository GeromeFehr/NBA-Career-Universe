-- Two consenting owners share only the dedicated co-op read surface.
create table public.coop_links (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(name) between 1 and 80),
 host_universe_id uuid not null unique references public.universes(id) on delete cascade,
 guest_universe_id uuid unique references public.universes(id) on delete cascade,
 invite_hash text unique,
 invite_expires_at timestamptz,
 joined_at timestamptz,
 created_at timestamptz not null default now(),
 check(host_universe_id is distinct from guest_universe_id),
 check(invite_hash is null or invite_hash ~ '^[a-f0-9]{64}$')
);
create table public.coop_score_proposals (
 id uuid primary key default gen_random_uuid(),
 link_id uuid not null references public.coop_links(id) on delete cascade,
 requested_by uuid not null references public.universes(id) on delete cascade,
 host_game_id uuid not null references public.games(id),
 guest_game_id uuid not null references public.games(id),
 home_score int not null check(home_score between 0 and 9999),
 away_score int not null check(away_score between 0 and 9999),
 expected jsonb not null,
 status text not null default 'pending' check(status in ('pending','accepted','rejected','stale')),
 approval_tx bigint,
 created_at timestamptz not null default now(),
 check(home_score<>away_score)
);
create index coop_proposals_link_idx on public.coop_score_proposals(link_id,created_at desc);
create index coop_proposals_requester_idx on public.coop_score_proposals(requested_by);
create index coop_proposals_host_game_idx on public.coop_score_proposals(host_game_id);
create index coop_proposals_guest_game_idx on public.coop_score_proposals(guest_game_id);
create unique index coop_proposals_pending_idx on public.coop_score_proposals(link_id,host_game_id,guest_game_id) where status='pending';
alter table public.coop_links enable row level security;
alter table public.coop_score_proposals enable row level security;
revoke all on public.coop_links,public.coop_score_proposals from anon,authenticated;
grant all on public.coop_links,public.coop_score_proposals to service_role;

create function public.manage_coop(p_actor uuid,p_universe uuid,p_action text,p_hash text default null,p_name text default null) returns uuid
language plpgsql security invoker set search_path=public,pg_temp as $$
declare u universes; host universes; l coop_links; begin
 perform pg_advisory_xact_lock(hashtextextended('coop_membership',0));
 select * into u from universes where id=p_universe and owner_id=p_actor;
 if u.id is null then raise exception 'FORBIDDEN'; end if;
 select * into l from coop_links where host_universe_id=u.id or guest_universe_id=u.id;
 if p_action='leave' then
  if l.id is not null then delete from coop_links where id=l.id; end if;
  return null;
 elsif p_action in ('create','rotate') then
  if l.guest_universe_id is not null then raise exception 'COOP_ALREADY_LINKED'; end if;
  if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_VALUES'; end if;
  if l.id is null then
   insert into coop_links(name,host_universe_id,invite_hash,invite_expires_at) values(coalesce(nullif(trim(p_name),''),'MyNBA'),u.id,p_hash,now()+interval '7 days') returning id into l.id;
  else update coop_links set invite_hash=p_hash,invite_expires_at=now()+interval '7 days' where id=l.id; end if;
  return l.id;
 elsif p_action='join' then
  if l.id is not null then raise exception 'COOP_ALREADY_LINKED'; end if;
  select * into l from coop_links where invite_hash=p_hash and invite_expires_at>now() and guest_universe_id is null;
  if l.id is null then raise exception 'COOP_INVALID_INVITE'; end if;
  select * into host from universes where id=l.host_universe_id;
  if host.owner_id is null or host.owner_id=p_actor then raise exception 'COOP_DIFFERENT_ACCOUNT'; end if;
  if host.language<>u.language then raise exception 'COOP_LANGUAGE_MISMATCH'; end if;
  if host.current_season_id is distinct from u.current_season_id then raise exception 'COOP_SEASON_MISMATCH'; end if;
  if exists(select 1 from universe_games a join games ga on ga.id=a.game_id
   join games gb on gb.season_id=ga.season_id and gb.game_day=ga.game_day and gb.home_team_id=ga.home_team_id and gb.away_team_id=ga.away_team_id and gb.stage=ga.stage
   join universe_games b on b.game_id=gb.id and b.universe_id=u.id
   where a.universe_id=host.id and a.status='completed' and b.status='completed' and (a.home_score<>b.home_score or a.away_score<>b.away_score)) then raise exception 'COOP_EXISTING_CONFLICT'; end if;
  update coop_links set guest_universe_id=u.id,joined_at=now(),invite_hash=null,invite_expires_at=null where id=l.id;
  return l.id;
 end if;
 raise exception 'INVALID_VALUES';
end $$;
revoke all on function public.manage_coop(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.manage_coop(uuid,uuid,text,text,text) to service_role;

-- A trigger must compare two private owners' results, so this narrowly scoped
-- definer lives outside the exposed schema. It returns no other user's data.
create function private.guard_coop_score() returns trigger language plpgsql security definer set search_path='' as $$
declare l public.coop_links; g public.games; peer uuid; begin
 if auth.uid() is not null and not exists(select 1 from public.universes where id=new.universe_id and owner_id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('coop_membership',0));
 select * into l from public.coop_links where guest_universe_id is not null and (host_universe_id=new.universe_id or guest_universe_id=new.universe_id);
 if l.id is null then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('coop_score:'||l.id::text,0));
 if exists(select 1 from public.coop_score_proposals where link_id=l.id and approval_tx=txid_current() and status='accepted' and new.game_id in (host_game_id,guest_game_id) and home_score=new.home_score and away_score=new.away_score) then return new; end if;
 peer:=case when l.host_universe_id=new.universe_id then l.guest_universe_id else l.host_universe_id end;
 select * into g from public.games where id=new.game_id;
 if exists(select 1 from public.universe_games r join public.games pg on pg.id=r.game_id
  where r.universe_id=peer and r.status='completed' and pg.season_id=g.season_id and pg.game_day=g.game_day and pg.home_team_id=g.home_team_id and pg.away_team_id=g.away_team_id and pg.stage=g.stage
  and (new.status<>'completed' or r.home_score is distinct from new.home_score or r.away_score is distinct from new.away_score)) then raise exception 'COOP_SCORE_CONFLICT'; end if;
 return new;
end $$;
revoke all on function private.guard_coop_score() from public,anon,authenticated;
create trigger guard_coop_score before insert or update of home_score,away_score,status on public.universe_games for each row execute function private.guard_coop_score();

create function public.coop_score_action(p_actor uuid,p_universe uuid,p_action text,p_data jsonb) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare l coop_links; p coop_score_proposals; a universe_games; b universe_games; ga games; gb games; hs int; aws int; snapshot jsonb; begin
 perform pg_advisory_xact_lock_shared(hashtextextended('coop_membership',0));
 if not exists(select 1 from universes where id=p_universe and owner_id=p_actor) then raise exception 'FORBIDDEN'; end if;
 select * into l from coop_links where guest_universe_id is not null and p_universe in (host_universe_id,guest_universe_id);
 if l.id is null then raise exception 'COOP_NOT_LINKED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('coop_score:'||l.id::text,0));
 if p_action='propose' then
  select * into ga from games where id=(p_data->>'hostGameId')::uuid;
  select * into gb from games where id=(p_data->>'guestGameId')::uuid;
  if ga.id is null or gb.id is null or ga.season_id<>gb.season_id or ga.game_day<>gb.game_day or ga.home_team_id is distinct from gb.home_team_id or ga.away_team_id is distinct from gb.away_team_id or ga.stage<>gb.stage then raise exception 'INVALID_VALUES'; end if;
  select * into a from universe_games where universe_id=l.host_universe_id and game_id=ga.id and status='completed';
  select * into b from universe_games where universe_id=l.guest_universe_id and game_id=gb.id and status='completed';
  if a.id is null or b.id is null then raise exception 'COOP_BOTH_ENTRIES'; end if;
  hs:=(p_data->>'homeScore')::int; aws:=(p_data->>'awayScore')::int;
  if hs is null or aws is null or hs<0 or aws<0 or hs>9999 or aws>9999 or hs=aws then raise exception 'INVALID_SCORE'; end if;
  if exists(select 1 from coop_score_proposals where link_id=l.id and host_game_id=ga.id and guest_game_id=gb.id and status='pending') then raise exception 'COOP_PROPOSAL_PENDING'; end if;
  snapshot:=jsonb_build_array(a.home_score,a.away_score,b.home_score,b.away_score);
  insert into coop_score_proposals(link_id,requested_by,host_game_id,guest_game_id,home_score,away_score,expected) values(l.id,p_universe,ga.id,gb.id,hs,aws,snapshot);
 elsif p_action in ('accept','reject') then
  select * into p from coop_score_proposals where id=(p_data->>'proposalId')::uuid and link_id=l.id for update;
  if p.id is null or p.status<>'pending' then raise exception 'COOP_PROPOSAL_CLOSED'; end if;
  if p.requested_by=p_universe and p_action='accept' then raise exception 'COOP_PARTNER_CONFIRMATION'; end if;
  if p_action='reject' then update coop_score_proposals set status='rejected' where id=p.id; return; end if;
  select * into a from universe_games where universe_id=l.host_universe_id and game_id=p.host_game_id;
  select * into b from universe_games where universe_id=l.guest_universe_id and game_id=p.guest_game_id;
  if a.id is null or b.id is null or p.expected is distinct from jsonb_build_array(a.home_score,a.away_score,b.home_score,b.away_score) then raise exception 'COOP_STALE_PROPOSAL'; end if;
  select * into ga from games where id=p.host_game_id;
  if exists(select 1 from player_game_stats s join career_profiles c on c.id=s.career_id where (c.universe_id=l.host_universe_id and s.game_id=p.host_game_id or c.universe_id=l.guest_universe_id and s.game_id=p.guest_game_id) and s.points>case when s.team_id=ga.home_team_id then p.home_score else p.away_score end) then raise exception 'INVALID_POINTS'; end if;
  update coop_score_proposals set status='accepted',approval_tx=txid_current() where id=p.id;
  update universe_games set home_score=p.home_score,away_score=p.away_score,updated_at=now() where id in (a.id,b.id);
  insert into career_events(career_id,event_date,event_type,title,description,metadata,language)
  select c.id,ga.game_day,'coop_score',case when u.language='en' then 'Shared result corrected' else 'Gemeinsamer Endstand korrigiert' end,
   case when u.language='en' then 'Both players confirmed the corrected final score. Earlier reports retain their original wording.' else 'Beide Spieler haben den korrigierten Endstand bestätigt. Frühere Berichte behalten ihren damaligen Wortlaut.' end,
   jsonb_build_object('home_score',p.home_score,'away_score',p.away_score,'game_id',case when u.id=l.host_universe_id then p.host_game_id else p.guest_game_id end),u.language
  from career_profiles c join universes u on u.id=c.universe_id where u.id in (l.host_universe_id,l.guest_universe_id);
 else raise exception 'INVALID_VALUES'; end if;
end $$;
revoke all on function public.coop_score_action(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.coop_score_action(uuid,uuid,text,jsonb) to service_role;
