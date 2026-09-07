-- v2.1: universe-specific manual games for playoffs, custom schedules and future seasons

alter table games
  add column if not exists universe_id uuid references universes(id) on delete cascade;

create index if not exists games_universe_idx
  on games(universe_id, game_day);

-- Shared NBA schedule rows have universe_id = null.
-- Manual MyNBA games belong to exactly one universe.
drop policy if exists shared_read_games on games;
drop policy if exists games_select on games;
create policy games_select on games
for select to anon, authenticated
using (
  universe_id is null
  or public.can_read_universe(universe_id)
);

drop policy if exists games_write on games;
create policy games_write on games
for all to authenticated
using (
  universe_id is not null
  and public.can_write_universe(universe_id)
)
with check (
  universe_id is not null
  and public.can_write_universe(universe_id)
);
