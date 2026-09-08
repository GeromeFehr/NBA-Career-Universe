import Link from "next/link";
import {pageContext,loadCareerSchedule,fetchPaged} from "@/lib/universe";
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
  const {client,career,universe}=await pageContext();const lang=langOf(universe),en=lang==="en";
  const [stats,games,{data:media},{data:interviews},{data:sagas},{data:offers},{data:injuries},{data:arcs},{data:marks}]=await Promise.all([
    fetchPaged((from,to)=>client.from("player_game_stats").select("*,game:games!inner(season_id)").eq("career_id",career.id).eq("game.season_id",universe.current_season_id||"").order("id").range(from,to)),
    loadCareerSchedule(client,career,universe),
    client.from("media_posts").select("*").eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false}).limit(6),
    client.from("interviews").select("*").eq("career_id",career.id).eq("language",lang).eq("status","open").order("importance",{ascending:false}),
    client.from("trade_sagas").select("*").eq("career_id",career.id).eq("language",lang).eq("status","active"),
    client.from("trade_offers").select("*,to_team:teams!trade_offers_to_team_id_fkey(*)").eq("career_id",career.id).eq("language",lang).eq("status","pending"),
    client.from("injuries").select("*").eq("career_id",career.id).eq("status","active"),
    client.from("story_arcs").select("*").eq("career_id",career.id).eq("language",lang).eq("status","active").order("intensity",{ascending:false}).limit(3),
    client.from("milestones").select("*").eq("career_id",career.id).eq("language",lang).order("achieved_at",{ascending:false}).limit(3)
  ]);
  const s=summarizeStats(stats),next=games.find(g=>g.status!=="completed"&&g.game_day>=career.universe_date);
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
    <div className="editorialGrid"><div><Section title={en?"Around your game":"Rund um dein Spiel"} action={<Link href="/media">{en?"All reports":"Alle Berichte"} →</Link>}>
      {media?.length?<div className="mediaStack">{media.map(p=><MediaCard key={p.id} post={p}/>)}</div>:<EmptyState title={en?"The first chapter is yours":"Das erste Kapitel gehört dir"} detail={en?"Save your first game. Reports and reactions will follow.":"Trage dein erstes Spiel ein. Berichte und Reaktionen folgen danach."} href={next?`/game/${next.id}#stats`:"/admin#game-entry"} action={en?"Enter game":"Spiel eintragen"}/>}</Section></div>
      <aside className="homeRail"><Section title={en?"Stories to follow":"Die laufenden Geschichten"} action={<Link href="/world">→</Link>}>
        {arcs?.length?arcs.map(a=><article className="railStory" key={a.id}><small>{label(a.category,lang)}</small><h3><Link href="/world">{a.title}</Link></h3><p>{a.summary}</p></article>):<p className="muted">{en?"Your next games will shape the conversation.":"Deine nächsten Spiele geben den Gesprächen ihre Richtung."}</p>}
      </Section><Section title={en?"Recently in the record book":"Neu im Rekordbuch"} action={<Link href="/career#records">→</Link>}>{marks?.length?marks.map(m=><article className="railStory" key={m.id}><small>{localDate(m.achieved_at,lang)}</small><h3>{m.title}</h3><p>{m.description}</p></article>):<p className="muted">{en?"The record book is ready for your first mark.":"Das Rekordbuch wartet auf deinen ersten Eintrag."}</p>}</Section><Link className="agencyTeaser" href="/agency"><span>{en?"Away from the court":"Abseits des Courts"}</span><strong>{en?"Your agent. Your next deal.":"Dein Berater. Dein nächster Deal."}</strong><span>{en?"Contracts & earnings":"Verträge & Einnahmen"} ↗</span></Link></aside></div>
  </>;
}
