import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {parseGameInput} from "@/lib/game-input";
import {readJson,apiFailure} from "@/lib/http";
import {jsonObject} from "@/lib/data";
import {detectMilestones} from "@/lib/story";
import {generateGameMedia} from "@/lib/ai";
import {refreshDerivedAfterStatEdit,updateUniverseAfterGame} from "@/lib/world-engine";
export const maxDuration=60;
export async function POST(req:Request){try{
 const {user,career,universe,client}=await requireAdmin();const b=await readJson(req);const payload=parseGameInput(b);
 const {data,error}=await client.rpc("save_career_game",{p_actor:user.id,p_career:career.id,p_game:payload.gameId,p_payload:payload});if(error)throw error;
 const saved=jsonObject(data),stat=saved.stat,game=saved.game,isEdit=Boolean(saved.isEdit),en=universe.language==="en";
 const warnings:string[]=[];let mediaCount=0;
 try{
  await detectMilestones(career.id,stat);
  const settled=await client.rpc("settle_career_contracts",{p_actor:user.id,p_career:career.id});if(settled.error)throw settled.error;
  const won=stat.team_id===game.home_team_id?game.home_score>game.away_score:game.away_score>game.home_score;
  if(isEdit)await refreshDerivedAfterStatEdit({career,universe,game,stat});else await updateUniverseAfterGame({career,universe,game,stat,result:won?"win":"loss"});
 }catch(error){console.error("Derived game update failed",error);warnings.push(en?"The game is saved. Refresh the derived career values in Settings.":"Das Spiel ist gespeichert. Berechne die abgeleiteten Karrierewerte in den Einstellungen neu.");}
 const {data:settings}=await client.from("world_settings").select("auto_media").eq("career_id",career.id).maybeSingle();
 if(!isEdit&&b.autoMedia!==false&&settings?.auto_media!==false){try{mediaCount=(await generateGameMedia(stat.id)).length;}catch(error){console.error("Optional coverage failed",error);warnings.push(en?"Media coverage is unavailable. You can generate it later from this game.":"Die Berichterstattung fehlt noch. Du kannst sie später auf dieser Spielseite erzeugen.");}}
 return NextResponse.json({ok:true,statId:stat.id,mediaCount,mode:isEdit?"edit":"create",mediaWarning:warnings.join(" ")||null});
}catch(e){return apiFailure(e);}}
