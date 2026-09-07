import {NextResponse} from "next/server";
import {requireAdmin,apiStatus} from "@/lib/auth";
import {careerScheduleGames} from "@/lib/universe";

export async function GET(){
  try{
    const {career,universe,client}=await requireAdmin();
    const [{data:teams},{data:games},{data:results},{data:stats},{data:offers},{data:injuries},{data:seasons}] = await Promise.all([
      client.from("teams").select("*").eq("active",true).order("city"),
      client.from("games").select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)").or(`universe_id.is.null,universe_id.eq.${universe.id}`).order("game_date"),
      client.from("universe_games").select("*").eq("universe_id",universe.id),
      client.from("player_game_stats").select("game_id,team_id").eq("career_id",career.id),
      client.from("trade_offers").select("*,to_team:teams!trade_offers_to_team_id_fkey(*)").eq("career_id",career.id).eq("status","pending").order("created_at",{ascending:false}).limit(10),
      client.from("injuries").select("*").eq("career_id",career.id).eq("status","active").order("start_date",{ascending:false}),
      client.from("seasons").select("*").order("start_date")
    ]);

    const careerGames=careerScheduleGames(
      games||[],
      results||[],
      stats||[],
      career.current_team_id,
      career.universe_date,
      universe.id
    );

    return NextResponse.json({career,universe,teams,careerGames,offers,injuries,seasons:seasons||[]});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:apiStatus(e)});
  }
}
