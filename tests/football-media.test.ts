import test from "node:test";
import assert from "node:assert/strict";
import {editorialFootball,generateFootballMedia} from "../lib/football-media";
import {parseFootballMatch,type FootballMatch} from "../lib/football";
import {buildFootballMediaContext,footballMediaPlan,footballMediaKinds} from "../lib/football-media-context";
import {footballOutlets,outletsForFootballCountry,footballMediaCountry} from "../lib/football-outlets";
import {footballLeagues} from "../lib/football-catalog";
import {validateFootballMediaOutput} from "../lib/football-media-output";
import {footballAiModel} from "../lib/football-ai-config";
const raw={season_id:"11111111-1111-4111-8111-111111111111",match_date:"2027-07-01",competition:"UEFA Champions League",stage:"international",home_club:"Juventus",away_club:"AS Monaco",tracked_club:"Juventus",status:"completed",home_score:7,away_score:1,player_stats:{appearance:"played",minutes:92,goals:1,assists:4,rating:10}};
const game=(changes:Record<string,unknown>={}):FootballMatch=>({id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",universe_id:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",updated_at:"2027-07-01T22:00:00Z",...parseFootballMatch({...raw,...changes},"player")});
const profile={person_name:"Alex",club_name:"Juventus",mode:"player",position:"ST",league:"Serie A"};
function payload(plan:ReturnType<typeof footballMediaPlan>){return {items:plan.map(row=>({kind:row.kind,headline:`${row.kind}: Juventus and the 7–1 result`,body:`The ${row.kind} perspective on Juventus and AS Monaco focuses on the 7–1 result and Alex's one goal and four assists. The competition is the UEFA Champions League; the available player rating is 10 and the minutes played are 92. Each fact belongs to this match.`})),interview:{question:"How do you assess your five goal contributions in this 7–1 win?",options:["The team made this possible.","I still want to improve the next performance.","It is a good result to build on."]}};}
test("every domestic league has a regional media pool, including the local Sky editions",()=>{
 for(const league of footballLeagues.filter(l=>l.kind==="league"))assert.ok(footballOutlets.some(outlet=>outlet.country===footballMediaCountry("",league.name)),league.country);
 for(const [country,name] of [["Deutschland","Sky Sport Deutschland"],["England","Sky Sports"],["Italien","Sky Sport Italia"],["Österreich","Sky Sport Austria"]])assert.ok(outletsForFootballCountry(country).some(outlet=>outlet.name===name&&outlet.broadcast));
});
test("media context excludes future games and other seasons and keeps the historical club",()=>{
 const m=game(),past=game({match_date:"2027-06-30",home_score:2,player_stats:{appearance:"played",goals:1,assists:0}});past.id="past";
 const future=game({match_date:"2027-07-02",player_stats:{appearance:"played",goals:4,assists:1}}),oldSeason=game({season_id:"22222222-2222-4222-8222-222222222222"});
 const c=buildFootballMediaContext(m,{...profile,club_name:"New Club"},[m,past,future,oldSeason]);assert.equal(c.profile.club_name,"Juventus");assert.equal(c.country,"Italien");assert.equal(c.opponentCountry,"Frankreich");assert.equal(c.summary.appearances,2);assert.equal(c.summary.goals,2);assert.equal(c.previousResults.length,1);
});
test("nine report perspectives use distinct outlets, factual match details and new headlines on refresh",()=>{
 const m=game(),pack=editorialFootball(m,profile,[m],"de");assert.deepEqual(pack.items.map(item=>item.kind),[...footballMediaKinds]);assert.equal(new Set(pack.items.map(item=>item.headline)).size,9);assert.equal(new Set(pack.items.map(item=>item.body)).size,9);
 assert.ok(pack.items.find(item=>item.kind==="broadcast")?.outlet?.includes("Sky"));assert.ok(pack.items.find(item=>item.kind==="recap")?.body.includes("Juventus 7 – 1 AS Monaco"));assert.ok(pack.interview.question.includes("5" )||pack.interview.question.includes("Sieg"));
 const refreshed=editorialFootball(m,profile,[m],"de",pack.items);const previous=new Set(pack.items.map(item=>item.headline));assert.ok(refreshed.items.every(item=>!previous.has(item.headline)));
 const professional=pack.items.filter(item=>item.outlet);assert.equal(new Set(professional.map(item=>item.outlet)).size,professional.length);
});
test("non-appearances are not credited with goals or individual performance",()=>{
 const m=game({player_stats:{appearance:"bench"}}),pack=editorialFootball(m,profile,[m],"en");assert.ok(pack.items.find(item=>item.kind==="recap")?.body.includes("did not play"));assert.ok(pack.items.find(item=>item.kind==="critical")?.body.includes("next appearance"));assert.ok(!pack.items.some(item=>item.body.includes("Alex contributed")));
});
test("AI output rejects missing perspectives, repetitions and malformed interviews",()=>{
 const m=game(),plan=footballMediaPlan(buildFootballMediaContext(m,profile,[m])),valid=payload(plan),pack=validateFootballMediaOutput(valid,plan,[],"gpt-6.1-sol");assert.equal(pack.items.length,9);assert.ok(pack.items.every(item=>item.model==="gpt-6.1-sol"&&item.source==="openai"&&item.generation_version===2));
 assert.throws(()=>validateFootballMediaOutput({...valid,items:valid.items.slice(0,5)},plan,[],"gpt-6.1-sol"));assert.throws(()=>validateFootballMediaOutput(valid,plan,[valid.items[0]],"gpt-6.1-sol"));
 assert.throws(()=>validateFootballMediaOutput({...valid,items:valid.items.map((item,i)=>i===1?{...item,headline:valid.items[0].headline}:item)},plan,[],"gpt-6.1-sol"));assert.throws(()=>validateFootballMediaOutput({...valid,interview:{...valid.interview,options:["Same","Same","Same"]}},plan,[],"gpt-6.1-sol"));
});
test("automatic coverage requests GPT 6.1 Sol, persists nine branded reports and supports forced refresh",async()=>{
 const m=game(),plan=footballMediaPlan(buildFootballMediaContext(m,profile,[m])),parsed=payload(plan),saved:any[]=[];const originalFetch=globalThis.fetch,envNames=["OPENAI_API_KEY","OPENAI_BASE_URL","OPENAI_MODEL","OPENAI_FOOTBALL_MODEL"] as const,env=Object.fromEntries(envNames.map(name=>[name,process.env[name]]));
 let request:any;
 const client={rpc:async(name:string,args:any)=>{saved.push({name,args});return {data:name==="fc_claim_media"?{cached:false,token:"job-token"}:null,error:null};},from:(table:string)=>{const query:any={select:()=>query,eq:()=>query,lte:()=>query,order:()=>query,limit:()=>query,single:()=>query,insert:(values:any)=>{saved.push({table,values});return query;},update:()=>query,then:(resolve:any)=>resolve({data:table==="fc_matches"?[m]:table==="fc_seasons"?{league:"Serie A",name:"2027/28"}:[],error:null})};return query;}};
 try{
  process.env.OPENAI_API_KEY="unit-test-key";process.env.OPENAI_BASE_URL="https://test.invalid/v1";process.env.OPENAI_MODEL="gpt-5.6-luna";delete process.env.OPENAI_FOOTBALL_MODEL;
  globalThis.fetch=async(_url,options)=>{request=JSON.parse(String(options?.body));return new Response(JSON.stringify({id:"test-response",model:"gpt-6.1-sol",status:"completed",output_text:JSON.stringify(parsed),output:[{type:"message",role:"assistant",content:[{type:"output_text",text:JSON.stringify(parsed),annotations:[]}]}],usage:{input_tokens:100,output_tokens:300}}),{headers:{"content-type":"application/json"}});};
  assert.equal(footballAiModel(),"gpt-6.1-sol");const result=await generateFootballMedia({client,universe:{id:m.universe_id,language:"en"},profile,user:{id:"owner"}},m,undefined,true);assert.equal(result.usedAI,true);assert.equal(result.aiWarning,false);assert.equal(request.model,"gpt-6.1-sol");assert.equal(request.store,false);assert.equal(request.reasoning.effort,"low");
  assert.equal(saved[0].args.p_force,true);const finished=saved.find(call=>call.name==="fc_finish_media");assert.equal(finished.args.p_items.length,9);assert.ok(finished.args.p_items.every((item:any)=>item.model==="gpt-6.1-sol"));assert.equal(process.env.OPENAI_MODEL,"gpt-5.6-luna");
  globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:"Unavailable",type:"server_error",code:"model_unavailable"}}),{status:503,headers:{"content-type":"application/json"}});const fallback=await generateFootballMedia({client,universe:{id:m.universe_id,language:"en"},profile,user:{id:"owner"}},m,true,true);assert.equal(fallback.usedAI,false);assert.equal(fallback.aiWarning,true);const fallbackFinish=saved.filter(call=>call.name==="fc_finish_media").at(-1);assert.equal(fallbackFinish.args.p_items.length,9);assert.ok(fallbackFinish.args.p_items.every((item:any)=>item.source==="editorial"&&item.model===null));
 }finally{globalThis.fetch=originalFetch;for(const name of envNames){if(env[name]===undefined)delete process.env[name];else process.env[name]=env[name];}}
});
