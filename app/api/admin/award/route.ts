import {NextResponse} from "next/server";
import {requireAdmin,apiStatus} from "@/lib/auth";

export async function POST(req:Request){
  try{
    const {career,universe,client}=await requireAdmin();
    const lang=universe.language==="en"?"en":"de";
    const b=await req.json();
    const seasonId=universe.current_season_id;
    if(!seasonId)throw new Error(lang==="en"?"Current season not found":"Aktuelle Saison nicht gefunden");

    const {error}=await client.from("award_snapshots").insert({
      career_id:career.id,season_id:seasonId,award:b.award,rank:b.rank,score:b.score||null,
      as_of_date:b.asOfDate,note:b.note||null,language:lang
    });
    if(error)throw error;

    if(Number(b.rank)===1){
      const {data:exists}=await client.from("trophies").select("id")
        .eq("career_id",career.id).eq("season_id",seasonId).eq("title",b.award).eq("language",lang).maybeSingle();
      if(!exists){
        await client.from("trophies").insert({
          career_id:career.id,season_id:seasonId,trophy_type:"award",title:b.award,
          detail:b.note||null,awarded_on:b.asOfDate,language:lang,source:"award_tracker"
        });
      }
    }
    return NextResponse.json({ok:true});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:apiStatus(e)});
  }
}
