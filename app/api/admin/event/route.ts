import {apiFailure} from "@/lib/http";
import {NextResponse} from "next/server";import {requireAdmin,apiStatus} from "@/lib/auth";
export async function POST(req:Request){try{const {career,client}=await requireAdmin();const b=await req.json();const {error}=await client.from("career_events").insert({career_id:career.id,event_date:b.date||career.universe_date,event_type:b.type||"other",title:b.type||"Story event",description:b.description});if(error)throw error;return NextResponse.json({ok:true})}catch(e){return apiFailure(e)}}
