import {NextResponse} from "next/server";
import {createHash,randomBytes} from "node:crypto";
import {requireUser} from "@/lib/auth";
import {db} from "@/lib/db";
import {requireFootball} from "@/lib/football-data";
import {apiFailure,readJson} from "@/lib/http";
import {privateResponse} from "@/lib/private-response";
import {InputError,uuid,validDate} from "@/lib/game-input";
import {parseFootballCreate,parseFootballMatch,footballText,footballNumber,optionalDay,clubsFromText,generateFootballSchedule,formations,footballSummary} from "@/lib/football";
import {generateFootballMedia} from "@/lib/football-media";
import type {SupabaseClient} from "@supabase/supabase-js";
import {validateFootballInput,FootballValidationError,footballIssue} from "@/lib/football-validation";

export const maxDuration=60;
function ok(data:Record<string,unknown>={}){return privateResponse(NextResponse.json({ok:true,...data}));}
function selected(response:NextResponse,id:string,language:string){response.cookies.set("nba_universe",id,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:31536000});response.cookies.set("nba_ui_language",language,{sameSite:"lax",path:"/",maxAge:31536000});return response;}
async function checked(q:PromiseLike<any>){const {data,error}=await q;if(error)throw error;return data;}
export async function POST(req:Request,{params}:{params:Promise<{action:string}>}){let currentAction="",submitted:Record<string,any>={};try{
 const {action}=await params,b=await readJson(req);
 currentAction=action;submitted=b;
 if(action==="create"){
  const user=await requireUser(),payload=parseFootballCreate(b),client=db() as unknown as SupabaseClient<any>;
  const id=await checked(client.rpc("create_football_universe",{p_actor:user.id,p_data:payload}));
  return selected(ok({universeId:id,href:"/fc"}),id,payload.language);
 }
 const ctx=await requireFootball(),{client,user,universe,profile}=ctx;
 validateFootballInput(action,b,{mode:profile.mode,club:profile.club_name,currentDate:universe.universe_date,budget:Number(profile.budget),formation:profile.formation,position:profile.position});
 const rpc=async(name:string,data:Record<string,unknown>)=>checked(client.rpc(name,{p_actor:user.id,p_universe:universe.id,...data}));
 if(action==="match"){
  const data=parseFootballMatch(b,profile.mode);data.season_id=uuid(data.season_id);
  if(b.id&&!b.expected)throw new InputError("STALE_GAME");
  const id=await rpc("fc_save_match",{p_id:b.id?uuid(b.id):null,p_expected:b.id?b.expected:null,p_data:data});
  let mediaWarning=false;
  if(data.status==="completed"&&!b.id&&[data.home_club,data.away_club].includes(data.tracked_club)){try{const match=await checked(client.from("fc_matches").select("*").eq("id",id).eq("universe_id",universe.id).single());await generateFootballMedia(ctx,match);}catch{mediaWarning=true;}}
  return ok({id,href:`/fc/match/${id}`,mediaWarning});
 }
 if(action==="schedule"){
  const season=await checked(client.from("fc_seasons").select("*").eq("id",profile.current_season_id).eq("universe_id",universe.id).single()),clubs=clubsFromText(b.clubs);
  if(!clubs.includes(profile.club_name))throw new InputError("INVALID_FC_CLUBS");
  const fixtures=generateFootballSchedule(clubs,season.start_date,season.end_date,season.league,profile.club_name);
  const count=await rpc("fc_generate_schedule",{p_season:season.id,p_clubs:clubs,p_fixtures:fixtures});return ok({count});
 }
 if(action==="season"){
  const clubs=String(b.clubs||"").trim()?clubsFromText(b.clubs):[profile.club_name];if(!clubs.includes(profile.club_name))throw new InputError("INVALID_FC_CLUBS");
  const data={name:footballText(b.name,40),start_date:validDate(b.start_date),end_date:validDate(b.end_date),league:footballText(b.league),clubs};
  const id=await rpc("fc_mutate_checked",{p_expected:b.expected,p_action:"season",p_data:data});return ok({id});
 }
 if(action==="profile"){
  const formation=String(b.formation||profile.formation);if(!(formation in formations))throw new InputError("INVALID_LINEUP");
  const data={name:footballText(b.name),language:b.language==="en"?"en":"de",universe_date:validDate(b.universe_date),profile:{person_name:footballText(b.person_name),position:footballText(b.position||profile.position,12),overall:footballNumber(b.overall,1,99),jersey_number:footballNumber(b.jersey_number,1,99,true,true),nationality:footballText(b.nationality,80,false)||null,birth_date:optionalDay(b.birth_date),formation,budget:footballNumber(b.budget??profile.budget,0,1e12,false),weekly_wage:footballNumber(b.weekly_wage??profile.weekly_wage,0,1e9,false),contract_until:optionalDay(b.contract_until)}};
  await rpc("fc_mutate_checked",{p_expected:b.expected,p_action:"profile",p_data:data});return selected(ok(),universe.id,data.language);
 }
 if(action==="squad"){
  if(profile.mode!=="manager")throw Error("FORBIDDEN");
  const status=String(b.status||"available");if(!["available","injured","suspended","loaned","departed"].includes(status))throw new InputError("INVALID_STATUS");
  const data={name:footballText(b.name),position:footballText(b.position,12),overall:footballNumber(b.overall,1,99),age:footballNumber(b.age,14,65,true,true),nationality:footballText(b.nationality,80,false)||null,jersey_number:footballNumber(b.jersey_number,1,99,true,true),market_value:footballNumber(b.market_value??0,0,1e12,false),weekly_wage:footballNumber(b.weekly_wage??0,0,1e9,false),contract_until:optionalDay(b.contract_until),role:footballText(b.role||"rotation",40),status,notes:footballText(b.notes,2000,false)||null};
  if(b.id){if(!b.expected)throw Error("STALE_GAME");const rows=await checked(client.from("fc_squad").update({...data,...(status!=="available"?{lineup_slot:null}:{})}).eq("id",uuid(b.id)).eq("universe_id",universe.id).eq("updated_at",b.expected).select("id"));if(!rows?.length)throw Error("STALE_GAME");return ok({id:rows[0].id});}
  const row=await checked(client.from("fc_squad").insert({...data,universe_id:universe.id}).select("id").single());return ok({id:row.id});
 }
 if(action==="lineup"){
  if(profile.mode!=="manager")throw Error("FORBIDDEN");if(!Array.isArray(b.slots)||b.slots.length!==11)throw new InputError("INVALID_LINEUP");
  const slots=b.slots.map((id:any)=>id?uuid(id):null);await rpc("fc_mutate_checked",{p_expected:b.expected,p_action:"lineup",p_data:{formation:footballText(b.formation,20),slots}});return ok();
 }
 if(action==="transfer"){
  const direction=String(b.direction),kind=String(b.kind);if(!["in","out","career"].includes(direction)||!["permanent","loan","free","return","manager"].includes(kind)||(profile.mode==="player"&&direction!=="career"))throw new InputError("INVALID_TRANSFER");
  const data={direction,kind,player_name:direction==="career"?profile.person_name:footballText(b.player_name),from_club:direction==="career"||direction==="out"?profile.club_name:footballText(b.from_club),to_club:direction==="in"?profile.club_name:footballText(b.to_club),transfer_date:validDate(b.transfer_date),fee:footballNumber(b.fee??0,0,1e12,false),weekly_wage:footballNumber(b.weekly_wage??0,0,1e9,false),contract_until:optionalDay(b.contract_until),club_color:/^#[0-9a-f]{6}$/i.test(b.club_color||"")?b.club_color:"#28684b",league:footballText(b.league||profile.league),notes:footballText(b.notes,2000,false)||null};
  if(data.from_club===data.to_club)throw new InputError("INVALID_TRANSFER");const id=await rpc("fc_mutate_checked",{p_expected:b.expected,p_action:"transfer",p_data:{...data,squad_id:b.squad_id?uuid(b.squad_id):null}});return ok({id});
 }
 if(action==="media"){
  const match=await checked(client.from("fc_matches").select("*").eq("id",uuid(b.match_id)).eq("universe_id",universe.id).eq("status","completed").maybeSingle());if(!match)throw Error("GAME_NOT_FOUND");if(![match.home_club,match.away_club].includes(match.tracked_club))throw new InputError("TEAM_NOT_IN_GAME");
  const result=await generateFootballMedia(ctx,match,b.ai!==false,true);return ok(result);
 }
 if(action==="interview"){
  const row=await checked(client.from("fc_interviews").select("*").eq("id",uuid(b.id)).eq("universe_id",universe.id).single());
  if(row.answer!=null)throw Error("INTERVIEW_CLOSED");const answer=footballText(b.answer,600);if(!row.options.includes(answer))throw new InputError("INVALID_ANSWER");
  const rows=await checked(client.from("fc_interviews").update({answer,answered_at:new Date().toISOString()}).eq("id",row.id).eq("universe_id",universe.id).is("answer",null).select("id"));if(!rows?.length)throw Error("INTERVIEW_CLOSED");return ok();
 }
 if(action==="trophy"){
  if(!["team","individual"].includes(b.kind))throw new InputError("INVALID_VALUES");
  const season=await checked(client.from("fc_seasons").select("id").eq("id",uuid(b.season_id)).eq("universe_id",universe.id).maybeSingle());if(!season)throw new InputError("INVALID_SEASON");
  const row=await checked(client.from("fc_trophies").insert({universe_id:universe.id,season_id:season.id,name:footballText(b.name),kind:b.kind,award_date:validDate(b.award_date),notes:footballText(b.notes,2000,false)||null}).select("id").single());return ok({id:row.id});
 }
 if(action==="coop-create"){
  if(b.consent!==true)throw new InputError("INVALID_VALUES");const token=randomBytes(18).toString("hex"),hash=createHash("sha256").update(token).digest("hex");
  await rpc("fc_create_coop",{p_hash:hash,p_name:footballText(b.name)});return ok({invite:token});
 }
 if(action==="coop-join"){
  if(b.consent!==true)throw new InputError("INVALID_VALUES");const token=footballText(b.invite,80).toLowerCase();if(!/^[0-9a-f]{36}$/.test(token))throw Error("COOP_INVALID_INVITE");
  await rpc("fc_join_coop",{p_hash:createHash("sha256").update(token).digest("hex")});return ok();
 }
 if(action==="coop-leave"){await checked(client.from("fc_coop_links").delete().or(`host_universe_id.eq.${universe.id},guest_universe_id.eq.${universe.id}`));return ok();}
 return privateResponse(NextResponse.json({error:"Unknown action"},{status:404}));
 }catch(error){
  // Give known database rejections a field location as well. Never expose SQL errors.
  const code=error instanceof Error?error.message:typeof error==="object"&&error&&"message" in error?String(error.message):"";
  if(!(error instanceof FootballValidationError)){
   if(code==="INSUFFICIENT_BUDGET")error=new FootballValidationError([footballIssue("fee","Die Ablöse überschreitet das aktuell verfügbare Transferbudget. Prüfe Ablöse und Budget.","The fee exceeds your currently available transfer budget. Check the fee and budget.",code)]);
   else if(code==="INVALID_SEASON")error=new FootballValidationError([footballIssue(currentAction==="season"?"start_date":"season_id",currentAction==="season"?"Die Saison muss nach dem aktuellen Karrieredatum beginnen und vor ihrem Enddatum starten.":"Die ausgewählte Saison gehört nicht zu dieser Karriere. Lade die Seite neu und wähle sie erneut.",currentAction==="season"?"The season must start after your current career date and before its end date.":"The selected season does not belong to this career. Reload and select it again.",code)]);
   else if(code==="INVALID_TRANSFER"&&currentAction==="transfer")error=new FootballValidationError([footballIssue(submitted.squad_id?"squad_id":"direction",submitted.squad_id?"Dieser Kaderspieler ist nicht mehr für einen Abgang verfügbar oder sein Name stimmt nicht mit dem Transfer überein. Lade den Kader neu.":"Der Wechsel passt nicht zu deinem aktuellen Verein oder Karrieremodus. Lade die Karriere neu und prüfe die Transferart.",submitted.squad_id?"This squad player is no longer available for departure or their name differs from the transfer. Reload the squad.":"The transfer does not match your current club or career mode. Reload the career and check the direction.",code)]);
  }
  return apiFailure(error);
 }}
export async function GET(req:Request,{params}:{params:Promise<{action:string}>}){try{
 const {action}=await params,ctx=await requireFootball(),{client,universe,profile}=ctx;
 if(action==="export"){
  const tables=["fc_seasons","fc_matches","fc_squad","fc_transfers","fc_trophies","fc_events","fc_media","fc_interviews"],data:Record<string,unknown>={format:"career-universe/football-v1",exported_at:new Date().toISOString(),career:{name:universe.name,language:universe.language,date:universe.universe_date},profile};
  for(const table of tables){const rows:any[]=[];for(let from=0;;from+=1000){const batch=await checked(client.from(table).select("*").eq("universe_id",universe.id).order("id").range(from,from+999));rows.push(...batch);if(batch.length<1000)break;}data[table]=rows;}
  return privateResponse(new NextResponse(JSON.stringify(data,null,2),{headers:{"content-type":"application/json","content-disposition":'attachment; filename="career-universe-football.json"'}}));
 }
 if(action==="coop"){
  const link=await checked(client.from("fc_coop_links").select("id,name,host_universe_id,guest_universe_id,invite_expires_at").or(`host_universe_id.eq.${universe.id},guest_universe_id.eq.${universe.id}`).maybeSingle());if(!link)return ok({link:null});
  const partnerId=link.host_universe_id===universe.id?link.guest_universe_id:link.host_universe_id;if(!partnerId)return ok({link,partner:null});
  const partner=await checked(client.from("fc_profiles").select("person_name,club_name,mode,current_season_id").eq("universe_id",partnerId).single());
  const rows=await checked(client.from("fc_matches").select("*").eq("universe_id",partnerId).eq("season_id",partner.current_season_id).eq("status","completed").limit(1000));
  const media=await checked(client.from("fc_media").select("id,author,headline,body,kind,created_at").eq("universe_id",partnerId).eq("language",universe.language).order("created_at",{ascending:false}).limit(12));
  return ok({link,partner:{...partner,summary:footballSummary(rows||[]),media}});
 }
 return privateResponse(NextResponse.json({error:"Unknown action"},{status:404}));
 }catch(error){return apiFailure(error);}}
