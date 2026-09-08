import {notFound} from "next/navigation";
import {db} from "@/lib/db";
import {fetchPaged} from "@/lib/universe";
import {checked} from "@/lib/data";
import {summarizeStats} from "@/lib/stats";
import {langOf} from "@/lib/i18n";
import {localDate} from "@/lib/format";
import MediaCard from "@/components/MediaCard";
import TeamBadge from "@/components/TeamBadge";
import {PageHeader, MetricStrip, Section, EmptyState} from "@/components/Editorial";

export const dynamic = "force-dynamic";
export default async function Page({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params, client = db();
  const universe = checked(await client.from("universes").select("*").eq("slug", slug).eq("visibility", "public").maybeSingle());
  if (!universe) notFound();
  const career = checked(await client.from("career_profiles").select("*,current_team:teams(*)").eq("universe_id", universe.id).maybeSingle());
  if (!career) notFound();
  const language = langOf(universe), en = language === "en";
  const [stats, media, milestones, stints] = await Promise.all([
    fetchPaged((from, to) => client.from("player_game_stats").select("*").eq("career_id", career.id).order("id").range(from, to)),
    client.from("media_posts").select("*").eq("career_id", career.id).eq("language", language).order("created_at", {ascending: false}).limit(12).then(checked),
    client.from("milestones").select("*").eq("career_id", career.id).eq("language", language).order("achieved_at", {ascending: false}).limit(8).then(checked),
    fetchPaged((from, to) => client.from("team_stints").select("*,teams(*)").eq("career_id", career.id).order("start_date").order("id").range(from, to)),
  ]);
  const summary = summarizeStats(stats);
  return <div lang={language}>
    <PageHeader title={career.player_name} section={en ? "Public career" : "Öffentliche Karriere"} subtitle={`${universe.name} · ${career.position} · OVR ${career.overall}`} actions={<TeamBadge team={career.current_team}/>}/>
    <MetricStrip dark items={[{label: en ? "Games" : "Spiele", value: summary.games}, {label: "PPG", value: summary.ppg.toFixed(1)}, {label: "RPG", value: summary.rpg.toFixed(1)}, {label: "APG", value: summary.apg.toFixed(1)}]}/>
    <Section title={en ? "Team history" : "Teamhistorie"}><div className="offerGrid">{stints.map(x => <article className="card" key={x.id}><TeamBadge team={x.teams} small/><h3>{x.teams?.city} {x.teams?.name}</h3><p className="muted">{localDate(x.start_date, language)} – {x.end_date ? localDate(x.end_date, language) : (en ? "Present" : "Heute")}</p></article>)}</div></Section>
    <Section title={en ? "Milestones" : "Meilensteine"}><div className="offerGrid">{(milestones||[]).map(m => <article className="card" key={m.id}><h3>{m.title}</h3><p>{m.description}</p></article>)}</div></Section>
    <Section title={en ? "Latest coverage" : "Aktuelle Berichte"}>{media?.length ? <div className="mediaStack">{media.map(m => <MediaCard key={m.id} post={{...m, game_id: null}}/>)}</div> : <EmptyState title={en ? "The next story is still to be written" : "Die nächste Geschichte entsteht noch"}/>}</Section>
  </div>;
}
