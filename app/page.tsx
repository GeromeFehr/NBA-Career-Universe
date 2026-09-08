import {coopContext} from "@/lib/coop-data";
import {homeFeed} from "@/lib/home-feed";
import {recordHighlights} from "@/lib/record-highlights";
import RecordSpotlight from "@/components/RecordSpotlight";
import Link from "next/link";
import {loadCareerSchedule,fetchPaged} from "@/lib/universe";
import {summarizeStats} from "@/lib/stats";
import {langOf} from "@/lib/i18n";
import {label,prose} from "@/lib/labels";
import {localDate} from "@/lib/format";
import {Section,MetricStrip,EmptyState} from "@/components/Editorial";
import PlayerIdentity from "@/components/PlayerIdentity";
import Scoreboard from "@/components/Scoreboard";
import MediaCard from "@/components/MediaCard";
import ActionCenter,{type DashboardAction} from "@/components/ActionCenter";
export const dynamic="force-dynamic";
export default async function Home(){
  const context=await coopContext(),{client,career,universe}=context;const lang=langOf(universe),en=lang==="en";
  const [stats,games,feed,{data:interviews},{data:sagas},{data:offers},{data:injuries},{data:arcs}]=await Promise.all([
    fetchPaged((from,to)=>client.from("player_game_stats").select("id,appearance_status,points,rebounds,assists,steals,blocks,minutes,fgm,fga,tpm,tpa,ftm,fta,game:games!inner(season_id)").eq("career_id",career.id).order("id").range(from,to)),
    loadCareerSchedule(client,career,universe),
    homeFeed(context),
    client.from("interviews").select("*").eq("career_id",career.id).eq("language",lang).eq("status","open").order("importance",{ascending:false}),
    client.from("trade_sagas").select("*").eq("career_id",career.id).eq("language",lang).eq("status","active"),
    client.from("trade_offers").select("*,to_team:teams!trade_offers_to_team_id_fkey(*)").eq("career_id",career.id).eq("language",lang).eq("status","pending"),
    client.from("injuries").select("*").eq("career_id",career.id).eq("status","active"),
    client.from("story_arcs").select("*").eq("career_id",career.id).eq("language",lang).eq("status","active").order("intensity",{ascending:false}).limit(3)
  ]);
  const highlights=recordHighlights(stats,lang),s=summarizeStats(stats.filter(row=>row.game.season_id===universe.current_season_id)),next=games.find(g=>g.status!=="completed"&&g.game_day>=career.universe_date);
  const last=games.filter(g=>g.status==="completed").at(-1);
  const actions:DashboardAction[]=[
    ...(interviews||[]).map(x=>({id:x.id,kind:"press" as const,priority:100,eyebrow:en?"Press conference":"Pressekonferenz",title:x.question,body:en?"The room is waiting for your answer.":"Die Runde wartet auf deine Antwort.",href:"/interviews#"+x.id,cta:en?"Take the microphone":"Ans Mikrofon"})),
    ...(sagas||[]).map(x=>({id:x.id,kind:"trade" as const,priority:90,eyebrow:en?"Trade story":"Trade-Geschichte",title:x.title,body:x.summary,href:"/trades",cta:en?"Respond":"Stellung beziehen"})),
    ...(offers||[]).map(x=>({id:x.id,kind:"offer" as const,priority:80,eyebrow:en?"Trade offer":"Trade-Angebot",title:`${x.to_team?.city} ${x.to_team?.name}`,body:x.package_summary,href:"/trades",cta:en?"Review offer":"Angebot prüfen"})),
    ...(injuries||[]).map(x=>({id:x.id,kind:"medical" as const,priority:95,eyebrow:en?"Medical report":"Verletzungsbericht",title:prose(x,"injury",lang,en?"Active injury":"Aktive Verletzung"),body:`${localDate(x.start_date,lang)} · ${label(x.severity,lang)}`,href:"/career#injuries",cta:en?"Open report":"Bericht öffnen"}))
  ];
  return <>
    <div className="homeTop"><PlayerIdentity career={career} universe={universe} language={lang}><p className="playerNote">{en?"Every game becomes part of your story.":"Jedes Spiel wird ein Teil deiner Geschichte."}</p></PlayerIdentity><aside className="homeNext">{next?<><h2>{en?"Next on the schedule":"Als Nächstes"}</h2><Scoreboard game={next} language={lang} compact/></>:last?<><h2>{en?"Last game":"Das letzte Spiel"}</h2><Scoreboard game={last} language={lang} compact/></>:<EmptyState title={en?"Your first tipoff":"Dein erster Tipoff"} detail={en?"Add a game to begin your career record.":"Lege eine Partie für deine Karriere an."} href="/admin#custom-schedule" action={en?"Add game":"Spiel anlegen"}/>}</aside></div>
    <MetricStrip items={[{label:en?"Season games":"Saisonspiele",value:s.games},{label:"PPG",value:s.ppg.toFixed(1)},{label:"RPG",value:s.rpg.toFixed(1)},{label:"APG",value:s.apg.toFixed(1)},{label:"BPG",value:s.bpg.toFixed(1)},{label:"FG",value:(s.fg*100).toFixed(1)+"%"}]}/>
    <ActionCenter actions={actions} language={lang}/>
    <div className="editorialGrid"><div><Section title={feed.shared?(en?"Around your co-op world":"Aus eurer Koop-Welt"):(en?"Around your game":"Rund um dein Spiel")} action={<Link href={feed.shared?"/coop#feed":"/media"}>{en?"All reports":"Alle Berichte"} →</Link>}>
      {feed.posts.length?<div className="mediaStack">{feed.posts.map(p=><div className={feed.shared?"coopMedia":undefined} key={p.id}>{feed.shared&&<p className="coopAttribution">{p.playerName}</p>}<MediaCard post={p} gameHref={p.ownCareer?undefined:null}/></div>)}</div>:<EmptyState title={en?"The first chapter is yours":"Das erste Kapitel gehört dir"} detail={en?"Save your first game. Reports and reactions will follow.":"Trage dein erstes Spiel ein. Berichte und Reaktionen folgen danach."} href={next?`/game/${next.id}#stats`:"/admin#game-entry"} action={en?"Enter game":"Spiel eintragen"}/>}</Section></div>
      <aside className="homeRail"><Section title={en?"Stories to follow":"Die laufenden Geschichten"} action={<Link href="/world">→</Link>}>
        {arcs?.length?arcs.map(a=><article className="railStory" key={a.id}><small>{label(a.category,lang)}</small><h3><Link href="/world">{a.title}</Link></h3><p>{a.summary}</p></article>):<p className="muted">{en?"Your next games will shape the conversation.":"Deine nächsten Spiele geben den Gesprächen ihre Richtung."}</p>}
      </Section><Section title={en?"Record book spotlight":"Im Rekordbuch"} action={<Link href="/career#records">→</Link>}><RecordSpotlight key={career.id} items={highlights} language={lang}/></Section><Link className="agencyTeaser" href="/agency"><span>{en?"Away from the court":"Abseits des Courts"}</span><strong>{en?"Your agent. Your next deal.":"Dein Berater. Dein nächster Deal."}</strong><span>{en?"Contracts & earnings":"Verträge & Einnahmen"} ↗</span></Link></aside></div>
  </>;
}
