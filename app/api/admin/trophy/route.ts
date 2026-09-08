import {apiFailure} from "@/lib/http";
import {NextResponse} from "next/server";
import {requireAdmin,apiStatus} from "@/lib/auth";
import {refreshLegacyScore} from "@/lib/world-engine";

export async function POST(req:Request){
  try{
    const {career,universe,client}=await requireAdmin();
    const lang=universe.language==="en"?"en":"de";
    const b=await req.json();
    const title=String(b.title||"").trim();
    if(!title)return NextResponse.json({error:lang==="en"?"Title required.":"Titel fehlt."},{status:400});
    const {data,error}=await client.from("trophies").insert({
      career_id:career.id,season_id:b.seasonId||universe.current_season_id||null,
      trophy_type:String(b.trophyType||"achievement"),title,detail:String(b.detail||"")||null,
      awarded_on:String(b.awardedOn||career.universe_date),language:lang,source:"manual"
    }).select("*").single();
    if(error)throw error;
    const legacy=await refreshLegacyScore(career.id);
    return NextResponse.json({ok:true,trophy:data,legacy});
  }catch(e){
    return apiFailure(e);
  }
}
