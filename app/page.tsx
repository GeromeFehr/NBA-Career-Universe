import Link from "next/link";
import { db, hasDatabaseConfig } from "@/lib/db";
import { summarizeStats } from "@/lib/stats";
import StatCard from "@/components/StatCard";
import MediaCard from "@/components/MediaCard";
import TeamBadge from "@/components/TeamBadge";

export const dynamic="force-dynamic";

export default async function Home(){
  if(!hasDatabaseConfig()) return <div className="hero"><span className="eyebrow">SETUP REQUIRED</span><h1>NBA Career Universe</h1><p>Supabase-Variablen fehlen. Öffne README.md und führe die beiden SQL-Migrationen aus.</p></div>;
  const client=db();
  const {data:career}=await client.from("career_profiles").select("*,current_team:teams(*)").limit(1).maybeSingle();
  if(!career) return <div className="hero"><h1>Noch keine Karriere.</h1></div>;
  const [{data:stats},{data:media},{data:games},{data:arcs},{data:milestones}] = await Promise.all([
    client.from("player_game_stats").select("*").eq("career_id",career.id).order("created_at"),
    client.from("media_posts").select("*").eq("career_id",career.id).order("created_at",{ascending:false}).limit(10),
    client.from("games").select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)").gte("game_day",career.universe_date).order("game_date").limit(120),
    client.from("story_arcs").select("*").eq("career_id",career.id).eq("status","active").limit(6),
    client.from("milestones").select("*").eq("career_id",career.id).order("achieved_at",{ascending:false}).limit(6)
  ]);
  const s=summarizeStats(stats||[]);
  const next=(games||[]).find((g:any)=>g.home_team_id===career.current_team_id||g.away_team_id===career.current_team_id);
  return <>
    <section className="hero">
      <span className="eyebrow">2026-27 · ROOKIE UNIVERSE · {career.current_team?.abbreviation||"FA"}</span>
      <h1>{career.player_name}<br/>writes the league.</h1>
      <p>Eine persistente MyNBA-Welt, in der jedes Spiel, jeder Teamwechsel, jede Verletzung, jedes Gerücht und jede Schlagzeile Teil derselben Karriere bleibt.</p>
      <div className="heroBar"><div><span>Universe Date</span><strong>{career.universe_date}</strong></div><div><span>Overall</span><strong>{career.overall}</strong></div><div><span>Position</span><strong>{career.position||"—"}</strong></div><div><span>Draft</span><strong>{career.draft_year} · #{career.draft_pick||"—"}</strong></div></div>
    </section>
    <div className="sectionHead"><h2>Season dashboard</h2><Link className="muted" href="/career">volle Karriere →</Link></div>
    <div className="statGrid">
      <StatCard label="Games" value={s.games}/><StatCard label="PPG" value={s.ppg.toFixed(1)}/><StatCard label="RPG" value={s.rpg.toFixed(1)}/>
      <StatCard label="APG" value={s.apg.toFixed(1)}/><StatCard label="BPG" value={s.bpg.toFixed(1)}/><StatCard label="FG" value={`${(s.fg*100).toFixed(1)}%`}/>
    </div>
    <div className="dashboardGrid">
      <section>
        <div className="sectionHead"><h2>Newsroom</h2><Link className="muted" href="/media">alle Berichte →</Link></div>
        <div className="mediaStack">{(media||[]).map((m:any)=><MediaCard key={m.id} post={m}/>)}</div>
      </section>
      <aside>
        <div className="sectionHead"><h2>Nächstes Spiel</h2></div>
        {next?<div className="card nextGame">
          <div><TeamBadge team={next.away}/></div>
          <div><div className="teamLine"><strong>{next.away?.city} {next.away?.name}</strong></div><div className="vs">@ {next.game_day}</div><div className="teamLine"><strong>{next.home?.city} {next.home?.name}</strong></div></div>
          <div><TeamBadge team={next.home}/></div>
        </div>:<div className="card muted">Kein kommendes Spiel im aktuellen Datenbestand.</div>}
        <div className="sectionHead"><h2>Aktive Storylines</h2></div>
        {(arcs||[]).length?(arcs||[]).map((a:any)=><div className="card" key={a.id}><span className="eyebrow">{a.category}</span><h3>{a.title}</h3><p className="muted">{a.summary}</p></div>):<div className="card muted">Noch keine langfristige Storyline.</div>}
        <div className="sectionHead"><h2>Milestones</h2></div>
        {(milestones||[]).map((m:any)=><div className="card" key={m.id}><b>{m.title}</b><p className="muted">{m.description}</p></div>)}
      </aside>
    </div>
  </>;
}
