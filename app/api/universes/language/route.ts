import {NextResponse} from "next/server";
import {requireUser,apiStatus} from "@/lib/auth";
import {db} from "@/lib/db";

export async function POST(req:Request){
  try{
    const user=await requireUser();
    const b=await req.json();
    const language=b.language==="en"?"en":b.language==="de"?"de":null;
    if(!language)return NextResponse.json({error:"Invalid language"},{status:400});
    const {error}=await db().from("universes")
      .update({language,updated_at:new Date().toISOString()})
      .eq("id",b.universeId)
      .eq("owner_id",user.id);
    if(error)throw error;
    return NextResponse.json({ok:true,language});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:apiStatus(e)});
  }
}
