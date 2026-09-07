import {NextResponse} from "next/server";
import {requireAdmin,apiStatus} from "@/lib/auth";
import {loadCareerSchedule} from "@/lib/universe";

export async function GET(){
  try{
    const {career,universe,client}=await requireAdmin();
    const [{data:teams},careerGames,{data:offers},{data:injuries},{data:seasons}] = await Promise.all([
      client.from("teams").select("*").eq("active",true).order("city"),
      loadCareerSchedule(client,career,universe),
      client.from("trade_offers").select("*,to_team:teams!trade_offers_to_team_id_fkey(*)").eq("career_id",career.id).eq("language",universe.language==="en"?"en":"de").eq("status","pending").order("created_at",{ascending:false}).limit(10),
      client.from("injuries").select("*").eq("career_id",career.id).eq("status","active").order("start_date",{ascending:false}),
      client.from("seasons").select("*").order("start_date")
    ]);

    return NextResponse.json({career,universe,teams,careerGames,offers,injuries,seasons:seasons||[]});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:apiStatus(e)});
  }
}
