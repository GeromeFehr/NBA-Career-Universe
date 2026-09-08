/** Match custom and imported games without assuming their database IDs match. */
export function matchupKey(game: {season_id?: string | null; game_day?: string; home_team_id?: string | null; away_team_id?: string | null; stage?: string} | null | undefined) {
  if (!game?.season_id || !game.game_day || !game.home_team_id || !game.away_team_id || !game.stage) return null;
  return [game.season_id, game.game_day, game.home_team_id, game.away_team_id, game.stage].join("|");
}

export function sharedMatchups(host: any[], guest: any[]) {
  const hostCounts = new Map<string,number>();
  for (const stat of host) {const key=matchupKey(stat.games);if(key)hostCounts.set(key,(hostCounts.get(key)||0)+1);}
  const guestByKey = new Map<string, any[]>();
  for (const stat of guest) { const key=matchupKey(stat.games); if(key)guestByKey.set(key,[...(guestByKey.get(key)||[]),stat]); }
  return host.flatMap(a => {
    const key=matchupKey(a.games), matches=key?guestByKey.get(key):undefined;
    // Duplicate custom fixtures remain separate entries; never guess which one is the shared game.
    if(matches?.length!==1 || hostCounts.get(key!)!==1)return [];
    return [{host:a,guest:matches[0],sameTeam:a.team_id===matches[0].team_id}];
  }).sort((a,b)=>String(b.host.games.game_day).localeCompare(String(a.host.games.game_day)));
}
