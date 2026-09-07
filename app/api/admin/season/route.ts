import {NextResponse} from "next/server";
import {requireAdmin,apiStatus} from "@/lib/auth";
import {createSeasonRecap,initializeSeasonGoals} from "@/lib/world-engine";

export async function POST(req:Request){
  try{
    const {career,universe,client}=await requireAdmin();
    const lang=universe.language==="en"?"en":"de";
    const b=await req.json();
    const label=String(b.label||"").trim(),start=String(b.startDate||""),end=String(b.endDate||"");
    if(!label||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))
      return NextResponse.json({error:lang==="en"?"Season label, start and end are required.":"Saisonname, Start und Ende werden benötigt."},{status:400});
    if(new Date(end)<new Date(start))
      return NextResponse.json({error:lang==="en"?"Season end is before the start.":"Saisonende liegt vor dem Start."},{status:400});

    if(universe.current_season_id){
      const {data:oldSeason}=await client.from("seasons").select("*").eq("id",universe.current_season_id).maybeSingle();
      if(oldSeason)await createSeasonRecap(career,oldSeason,lang);
    }

    let {data:season}=await client.from("seasons").select("*").eq("label",label).maybeSingle();
    if(!season){
      const inserted=await client.from("seasons").insert({label,start_date:start,end_date:end,current:false}).select("*").single();
      if(inserted.error||!inserted.data)throw inserted.error||new Error(lang==="en"?"Season could not be created.":"Saison konnte nicht erstellt werden.");
      season=inserted.data;
    }

    const date=String(b.universeDate||start);
    await Promise.all([
      client.from("universes").update({current_season_id:season.id,universe_date:date,updated_at:new Date().toISOString()}).eq("id",universe.id),
      client.from("career_profiles").update({universe_date:date,updated_at:new Date().toISOString()}).eq("id",career.id),
      client.from("world_settings").update({current_season_id:season.id,universe_date:date,updated_at:new Date().toISOString()}).eq("career_id",career.id),
      client.from("career_events").insert({
        career_id:career.id,event_date:date,event_type:"season_transition",
        title:lang==="en"?`New season: ${label}`:`Neue Saison: ${label}`,
        description:lang==="en"?`Universe switched to ${label}.`:`Universe auf ${label} umgestellt.`,
        metadata:{season_id:season.id},language:lang
      })
    ]);

    await initializeSeasonGoals(career,season.id,lang);
    return NextResponse.json({ok:true,season,message:lang==="en"?`${label} is now the active MyNBA season`:`${label} ist jetzt die aktive MyNBA-Saison`});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:apiStatus(e)});
  }
}
