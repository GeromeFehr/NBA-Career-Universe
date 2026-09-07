import Link from "next/link";
import {pageContext,loadCareerSchedule} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import {ensurePregameCoverage,calculateTrends} from "@/lib/world-engine";
import TeamBadge from "@/components/TeamBadge";

export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe),en=lang==="en";
  const games=await loadCareerSchedule(client,career,universe);
  const next=games.find((g:any)=>g.status!=="completed"&&g.game_day>=career.universe_date);
  if(!next)return <div className="card">{en?"No upcoming game.":"Kein kommendes Spiel."}</div>;

  const coverage=await ensurePregameCoverage(career,universe,next,lang);
  const opponentId=next.home_team_id===career.current_team_id?next.away_team_id:next.home_team_id;
  const [{data:rivalry},trends]=await Promise.all([
    client.from("rivalries").select("*").eq("career_id",career.id).eq("opponent_team_id",opponentId).maybeSingle(),
    calculateTrends(career.id,lang)
  ]);

  return <>
    <section className="hero pregameHero">
      <span className="eyebrow">MATCHUP WATCH · {next.game_day}</span>
      <div className="gameHero">
        <div className="gameTeam"><TeamBadge team={next.away}/><h2>{next.away?.city}<br/>{next.away?.name}</h2></div>
        <div className="gameScore">VS</div>
        <div className="gameTeam"><h2>{next.home?.city}<br/>{next.home?.name}</h2><TeamBadge team={next.home}/></div>
      </div>
    </section>

    <div className="dashboardGrid">
      <section>
        <div className="sectionHead"><h2>{coverage?.headline}</h2></div>
        <div className="card"><p>{coverage?.body}</p><span className="eyebrow">{en?"KEY QUESTION":"SCHLÜSSELFRAGE"}</span><h3>{coverage?.key_question}</h3></div>
        <div className="sectionHead"><h2>{en?"Expert Picks":"Experten-Tipps"}</h2></div>
        <div className="offerGrid">{(coverage?.expert_picks||[]).map((p:any)=><div className="card" key={p.name}><span className="eyebrow">{p.name}</span><h2>{p.pick}</h2><p>{p.reason}</p></div>)}</div>
      </section>
      <aside>
        <div className="sectionHead"><h2>Form</h2></div>
        <div className="card"><b>Last 5</b><p>{trends.points.last5.toFixed(1)} PPG · {trends.rebounds.last5.toFixed(1)} RPG · {trends.assists.last5.toFixed(1)} APG · {trends.blocks.last5.toFixed(1)} BPG</p></div>
        <div className="card"><b>Rivalry Heat</b><strong className="rank">{rivalry?.heat??20}</strong><p>{rivalry?.reason||(en?"No major rivalry yet.":"Noch keine große Rivalry.")}</p></div>
        <Link className="buttonLink" href={"/game/"+next.id+"#stats"}>{en?"Open game":"Spiel öffnen"}</Link>
      </aside>
    </div>
  </>;
}
