import {NextResponse} from "next/server";
import {requireAdmin,apiStatus} from "@/lib/auth";
import {generateTradeMarket} from "@/lib/ai";
import {ensureTradeSaga} from "@/lib/world-engine";

export async function POST(){
  try{
    const {career,universe}=await requireAdmin();
    const offers=await generateTradeMarket(career.id);
    const saga=await ensureTradeSaga(career,offers,universe.language==="en"?"en":"de");
    return NextResponse.json({
      ok:true,offers,saga,
      message:universe.language==="en"?`${offers.length} offers generated`:`${offers.length} Angebote erzeugt`
    });
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:apiStatus(e)});
  }
}
