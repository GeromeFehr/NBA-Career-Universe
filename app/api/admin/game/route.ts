import {NextResponse} from "next/server";
import {requireAdmin,apiStatus} from "@/lib/auth";
import {detectMilestones} from "@/lib/story";
import {generateGameMedia} from "@/lib/ai";
import {updateUniverseAfterGame} from "@/lib/world-engine";

export async function POST(req:Request){
  try{
    const {career,universe,client}=await requireAdmin();
    const b=await req.json();
    const {data:game}=await client.from("games").select("*").eq("id",b.gameId).single();
    if(!game)return NextResponse.json({error:"Spiel nicht gefunden"},{status:404});
    if(game.universe_id&&game.universe_id!==universe.id)return NextResponse.json({error:"Dieses manuelle Spiel gehört zu einem anderen Universe."},{status:403});

    const {data:stint}=await client.from("team_stints").select("*")
      .eq("career_id",career.id)
      .lte("start_date",game.game_day)
      .or(`end_date.is.null,end_date.gte.${game.game_day}`)
      .order("start_date",{ascending:false})
      .limit(1)
      .maybeSingle();

    const teamId=stint?.team_id||career.current_team_id;
    if(teamId!==game.home_team_id&&teamId!==game.away_team_id){
      return NextResponse.json({error:"Dein Team war an diesem Datum nicht in diesem Spiel."},{status:400});
    }

    const homeScore=Number(b.homeScore),awayScore=Number(b.awayScore);
    const {error:gameErr}=await client.from("universe_games").upsert({
      universe_id:universe.id,
      game_id:game.id,
      home_score:homeScore,
      away_score:awayScore,
      status:"completed",
      story_notes:b.storyNotes||null,
      completed_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    },{onConflict:"universe_id,game_id"});
    if(gameErr)throw gameErr;

    const s=b.stats||{};
    const statPayload:any={
      career_id:career.id,game_id:game.id,team_id:teamId,appearance_status:b.appearanceStatus||"played",
      minutes:Number(s.minutes||0),points:Number(s.points||0),rebounds:Number(s.rebounds||0),assists:Number(s.assists||0),
      steals:Number(s.steals||0),blocks:Number(s.blocks||0),turnovers:Number(s.turnovers||0),fouls:Number(s.fouls||0),
      technical_fouls:Number(s.technical_fouls||0),flagrant_fouls:Number(s.flagrant_fouls||0),fgm:Number(s.fgm||0),
      fga:Number(s.fga||0),tpm:Number(s.tpm||0),tpa:Number(s.tpa||0),ftm:Number(s.ftm||0),fta:Number(s.fta||0),
      plus_minus:Number(s.plus_minus||0),started:Boolean(b.started),fouled_out:Boolean(b.fouledOut)||Number(s.fouls||0)>=6,
      ejected:Boolean(b.ejected),injured:Boolean(b.injured),injury_note:b.injuryNote||null,story_notes:b.storyNotes||null,
      updated_at:new Date().toISOString()
    };

    const {data:stat,error}=await client.from("player_game_stats").upsert(statPayload,{onConflict:"career_id,game_id"}).select("*").single();
    if(error||!stat)throw error||new Error("Stat line could not be saved");

    await client.from("game_notables").delete().eq("career_id",career.id).eq("game_id",game.id);
    const lines=String(b.notableText||"").split(/\r?\n/).map((x:string)=>x.trim()).filter(Boolean);
    if(lines.length){
      const rows=lines.map((line:string)=>{
        const [player_name="",team_abbreviation="",...rest]=line.split("|").map(x=>x.trim());
        return {career_id:career.id,game_id:game.id,player_name,team_abbreviation,note:rest.join(" | ")||"Notable performance"};
      });
      const {error:notableErr}=await client.from("game_notables").insert(rows);
      if(notableErr)throw notableErr;
    }

    if(statPayload.injured&&statPayload.injury_note){
      await client.from("injuries").insert({career_id:career.id,start_date:game.game_day,injury:statPayload.injury_note,severity:"unknown",status:"active",source_game_id:game.id});
    }

    const milestones=await detectMilestones(career.id,stat);
    const lang=universe.language==="en"?"en":"de";
    const won=teamId===game.home_team_id?homeScore>awayScore:awayScore>homeScore;
    const lost=teamId===game.home_team_id?homeScore<awayScore:awayScore<homeScore;
    const result=won?"win":lost?"loss":"unknown";
    await client.from("career_events").insert({
      career_id:career.id,event_date:game.game_day,event_type:"game",
      title:lang==="en"?`${awayScore}-${homeScore} · Game completed`:`${awayScore}-${homeScore} · Spiel abgeschlossen`,
      description:b.storyNotes||`${stat.points} PTS, ${stat.rebounds} REB, ${stat.assists} AST, ${stat.blocks} BLK`,
      metadata:{game_id:game.id,stat_id:stat.id,universe_id:universe.id},
      language:lang
    });

    await Promise.all([
      client.from("career_profiles").update({universe_date:game.game_day,updated_at:new Date().toISOString()}).eq("id",career.id),
      client.from("world_settings").update({universe_date:game.game_day,updated_at:new Date().toISOString()}).eq("career_id",career.id),
      client.from("universes").update({universe_date:game.game_day,updated_at:new Date().toISOString()}).eq("id",universe.id)
    ]);

    const world=await updateUniverseAfterGame({career,universe,game:{...game,home_score:homeScore,away_score:awayScore},stat,result});
    let media:any[]=[];
    let mediaWarning:string|null=null;
    if(b.autoMedia!==false){
      try{
        media=await generateGameMedia(stat.id);
      }catch(err){
        mediaWarning=lang==="en"
          ?"Stats were saved, but media coverage could not be refreshed."
          :"Stats wurden gespeichert, aber die Medienberichte konnten nicht aktualisiert werden.";
        console.error("Optional media generation failed",err);
      }
    }
    return NextResponse.json({ok:true,statId:stat.id,milestones,mediaCount:media.length,world,mediaWarning});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:apiStatus(e)});
  }
}
