import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {readJson,apiFailure} from "@/lib/http";
import {validDate} from "@/lib/game-input";
export async function POST(req:Request){try{const {user,career,client}=await requireAdmin();const b=await readJson(req);const {error}=await client.rpc("set_career_date",{p_actor:user.id,p_career:career.id,p_date:validDate(b.date)});if(error)throw error;return NextResponse.json({ok:true});}catch(e){return apiFailure(e);}}
