import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** React cache deduplicates layout/navigation/page reads within one request only. */
export const activeContext = cache(async () => {
  const user = await currentUser();
  if (!user) return null;
  const universeId = (await cookies()).get("nba_universe")?.value;
  if (!universeId || !/^[0-9a-f-]{36}$/i.test(universeId)) return null;
  const client = db();
  const {data: universe, error} = await client.from("universes").select("*")
    .eq("id", universeId).eq("owner_id", user.id).maybeSingle();
  if (error) throw error;
  if (!universe) return null;
  const {data: career, error: careerError} = await client.from("career_profiles")
    .select("*,current_team:teams(*)").eq("universe_id", universe.id).maybeSingle();
  if (careerError) throw careerError;
  if (!career) return null;
  return {user, universe, career, client};
});

export async function pageContext() {
  if (!(await currentUser())) redirect("/login");
  const context = await activeContext();
  if (!context) redirect("/universes");
  return context;
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

export async function fetchPaged(factory:(from:number,to:number)=>PromiseLike<{data:any[]|null;error:unknown}>, pageSize=1000){
  const rows:any[]=[];
  for(let from=0;;from+=pageSize){
    const {data,error}=await factory(from,from+pageSize-1);
    if(error)throw error;
    const batch=data||[];
    rows.push(...batch);
    if(batch.length<pageSize)break;
  }
  return rows;
}

function uniqueById(rows:any[]){
  const m=new Map<string,any>();
  for(const row of rows||[])if(row?.id)m.set(row.id,row);
  return Array.from(m.values());
}

/**
 * Loads the entire career-relevant schedule without hitting Supabase's default 1000-row cap.
 * - historical games are kept forever
 * - future games are only from the currently controlled team
 * - universe-specific manual games stay isolated
 */
export async function loadCareerSchedule(client:any,career:any,universe:any){
  const [playerStats,results,futureGames]=await Promise.all([fetchPaged((from,to)=>
    client.from("player_game_stats")
      .select("game_id,team_id")
      .eq("career_id",career.id)
      .order("created_at")
      .range(from,to)
  ),fetchPaged((from,to)=>
    client.from("universe_games")
      .select("*")
      .eq("universe_id",universe.id)
      .order("created_at")
      .range(from,to)
  ),fetchPaged((from,to)=>
    client.from("games")
      .select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)")
      .gte("game_day",career.universe_date)
      .eq("season_id", universe.current_season_id)
      .or(`home_team_id.eq.${career.current_team_id},away_team_id.eq.${career.current_team_id}`)
      .or(`universe_id.is.null,universe_id.eq.${universe.id}`)
      .order("game_date")
      .range(from,to)
  )]);

  const historicalIds=Array.from(new Set([...playerStats, ...results].map((s:any)=>s.game_id).filter(Boolean)));
  const historicalGames:any[]=[];
  for(let i=0;i<historicalIds.length;i+=200){
    const ids=historicalIds.slice(i,i+200);
    if(!ids.length)continue;
    const {data,error}=await client.from("games")
      .select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)")
      .in("id",ids).or(`universe_id.is.null,universe_id.eq.${universe.id}`);
    if(error)throw error;
    historicalGames.push(...(data||[]));
  }

  const games=uniqueById([...historicalGames,...futureGames]);
  return mergeUniverseResults(games,results)
    .sort((a:any,b:any)=>new Date(a.game_date).getTime()-new Date(b.game_date).getTime());
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
