import {createHash,randomBytes} from "node:crypto";
import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {apiFailure,readJson} from "@/lib/http";
import {cleanText,uuid,finiteNumber,InputError} from "@/lib/game-input";
import {checked} from "@/lib/data";
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
export async function POST(req:Request){try{
 const {user,universe,client}=await requireAdmin(),b=await readJson(req,8000);
 if(["create","rotate","join","leave"].includes(b.action)){
  const code=b.action==="create"||b.action==="rotate"?randomBytes(24).toString("hex"):String(b.code||"").trim().toLowerCase();
  if(b.action==="join"&&!/^[a-f0-9]{48}$/.test(code))throw new InputError("COOP_INVALID_INVITE");
  const id=checked(await client.rpc("manage_coop",{p_actor:user.id,p_universe:universe.id,p_action:b.action,p_hash:code?hash(code):undefined,p_name:cleanText(b.name,80)||undefined}));
  return NextResponse.json({ok:true,id,...(["create","rotate"].includes(b.action)?{code}:{})},{headers:{"Cache-Control":"no-store"}});
 }
 if(["propose","accept","reject"].includes(b.action)){
  const data=b.action==="propose"?{hostGameId:uuid(b.hostGameId),guestGameId:uuid(b.guestGameId),homeScore:finiteNumber(b.homeScore,0,9999),awayScore:finiteNumber(b.awayScore,0,9999)}:{proposalId:uuid(b.proposalId)};
  checked(await client.rpc("coop_score_action",{p_actor:user.id,p_universe:universe.id,p_action:b.action,p_data:data}));
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }
 throw new InputError("INVALID_VALUES");
}catch(e){return apiFailure(e);}}
