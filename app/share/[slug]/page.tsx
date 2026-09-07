import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { summarizeStats } from "@/lib/stats";
import StatCard from "@/components/StatCard";
import MediaCard from "@/components/MediaCard";
import TeamBadge from "@/components/TeamBadge";

export const dynamic="force-dynamic";

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const client=db();
  const {data:universe}=await client.from("universes").select("*").eq("slug",slug).eq("visibility","public").maybeSingle();
  if(!universe)notFound();

  const {data:career}=await client.from("career_profiles").select("*,current_team:teams(*)").eq("universe_id",universe.id).maybeSingle();
  if(!career)notFound();

  const [{data:stats},{data:media},{data:milestones},{data:stints}]=await Promise.all([
    client.from("player_game_stats").select("*").eq("career_id",career.id).order("created_at"),
    client.from("media_posts").select("*").eq("career_id",career.id).order("created_at",{ascending:false}).limit(12),
    client.from("milestones").select("*").eq("career_id",career.id).order("achieved_at",{ascending:false}).limit(8),
    client.from("team_stints").select("*,teams(*)").eq("career_id",career.id).order("start_date")
  ]);
  const s=summarizeStats(stats||[]);

  return <>
    <section className="hero">
      <span className="eyebrow">PUBLIC CAREER · {universe.name}</span>
      <h1>{career.player_name}</h1>
      <p>{career.position} · OVR {career.overall} · {career.current_team?.city} {career.current_team?.name}</p>
      <div className="heroBar">
        <div><span>Games</span><strong>{s.games}</strong></div>
        <div><span>PPG</span><strong>{s.ppg.toFixed(1)}</strong></div>
        <div><span>RPG</span><strong>{s.rpg.toFixed(1)}</strong></div>
        <div><span>BPG</span><strong>{s.bpg.toFixed(1)}</strong></div>
      </div>
    </section>

    <div className="sectionHead"><h2>Team History</h2></div>
    <div className="offerGrid">{(stints||[]).map((x:any)=><div className="card" key={x.id}><TeamBadge team={x.teams} small/><b>{x.teams?.city} {x.teams?.name}</b><p className="muted">{x.start_date} – {x.end_date||"heute"}</p></div>)}</div>

    <div className="sectionHead"><h2>Milestones</h2></div>
    <div className="offerGrid">{(milestones||[]).map((m:any)=><div className="card" key={m.id}><b>{m.title}</b><p>{m.description}</p></div>)}</div>

    <div className="sectionHead"><h2>Latest Coverage</h2></div>
    <div className="mediaStack">{(media||[]).map((m:any)=><MediaCard key={m.id} post={m}/>)}</div>
  </>;
}
