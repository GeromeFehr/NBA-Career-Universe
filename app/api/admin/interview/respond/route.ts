import {NextResponse} from "next/server";
import {requireAdmin,apiStatus} from "@/lib/auth";
import {answerInterview} from "@/lib/world-engine";

export async function POST(req:Request){
  try{
    const {career}=await requireAdmin();
    const b=await req.json();
    const option=await answerInterview(career.id,String(b.interviewId||""),String(b.optionId||""));
    return NextResponse.json({ok:true,option});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:apiStatus(e)});
  }
}
