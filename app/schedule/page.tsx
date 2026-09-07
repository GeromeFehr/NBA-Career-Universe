import { pageContext, mergeUniverseResults } from "@/lib/universe";
import ScheduleExplorer from "@/components/ScheduleExplorer";

export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const [{data:games},{data:teams},{data:results}]=await Promise.all([
    client.from("games").select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)").order("game_date"),
    client.from("teams").select("*").eq("active",true).order("city"),
    client.from("universe_games").select("*").eq("universe_id",universe.id)
  ]);
  const merged=mergeUniverseResults(games||[],results||[]);
  return <>
    <div className="sectionHead"><div><span className="eyebrow">FULL LEAGUE · {universe.name}</span><h1>NBA Spielplan</h1></div><div className="muted">{merged.length} gespeicherte Spiele</div></div>
    <p className="muted">Der echte NBA-Spielplan ist für alle Accounts gemeinsam. Resultate und MyNBA-Spielstände sind ausschließlich in diesem Universe gespeichert.</p>
    <ScheduleExplorer games={merged} teams={teams||[]} universeDate={career.universe_date||""}/>
  </>;
}
