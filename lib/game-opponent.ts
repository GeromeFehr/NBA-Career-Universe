type Team = {id?: string; abbreviation?: string; city?: string; name?: string};
type Game<T extends Team> = {home_team_id?: string | null; away_team_id?: string | null; home?: T | null; away?: T | null};

/** Resolve from the team stored on this appearance, including games before a trade. */
export function gameOpponent<T extends Team>(teamId: string | null | undefined, game: Game<T> | null | undefined) {
  if (!teamId || !game) return null;
  if (teamId === game.home_team_id) return {team: game.away ?? null, home: true};
  if (teamId === game.away_team_id) return {team: game.home ?? null, home: false};
  return null;
}
