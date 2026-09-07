import { pageContext, careerScheduleGames } from "@/lib/universe";
import ScheduleExplorer from "@/components/ScheduleExplorer";

export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const [{data:games},{data:teams},{data:results},{data:stats}]=await Promise.all([
    client.from("games").select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)").or(`universe_id.is.null,universe_id.eq.${universe.id}`).order("game_date"),
    client.from("teams").select("*").eq("active",true).order("city"),
    client.from("universe_games").select("*").eq("universe_id",universe.id),
    client.from("player_game_stats").select("game_id,team_id").eq("career_id",career.id)
  ]);

  const relevant=careerScheduleGames(
    games||[],
    results||[],
    stats||[],
    career.current_team_id,
    career.universe_date,
    universe.id
  );

  return <>
    <div className="sectionHead">
      <div><span className="eyebrow">MY TEAM · {universe.name}</span><h1>Karriere-Spielplan</h1></div>
      <div className="muted">{relevant.length} relevante Spiele</div>
    </div>
    <p className="muted">
      Angezeigt werden nur Spiele deiner Karriere: bereits gespielte Partien bleiben in der Historie,
      nach einem Trade verschwinden alte zukünftige Teamspiele und es erscheinen nur noch die Partien des neuen Teams.
      Manuell angelegte Playoff- und Custom-Spiele gehören ausschließlich zu diesem Universe.
    </p>
    <ScheduleExplorer games={relevant} teams={teams||[]} universeDate={career.universe_date||""}/>
  </>;
}
