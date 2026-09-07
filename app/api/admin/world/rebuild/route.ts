import {NextResponse} from "next/server";
import {requireAdmin,apiStatus} from "@/lib/auth";
import {rebuildUniverseSystems} from "@/lib/world-engine";

export const maxDuration=26;

export async function POST(){
  try{
    const {career,universe}=await requireAdmin();
    const result=await rebuildUniverseSystems(career,universe);
    return NextResponse.json({
      ok:true,...result,
      message:universe.language==="en"
        ?`Universe systems rebuilt from ${result.processed} game(s).`
        :`Universe-Systeme aus ${result.processed} Spiel(en) neu aufgebaut.`
    });
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:apiStatus(e)});
  }
}
