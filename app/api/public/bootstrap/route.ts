import {NextResponse} from "next/server";
import {requireAdmin,apiStatus} from "@/lib/auth";
import {mergeUniverseResults} from "@/lib/universe";

export async function GET(){
  try{
    const {career,universe,client}=await requireAdmin();
    const [{data:teams},{data:games},{data:results},{data:offers},{data:injuries}] = await Promise.all([
      client.from("teams").select("*").eq("active",true).order("city"),
      client.from("games").select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)").order("game_date"),
      client.from("universe_games").select("*").eq("universe_id",universe.id),
      client.from("trade_offers").select("*,to_team:teams!trade_offers_to_team_id_fkey(*)").eq("career_id",career.id).eq("status","pending").order("created_at",{ascending:false}).limit(10),
      client.from("injuries").select("*").eq("career_id",career.id).eq("status","active").order("start_date",{ascending:false})
    ]);
    const merged=mergeUniverseResults(games||[],results||[]);
    const careerGames=merged.filter((g:any)=>g.home_team_id===career.current_team_id||g.away_team_id===career.current_team_id);
    return NextResponse.json({career,universe,teams,careerGames,offers,injuries});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:apiStatus(e)});
  }
}
