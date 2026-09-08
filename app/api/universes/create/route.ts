import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {db} from "@/lib/db";
import {readJson,apiFailure} from "@/lib/http";
import {cleanText,uuid,validDate,finiteNumber,InputError} from "@/lib/game-input";
export async function POST(req:Request){try{
 const user=await requireUser(),b=await readJson(req);const name=cleanText(b.name,100),playerName=cleanText(b.playerName,100);if(!name||!playerName)throw new InputError("MISSING_VALUES");
 const payload={name,playerName,teamId:uuid(b.teamId),universeDate:b.universeDate?validDate(b.universeDate):null,language:b.language==="en"?"en":"de",position:cleanText(b.position,20)||"SG/SF",overall:finiteNumber(b.overall||75,25,99),jerseyNumber:b.jerseyNumber==null||b.jerseyNumber===""?null:finiteNumber(b.jerseyNumber,0,99),draftYear:b.draftYear?finiteNumber(b.draftYear,1946,2200):null,draftRound:b.draftRound?finiteNumber(b.draftRound,1,2):1,draftPick:b.draftPick?finiteNumber(b.draftPick,1,100):null};
 const {data,error}=await db().rpc("create_career_universe",{p_actor:user.id,p_data:payload});if(error)throw error;
 const response=NextResponse.json({ok:true,universeId:data});response.cookies.set("nba_universe",data!,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:31536000});response.cookies.set("nba_ui_language",payload.language,{sameSite:"lax",path:"/",maxAge:31536000});return response;
}catch(e){return apiFailure(e);}}
