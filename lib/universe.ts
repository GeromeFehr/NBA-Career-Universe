import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function pageContext() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const store = await cookies();
  const universeId = store.get("nba_universe")?.value;
  if (!universeId) redirect("/universes");

  const client = db();
  const { data: universe } = await client.from("universes").select("*").eq("id", universeId).maybeSingle();
  if (!universe || universe.owner_id !== user.id) redirect("/universes");

  const { data: career } = await client
    .from("career_profiles")
    .select("*,current_team:teams(*)")
    .eq("universe_id", universe.id)
    .maybeSingle();

  if (!career) redirect("/universes");
  return { user, universe, career, client };
}

export function mergeUniverseResults(games: any[], results: any[]) {
  const byGame = new Map((results || []).map((r: any) => [r.game_id, r]));
  return (games || []).map((g: any) => {
    const r: any = byGame.get(g.id);
    return {
      ...g,
      universe_game_id: r?.id ?? null,
      status: r?.status ?? "scheduled",
      home_score: r?.home_score ?? null,
      away_score: r?.away_score ?? null,
      universe_story_notes: r?.story_notes ?? null
    };
  });
}


export function careerScheduleGames(
  games:any[],
  results:any[],
  playerStats:any[],
  currentTeamId:string,
  universeDate:string,
  universeId:string
){
  const merged=mergeUniverseResults(games||[],results||[]);
  const historicalGameIds=new Set((playerStats||[]).map((s:any)=>s.game_id));
  return merged
    .filter((g:any)=>{
      const isHistorical=historicalGameIds.has(g.id);
      const isCurrentTeamFuture=
        g.game_day>=universeDate &&
        (g.home_team_id===currentTeamId||g.away_team_id===currentTeamId) &&
        (g.universe_id==null||g.universe_id===universeId);
      return isHistorical||isCurrentTeamFuture;
    })
    .sort((a:any,b:any)=>new Date(a.game_date).getTime()-new Date(b.game_date).getTime());
}
