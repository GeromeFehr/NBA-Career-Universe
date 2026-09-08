import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {readJson,apiFailure} from "@/lib/http";
import {uuid,validDate,finiteNumber,InputError} from "@/lib/game-input";
import {negotiateContracts} from "@/lib/agency";
export async function POST(req:Request){try{
 const {user,career,universe,client}=await requireAdmin(),b=await readJson(req),lang=universe.language==="en"?"en":"de";
 if(b.action==="negotiate")return NextResponse.json({ok:true,...await negotiateContracts(career,lang)});
 if(b.action==="settle"){const {data,error}=await client.rpc("settle_career_contracts",{p_actor:user.id,p_career:career.id});if(error)throw error;return NextResponse.json({ok:true,...(data as object)});}
 if(b.action==="accept"||b.action==="decline"){const {data,error}=await client.rpc("respond_career_contract",{p_actor:user.id,p_career:career.id,p_contract:uuid(b.contractId),p_action:b.action});if(error)throw error;return NextResponse.json({ok:true,...(data as object)});}
 if(b.action==="salary"){
  const start=validDate(b.startDate),end=validDate(b.endDate);if(end<=start||Date.parse(end)-Date.parse(start)>366*86400000*10)throw new InputError("INVALID_DATE");
  const {error}=await client.rpc("prepare_career_salary",{p_actor:user.id,p_career:career.id,p_start:start,p_end:end,p_annual:finiteNumber(b.annualValue,1,1000000000,false),p_bonus:finiteNumber(b.signingBonus||0,0,1000000000,false)});if(error)throw error;return NextResponse.json({ok:true});
 }
 throw new InputError("INVALID_ANSWER");
}catch(e){return apiFailure(e);}}
