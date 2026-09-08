import {notFound} from "next/navigation";
import {pageContext, fetchPaged, mergeUniverseResults} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import {checked} from "@/lib/data";
import TeamBadge from "@/components/TeamBadge";
import {PageHeader, MetricStrip, Section, EmptyState} from "@/components/Editorial";
import ScheduleExplorer from "@/components/ScheduleExplorer";

export const dynamic = "force-dynamic";
export default async function Page({params}: {params: Promise<{abbr: string}>}) {
  const {abbr} = await params;
  const {client, universe} = await pageContext();
  const language = langOf(universe), en = language === "en";
  const team = checked(await client.from("teams").select("*").eq("abbreviation", abbr.toUpperCase()).maybeSingle());
  if (!team) notFound();
  const [games, results] = await Promise.all([
    fetchPaged((from, to) => client.from("games")
      .select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)")
      .eq("season_id", universe.current_season_id!)
      .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
      .or(`universe_id.is.null,universe_id.eq.${universe.id}`)
      .order("game_date").order("id").range(from, to)),
    fetchPaged((from, to) => client.from("universe_games").select("*").eq("universe_id", universe.id).order("id").range(from, to)),
  ]);
  const merged = mergeUniverseResults(games, results);
  let wins = 0, losses = 0;
  for (const game of merged.filter(x => x.status === "completed" && x.counts_toward_standings)) {
    const own = game.home_team_id === team.id ? game.home_score : game.away_score;
    const opponent = game.home_team_id === team.id ? game.away_score : game.home_score;
    if (own > opponent) wins++; else if (own < opponent) losses++;
  }
  return <>
    <PageHeader title={`${team.city} ${team.name}`} subtitle={`${universe.name} · ${team.conference} · ${team.division}`} actions={<TeamBadge team={team}/>}/>
    <MetricStrip items={[{label: en ? "Season record" : "Saisonbilanz", value: `${wins}–${losses}`}, {label: en ? "Scheduled games" : "Angesetzte Spiele", value: merged.length}]}/>
    <Section title={en ? "Schedule" : "Spielplan"}>
      {merged.length ? <ScheduleExplorer games={merged} teams={Array.from(new Map(merged.flatMap(g=>[g.home,g.away]).filter(Boolean).map(t=>[t.id,t])).values())} universeDate={universe.universe_date} language={language}/> : <EmptyState title={en ? "No games scheduled" : "Noch keine Spiele angesetzt"}/>}
    </Section>
  </>;
}
