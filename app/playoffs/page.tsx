import Link from "next/link";
import {pageContext,loadCareerSchedule} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import {stageLabel} from "@/lib/labels";
import {summarizeStats} from "@/lib/stats";
import TeamBadge from "@/components/TeamBadge";

export const dynamic="force-dynamic";
const isPlayoff=(s:any)=>/playoff|play-in|conference|final/i.test(String(s||""));

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe),en=lang==="en";
  const games=(await loadCareerSchedule(client,career,universe)).filter((g:any)=>isPlayoff(g.stage));
  const ids=games.map((g:any)=>g.id);
  const {data:stats}=ids.length
    ?await client.from("player_game_stats").select("*").eq("career_id",career.id).in("game_id",ids)
    :{data:[] as any[]};
  const byGame=new Map((stats||[]).map((s:any)=>[s.game_id,s]));
  const groups=new Map<string,any>();

  for(const g of games){
    const stat:any=byGame.get(g.id);
    const myTeamId=stat?.team_id||career.current_team_id;
    const opponent=g.home_team_id===myTeamId?g.away:g.home;
    const key=[g.season_id,myTeamId,g.stage,opponent?.abbreviation].join("|");
    if(!groups.has(key))groups.set(key,{key,season:g.season_id,team:g.home_team_id===myTeamId?g.home:g.away,stage:g.stage,opponent,games:[],wins:0,losses:0,stats:[]});
    const x=groups.get(key);
    x.games.push(g);if(stat?.appearance_status==="played")x.stats.push(stat);
    if(g.status==="completed"){
      const my=g.home_team_id===myTeamId?Number(g.home_score):Number(g.away_score);
      const opp=g.home_team_id===myTeamId?Number(g.away_score):Number(g.home_score);
      if(my>opp)x.wins++;else if(my<opp)x.losses++;
    }
  }
  const series=Array.from(groups.values());
  const avg=(rows:any[],k:string)=>rows.length?rows.reduce((a,r)=>a+Number(r[k]||0),0)/rows.length:0;

  return <>
    <div className="sectionHead">
      <div><h1>{en?"The postseason":"Die Playoffs"}</h1></div>
      <Link className="buttonLink" href="/admin#custom-schedule">{en?"Add playoff game":"Playoff-Spiel anlegen"}</Link>
    </div>
    <p className="muted">{en
      ?"Play-In and playoff games are grouped into series. Your series averages and every result stay tied to this universe."
      :"Play-In- und Playoff-Spiele werden automatisch zu Serien gruppiert. Serien-Schnitt und Ergebnisse bleiben fest an dieses Universe gebunden."}</p>

    {series.length?series.map((s:any)=><section className="panel seriesPanel" key={s.key}>
      <div className="seriesHeader">
        <div><span className="eyebrow">{stageLabel(s.stage,lang)} · {s.games[0]?.game_day?.slice(0,4)}</span><h2>{s.team?.abbreviation} vs {s.opponent?.abbreviation}</h2></div>
        <div className="seriesScore">{s.wins}–{s.losses}</div>
      </div>
      <div className="seriesTeams"><TeamBadge team={s.team}/><span>VS</span><TeamBadge team={s.opponent}/></div>
      <div className="statGrid">
        <div className="statCard"><span>PPG</span><strong>{avg(s.stats,"points").toFixed(1)}</strong></div>
        <div className="statCard"><span>RPG</span><strong>{avg(s.stats,"rebounds").toFixed(1)}</strong></div>
        <div className="statCard"><span>APG</span><strong>{avg(s.stats,"assists").toFixed(1)}</strong></div>
        <div className="statCard"><span>BPG</span><strong>{avg(s.stats,"blocks").toFixed(1)}</strong></div>
      </div>
      <div className="seriesGames">{s.games.map((g:any,i:number)=><Link href={"/game/"+g.id+(g.status==="completed"?"":"#stats")} className="seriesGame" key={g.id}>
        <span>{en?"Game":"Spiel"} {i+1}</span><b>{g.away?.abbreviation} @ {g.home?.abbreviation}</b>
        <strong>{g.status==="completed"?String(g.away_score)+" : "+String(g.home_score):(en?"Open":"Eintragen")}</strong>
      </Link>)}</div>
    </section>):<div className="card muted">{en?"No playoff games have been added to this career yet.":"Für diese Karriere wurden noch keine Playoff-Spiele angelegt."}</div>}
  </>;
}
