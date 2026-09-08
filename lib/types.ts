export type Team = {
  id: string; abbreviation: string; city: string; name: string;
  conference: string | null; division: string | null;
  primary_color: string | null; secondary_color: string | null;
};

export type Game = {
  id: string; source_key: string; game_date: string; game_day: string;
  stage: string; status: string; home_score: number | null; away_score: number | null;
  home_team_id: string | null; away_team_id: string | null;
  home?: Team | null; away?: Team | null;
};

export type Career = {
  id: string; player_name: string; position: string | null; jersey_number: number | null;
  draft_status: "drafted" | "undrafted" | "unknown"; rookie_season_id: string | null;
  overall: number; draft_year: number | null; draft_round: number | null; draft_pick: number | null;
  current_team_id: string | null; universe_date: string; status: string;
  current_team?: Team | null;
};
