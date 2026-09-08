import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {apiFailure,readJson} from "@/lib/http";
import {uuid} from "@/lib/game-input";
export async function POST(req:Request){try{const {user,career,client}=await requireAdmin();const b=await readJson(req);const {data,error}=await client.rpc("respond_trade_story",{p_actor:user.id,p_career:career.id,p_saga:uuid(b.sagaId),p_choice:String(b.choice)});if(error)throw error;return NextResponse.json({ok:true,...data as object});}catch(e){return apiFailure(e);}}
