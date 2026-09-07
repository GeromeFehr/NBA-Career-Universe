import Link from "next/link";
import {pageContext,loadCareerSchedule} from "@/lib/universe";
import {summarizeStats} from "@/lib/stats";
import {langOf,t} from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import MediaCard from "@/components/MediaCard";
import TeamBadge from "@/components/TeamBadge";
import AiUsageMeter from "@/components/AiUsageMeter";

export const dynamic="force-dynamic";

function feedType(kind:string,lang:"de"|"en"){
  const k=String(kind||"").toLowerCase();
  if(["hater","social","fan","meme"].includes(k))return lang==="en"?"SOCIAL":"SOCIAL";
  if(["expert","debate"].includes(k))return lang==="en"?"EXPERT TAKE":"EXPERTEN-TAKE";
  if(["rumor"].includes(k))return lang==="en"?"BREAKING / RUMOR":"BREAKING / GERÜCHT";
  if(["analysis","recap","beat","article"].includes(k))return lang==="en"?"NEWS":"NEWS";
  return lang==="en"?"TRENDING":"TRENDING";
}

export default async function Home(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe);
  const [{data:stats},{data:media},careerGames,{data:arcs},{data:milestones},{data:rep},{data:rivalry},{data:interview},{data:legacy}]=await Promise.all([
    client.from("player_game_stats").select("*").eq("career_id",career.id).order("created_at"),
    client.from("media_posts").select("*").eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false}).limit(18),
    loadCareerSchedule(client,career,universe),
    client.from("story_arcs").select("*").eq("career_id",career.id).eq("language",lang).eq("status","active").order("intensity",{ascending:false}).limit(4),
    client.from("milestones").select("*").eq("career_id",career.id).eq("language",lang).order("achieved_at",{ascending:false}).limit(4),
    client.from("universe_reputation").select("*").eq("career_id",career.id).maybeSingle(),
    client.from("rivalries").select("*,team:opponent_team_id(*)").eq("career_id",career.id).order("heat",{ascending:false}).limit(1).maybeSingle(),
    client.from("interviews").select("*").eq("career_id",career.id).eq("language",lang).eq("status","open").order("created_at",{ascending:false}).limit(1).maybeSingle(),
    client.from("legacy_scores").select("*").eq("career_id",career.id).maybeSingle()
  ]);
  const s=summarizeStats(stats||[]);
  const next=careerGames.find((g:any)=>g.status!=="completed"&&g.game_day>=career.universe_date);

  return <>
    <section className="hero">
      <span className="eyebrow">{universe.name} · {universe.visibility.toUpperCase()} · {career.current_team?.abbreviation||"FA"}</span>
      <h1>{career.player_name}<br/>{lang==="en"?"writes the league.":"schreibt seine Liga."}</h1>
      <p>{lang==="en"
        ?"A persistent MyNBA world with media, rivalries, experts, fan sentiment and long-term legacy."
        :"Eine persistente MyNBA-Welt mit Medien, Rivalries, Experten, Fan-Stimmung und langfristigem Legacy-System."}</p>
      <div className="heroBar">
        <div><span>Universe Date</span><strong>{career.universe_date}</strong></div>
        <div><span>Overall</span><strong>{career.overall}</strong></div>
        <div><span>Star Power</span><strong>{rep?.star_power??50}</strong></div>
        <div><span>Media Hype</span><strong>{rep?.media_hype??50}</strong></div>
        <div><span>Legacy</span><strong>{legacy?.score??0}/100</strong></div>
      </div>
    </section>

    {interview&&<Link href="/interviews" className="card breakingBanner">
      <span className="feedLabel">{lang==="en"?"PRESS CONFERENCE WAITING":"PRESSEKONFERENZ OFFEN"}</span>
      <h3>{interview.question}</h3>
      <small>{lang==="en"?"Answer now →":"Jetzt antworten →"}</small>
    </Link>}

    <div className="sectionHead"><h2>{t(lang,"seasonDashboard")}</h2><Link className="muted" href="/world">{lang==="en"?"open Career World →":"Karriere-Welt öffnen →"}</Link></div>
    <div className="statGrid">
      <StatCard label="Games" value={s.games}/><StatCard label="PPG" value={s.ppg.toFixed(1)}/><StatCard label="RPG" value={s.rpg.toFixed(1)}/>
      <StatCard label="APG" value={s.apg.toFixed(1)}/><StatCard label="BPG" value={s.bpg.toFixed(1)}/><StatCard label="FG" value={String((s.fg*100).toFixed(1))+"%"}/>
    </div>

    <div className="dashboardGrid">
      <section>
        <div className="sectionHead"><h2>{lang==="en"?"Live Universe Feed":"Live Universe Feed"}</h2><Link className="muted" href="/social">{lang==="en"?"full timeline →":"volle Timeline →"}</Link></div>
        <div className="mediaStack">{(media||[]).map((m:any)=><div className={"feedCard "+(["rumor"].includes(m.kind)?"breaking":["social","fan","hater","meme"].includes(m.kind)?"social":["expert","debate"].includes(m.kind)?"expert":"")} key={m.id}>
          <span className="feedLabel">{feedType(m.kind,lang)}</span><MediaCard post={m}/>
        </div>)}</div>
      </section>

      <aside>
        <div className="sectionHead"><h2>{t(lang,"nextGame")}</h2><Link className="muted" href="/pregame">Pregame →</Link></div>
        {next?<Link className="card nextGame nextGameLink" href={"/game/"+next.id+"#stats"}>
          <div><TeamBadge team={next.away}/></div>
          <div><div className="teamLine"><strong>{next.away?.city} {next.away?.name}</strong></div><div className="vs">@ {next.game_day}</div><div className="teamLine"><strong>{next.home?.city} {next.home?.name}</strong></div><small className="nextGameAction">{t(lang,"openStats")}</small></div>
          <div><TeamBadge team={next.home}/></div>
        </Link>:<div className="card muted">{t(lang,"noNext")}</div>}

        {rivalry&&<><div className="sectionHead"><h2>Rivalry Watch</h2></div><Link href="/world" className="card"><div className="inline"><TeamBadge team={rivalry.team} small/><b>{rivalry.team?.abbreviation} · Heat {rivalry.heat}/100</b></div><p className="muted">{rivalry.reason}</p></Link></>}

        <div className="sectionHead"><h2>{lang==="en"?"AI Budget":"KI-Budget"}</h2></div><AiUsageMeter language={lang} compact/>

        <div className="sectionHead"><h2>{t(lang,"activeStories")}</h2></div>
        {(arcs||[]).length?(arcs||[]).map((a:any)=><div className="card" key={a.id}><span className="eyebrow">{a.category} · {a.intensity}/100</span><h3>{a.title}</h3><p className="muted">{a.summary}</p></div>):<div className="card muted">{lang==="en"?"No long-running storyline yet.":"Noch keine langfristige Storyline."}</div>}

        <div className="sectionHead"><h2>{t(lang,"milestones")}</h2></div>
        {(milestones||[]).map((m:any)=><div className="card" key={m.id}><b>{m.title}</b><p className="muted">{m.description}</p></div>)}
      </aside>
    </div>
  </>;
}
