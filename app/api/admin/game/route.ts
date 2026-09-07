import {NextResponse} from "next/server";import {requireAdmin} from "@/lib/auth";import {db} from "@/lib/db";import {detectMilestones} from "@/lib/story";import {generateGameMedia} from "@/lib/ai";
export async function POST(req:Request){try{await requireAdmin();const b=await req.json();const client=db();const {data:career}=await client.from("career_profiles").select("*").limit(1).single();const {data:game}=await client.from("games").select("*").eq("id",b.gameId).single();if(!game)return NextResponse.json({error:"Spiel nicht gefunden"},{status:404});
const {data:stint}=await client.from("team_stints").select("*").eq("career_id",career.id).lte("start_date",game.game_day).or(`end_date.is.null,end_date.gte.${game.game_day}`).order("start_date",{ascending:false}).limit(1).maybeSingle();
const teamId=stint?.team_id||career.current_team_id;if(teamId!==game.home_team_id&&teamId!==game.away_team_id)return NextResponse.json({error:"Dein Team war an diesem Datum nicht in diesem Spiel."},{status:400});
await client.from("games").update({home_score:b.homeScore,away_score:b.awayScore,status:"completed"}).eq("id",game.id);
const s=b.stats||{};const statPayload:any={
 career_id:career.id,game_id:game.id,team_id:teamId,appearance_status:b.appearanceStatus||"played",
 minutes:Number(s.minutes||0),points:Number(s.points||0),rebounds:Number(s.rebounds||0),assists:Number(s.assists||0),steals:Number(s.steals||0),blocks:Number(s.blocks||0),turnovers:Number(s.turnovers||0),
 fouls:Number(s.fouls||0),technical_fouls:Number(s.technical_fouls||0),flagrant_fouls:Number(s.flagrant_fouls||0),fgm:Number(s.fgm||0),fga:Number(s.fga||0),tpm:Number(s.tpm||0),tpa:Number(s.tpa||0),ftm:Number(s.ftm||0),fta:Number(s.fta||0),plus_minus:Number(s.plus_minus||0),
 started:Boolean(b.started),fouled_out:Boolean(b.fouledOut)||Number(s.fouls||0)>=6,ejected:Boolean(b.ejected),injured:Boolean(b.injured),injury_note:b.injuryNote||null,story_notes:b.storyNotes||null
};
const {data:stat,error}=await client.from("player_game_stats").upsert(statPayload,{onConflict:"career_id,game_id"}).select("*").single();if(error)throw error;
await client.from("game_notables").delete().eq("game_id",game.id);
const lines=String(b.notableText||"").split(/\r?\n/).map((x:string)=>x.trim()).filter(Boolean);if(lines.length){const rows=lines.map((line:string)=>{const [player_name="",team_abbreviation="",...rest]=line.split("|").map(x=>x.trim());return {game_id:game.id,player_name,team_abbreviation,note:rest.join(" | ")||"Notable performance"}});await client.from("game_notables").insert(rows)}
if(statPayload.injured&&statPayload.injury_note){await client.from("injuries").insert({career_id:career.id,start_date:game.game_day,injury:statPayload.injury_note,severity:"unknown",status:"active",source_game_id:game.id})}
const milestones=await detectMilestones(career.id,stat);
await client.from("career_events").insert({career_id:career.id,event_date:game.game_day,event_type:"game",title:`${game.away_score}-${game.home_score} · Game completed`,description:b.storyNotes||`${stat.points} PTS, ${stat.rebounds} REB, ${stat.assists} AST, ${stat.blocks} BLK`,metadata:{game_id:game.id,stat_id:stat.id}});
await client.from("career_profiles").update({universe_date:game.game_day}).eq("id",career.id);await client.from("world_settings").update({universe_date:game.game_day}).eq("career_id",career.id);
let media:any[]=[];if(b.autoMedia!==false)media=await generateGameMedia(stat.id);
return NextResponse.json({ok:true,statId:stat.id,milestones,mediaCount:media.length})}catch(e:any){return NextResponse.json({error:e.message},{status:e.message==="UNAUTHORIZED"?401:500})}}
