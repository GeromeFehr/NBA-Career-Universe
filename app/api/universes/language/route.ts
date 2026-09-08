import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {db} from "@/lib/db";
import {checked} from "@/lib/data";
import {apiFailure,readJson} from "@/lib/http";
import {uuid,InputError} from "@/lib/game-input";

export async function POST(req:Request){try{
 const user=await requireUser(),b=await readJson(req),id=uuid(b.universeId),client=db();
 if(!["de","en"].includes(b.language))throw new InputError("INVALID_VALUES");
 const own=checked(await client.from("universes").select("id,language").eq("id",id).eq("owner_id",user.id).maybeSingle());
 if(!own)throw Error("FORBIDDEN");
 if(own.language!==b.language){
  const link=checked(await client.from("coop_links").select("id").or(`host_universe_id.eq.${id},guest_universe_id.eq.${id}`).not("guest_universe_id","is",null).maybeSingle());
  if(link)throw new InputError("COOP_LANGUAGE_MISMATCH");
 }
 checked(await client.from("universes").update({language:b.language,updated_at:new Date().toISOString()}).eq("id",id).eq("owner_id",user.id).select("id").single());
 const response=NextResponse.json({ok:true});
 response.cookies.set("nba_ui_language",b.language,{sameSite:"lax",path:"/",maxAge:31536000});
 return response;
}catch(e){return apiFailure(e);}}
