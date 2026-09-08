import Link from "next/link";
import {pageContext,loadCareerSchedule} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import {prose} from "@/lib/labels";
import {ensurePregameCoverage,calculateTrends} from "@/lib/world-engine";
import {PageHeader,Section,EmptyState,MetricStrip,Meter} from "@/components/Editorial";
import Scoreboard from "@/components/Scoreboard";
import PregameBrief from "@/components/PregameBrief";
export const dynamic="force-dynamic";
export default async function Page(){const {client,career,universe}=await pageContext(),lang=langOf(universe),en=lang==="en";const next=(await loadCareerSchedule(client,career,universe)).find(g=>g.status!=="completed"&&g.game_day>=career.universe_date);if(!next)return <><PageHeader title={en?"Before tipoff":"Vor dem Tipoff"}/><EmptyState title={en?"A break in the schedule":"Eine Pause im Spielplan"} detail={en?"Add the next matchup to prepare for the game.":"Ergänze die nächste Partie, um die Spielvorbereitung zu öffnen."} href="/admin#custom-schedule" action={en?"Add game":"Spiel ergänzen"}/></>;
 const [coverage,trends,{data:rivalry}]=await Promise.all([ensurePregameCoverage(career,universe,next,lang),calculateTrends(career.id,lang),client.from("rivalries").select("*").eq("career_id",career.id).eq("opponent_team_id",next.home_team_id===career.current_team_id?next.away_team_id:next.home_team_id).maybeSingle()]);
 return <><PageHeader title={en?"Before tipoff":"Vor dem Tipoff"} actions={<Link className="buttonLink" href={`/game/${next.id}#stats`}>{en?"Open game":"Zum Spiel"} →</Link>}/><Scoreboard game={next} language={lang}/><PregameBrief coverage={coverage} language={lang}/><div className="grid2"><Section title={en?"Your last five appearances":"Deine letzten fünf Einsätze"}><MetricStrip items={[["PPG",trends.points.last5],["RPG",trends.rebounds.last5],["APG",trends.assists.last5],["BPG",trends.blocks.last5]].map(([key,value])=>({label:String(key),value:Number(value).toFixed(1)}))}/></Section><Section title={en?"History between the teams":"Die Vorgeschichte"}><Meter label={en?"Rivalry intensity":"Intensität der Rivalität"} value={rivalry?.heat??0}/><p>{prose(rivalry,"reason",lang,en?"No major rivalry has formed yet.":"Noch ist keine große Rivalität entstanden.")}</p></Section></div></>;
}
