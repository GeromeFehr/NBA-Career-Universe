import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {db} from "@/lib/db";
import {apiFailure,readJson} from "@/lib/http";
import {uuid,InputError} from "@/lib/game-input";
export async function POST(req:Request){try{const user=await requireUser(),b=await readJson(req);if(!["de","en"].includes(b.language))throw new InputError("INVALID_VALUES");const {data,error}=await db().from("universes").update({language:b.language,updated_at:new Date().toISOString()}).eq("id",uuid(b.universeId)).eq("owner_id",user.id).select("id").maybeSingle();if(error)throw error;if(!data)throw Error("FORBIDDEN");const response=NextResponse.json({ok:true});response.cookies.set("nba_ui_language",b.language,{sameSite:"lax",path:"/",maxAge:31536000});return response;}catch(e){return apiFailure(e);}}
