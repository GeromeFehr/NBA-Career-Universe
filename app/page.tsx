import Link from "next/link";
import {pageContext,loadCareerSchedule} from "@/lib/universe";
import {summarizeStats} from "@/lib/stats";
import {langOf,t} from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import MediaCard from "@/components/MediaCard";
import TeamBadge from "@/components/TeamBadge";
import AiUsageMeter from "@/components/AiUsageMeter";
import ActionCenter,{type DashboardAction} from "@/components/ActionCenter";

export const dynamic="force-dynamic";

function feedType(kind:string,lang:"de"|"en"){
  const k=String(kind||"").toLowerCase();
  if(["hater","social","fan","meme"].includes(k))return "SOCIAL";
  if(["expert","debate"].includes(k))return lang==="en"?"EXPERT TAKE":"EXPERTEN-TAKE";
  if(k==="rumor")return lang==="en"?"BREAKING / RUMOR":"BREAKING / GERÜCHT";
  if(["analysis","recap","beat","article"].includes(k))return "NEWS";
  return "TRENDING";
}

export default async function Home(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe),en=lang==="en";

  const [
    {data:stats},{data:media},careerGames,{data:arcs},{data:milestones},
    {data:rep},{data:rivalry},{data:interview},{data:legacy},
    {data:tradeSaga},{data:offer},{data:injury}
  ]=await Promise.all([
    client.from("player_game_stats").select("*").eq("career_id",career.id).order("created_at"),
    client.from("media_posts").select("*").eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false}).limit(14),
    loadCareerSchedule(client,career,universe),
    client.from("story_arcs").select("*").eq("career_id",career.id).eq("language",lang).eq("status","active").order("intensity",{ascending:false}).limit(4),
    client.from("milestones").select("*").eq("career_id",career.id).eq("language",lang).order("achieved_at",{ascending:false}).limit(4),
    client.from("universe_reputation").select("*").eq("career_id",career.id).maybeSingle(),
    client.from("rivalries").select("*,team:opponent_team_id(*)").eq("career_id",career.id).order("heat",{ascending:false}).limit(1).maybeSingle(),
    client.from("interviews").select("*").eq("career_id",career.id).eq("language",lang).eq("status","open").order("importance",{ascending:false}).order("created_at",{ascending:false}).limit(1).maybeSingle(),
    client.from("legacy_scores").select("*").eq("career_id",career.id).maybeSingle(),
    client.from("trade_sagas").select("*,team:target_team_id(*)").eq("career_id",career.id).eq("language",lang).eq("status","active").order("heat",{ascending:false}).limit(1).maybeSingle(),
    client.from("trade_offers").select("*,to_team:teams!trade_offers_to_team_id_fkey(*)").eq("career_id",career.id).eq("language",lang).eq("status","pending").order("interest_score",{ascending:false}).limit(1).maybeSingle(),
    client.from("injuries").select("*").eq("career_id",career.id).eq("status","active").order("start_date",{ascending:false}).limit(1).maybeSingle()
  ]);

  const s=summarizeStats(stats||[]);
  const next=careerGames.find((g:any)=>g.status!=="completed"&&g.game_day>=career.universe_date);

  const actions:DashboardAction[]=[];
  if(interview)actions.push({
    id:"interview-"+interview.id,kind:"press",priority:100,
    eyebrow:en?"PRESS CONFERENCE":"PRESSEKONFERENZ",
    title:interview.question,
    body:en?"Your answer changes the public narrative around your career.":"Deine Antwort beeinflusst das öffentliche Narrativ deiner Karriere.",
    href:"/interviews",cta:en?"Answer now":"Jetzt antworten"
  });
  if(tradeSaga)actions.push({
    id:"saga-"+tradeSaga.id,kind:"trade",priority:90+Math.min(9,Math.floor(Number(tradeSaga.heat||0)/10)),
    eyebrow:"TRADE SAGA",
    title:tradeSaga.title,
    body:tradeSaga.summary,
    href:"/trades",cta:en?"Respond to rumors":"Auf Gerüchte reagieren"
  });
  if(offer)actions.push({
    id:"offer-"+offer.id,kind:"offer",priority:84,
    eyebrow:en?"TRADE OFFER":"TRADE-ANGEBOT",
    title:en?`${offer.to_team?.city} ${offer.to_team?.name} are making a push`:`${offer.to_team?.city} ${offer.to_team?.name} machen ernst`,
    body:offer.package_summary,
    href:"/trades",cta:en?"Review offer":"Angebot prüfen"
  });
  if(injury)actions.push({
    id:"injury-"+injury.id,kind:"medical",priority:78,
    eyebrow:en?"MEDICAL":"MEDICAL",
    title:injury.injury,
    body:`${injury.start_date} · ${injury.severity}`,
    href:"/career#injuries",cta:en?"Open status":"Status öffnen"
  });

  return <>
    <section className="hero dashboardHero">
      <span className="eyebrow">{universe.name} · {universe.visibility.toUpperCase()} · {career.current_team?.abbreviation||"FA"}</span>
      <h1>{career.player_name}<br/>{en?"writes the league.":"schreibt seine Liga."}</h1>
      <p>{en
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

    <ActionCenter actions={actions} language={lang}/>

    <section className="dashboardSection">
      <div className="sectionHead dashboardSectionHead">
        <div><span className="eyebrow">{en?"SEASON OVERVIEW":"SAISONÜBERSICHT"}</span><h2>{t(lang,"seasonDashboard")}</h2></div>
        <Link className="textLink" href="/world">{en?"Open Career World":"Karriere-Welt öffnen"} →</Link>
      </div>
      <div className="statGrid dashboardStats">
        <StatCard label="Games" value={s.games}/><StatCard label="PPG" value={s.ppg.toFixed(1)}/><StatCard label="RPG" value={s.rpg.toFixed(1)}/>
        <StatCard label="APG" value={s.apg.toFixed(1)}/><StatCard label="BPG" value={s.bpg.toFixed(1)}/><StatCard label="FG" value={String((s.fg*100).toFixed(1))+"%"}/>
      </div>
    </section>

    <div className="dashboardGrid dashboardWorkspace">
      <section className="dashboardMain">
        <div className="sectionHead dashboardSectionHead">
          <div><span className="eyebrow">NEWSROOM + SOCIAL</span><h2>Live Universe Feed</h2></div>
          <Link className="textLink" href="/social">{en?"Full timeline":"Volle Timeline"} →</Link>
        </div>

        {(media||[]).length
          ?<div className="mediaStack dashboardFeed">{(media||[]).map((m:any)=><div className={`feedCard ${m.kind==="rumor"?"breaking":["social","fan","hater","meme"].includes(m.kind)?"social":["expert","debate"].includes(m.kind)?"expert":""}`} key={m.id}>
            <span className="feedLabel">{feedType(m.kind,lang)}</span>
            <MediaCard post={m} compact/>
          </div>)}</div>
          :<div className="emptyState"><span className="eyebrow">FEED</span><h3>{en?"Nothing published yet":"Noch keine Beiträge"}</h3><p>{en?"Finish a game or run the newsroom to populate your universe.":"Schließe ein Spiel ab oder starte den Newsroom, um deine Welt zu füllen."}</p></div>}
      </section>

      <aside className="dashboardRail">
        <section className="railSection">
          <div className="railHeading"><h2>{t(lang,"nextGame")}</h2><Link href="/pregame">Pregame →</Link></div>
          {next?<Link className="railPanel nextGame nextGameLink" href={"/game/"+next.id+"#stats"}>
            <TeamBadge team={next.away}/>
            <div className="nextGameBody">
              <span className="eyebrow">{next.game_day} · {next.stage||"NBA"}</span>
              <strong className="clamp1">{next.away?.abbreviation} @ {next.home?.abbreviation}</strong>
              <small className="clamp1">{next.away?.city} {next.away?.name} · {next.home?.city} {next.home?.name}</small>
              <span className="nextGameAction">{t(lang,"openStats")}</span>
            </div>
            <TeamBadge team={next.home}/>
          </Link>:<div className="railPanel emptyState compact">{t(lang,"noNext")}</div>}
        </section>

        {rivalry&&<section className="railSection">
          <div className="railHeading"><h2>Rivalry Watch</h2><Link href="/world">{en?"Details":"Details"} →</Link></div>
          <Link href="/world" className="railPanel rivalrySummary">
            <div className="rivalryTop"><TeamBadge team={rivalry.team} small/><div><strong>{rivalry.team?.city} {rivalry.team?.name}</strong><small>{rivalry.meetings} {en?"career meeting(s)":"Karriere-Duell(e)"}</small></div><b>{rivalry.heat}</b></div>
            <div className="heatMeter"><i style={{width:String(rivalry.heat)+"%"}}/></div>
            <p className="clamp3">{rivalry.reason}</p>
          </Link>
        </section>}

        <section className="railSection">
          <div className="railHeading"><h2>{en?"AI Budget":"KI-Budget"}</h2><Link href="/settings">{en?"Details":"Details"} →</Link></div>
          <AiUsageMeter language={lang} compact/>
        </section>

        <section className="railSection">
          <div className="railHeading"><h2>{t(lang,"activeStories")}</h2><Link href="/world">{en?"All":"Alle"} →</Link></div>
          <div className="railPanel railList">
            {(arcs||[]).length?(arcs||[]).map((a:any)=><Link href="/world" className="railListItem" key={a.id}>
              <div><span className="eyebrow">{a.category} · {a.intensity}/100</span><strong className="clamp2">{a.title}</strong><p className="clamp2">{a.summary}</p></div><span>→</span>
            </Link>):<p className="muted railEmpty">{en?"No active storyline.":"Keine aktive Storyline."}</p>}
          </div>
        </section>

        <section className="railSection">
          <div className="railHeading"><h2>{t(lang,"milestones")}</h2><Link href="/trophy-room">{en?"Archive":"Archiv"} →</Link></div>
          <div className="railPanel railList">
            {(milestones||[]).length?(milestones||[]).map((m:any)=><div className="railListItem milestoneItem" key={m.id}>
              <div><strong className="clamp1">{m.title}</strong><p className="clamp2">{m.description}</p></div>
            </div>):<p className="muted railEmpty">{en?"No milestones yet.":"Noch keine Milestones."}</p>}
          </div>
        </section>
      </aside>
    </div>
  </>;
}
