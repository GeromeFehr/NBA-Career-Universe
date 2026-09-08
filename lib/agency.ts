import {db} from "@/lib/db";
import {oncePerKey} from "@/lib/actions";
import {checked} from "@/lib/data";
export const AGENT_NAME="Jonas Keller";
export {money} from "@/lib/agency-display";
import {addYears} from "@/lib/agency-display";
import {fetchPaged} from "@/lib/universe";
export function addDays(date:string,n:number){const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
const brands=[{name:"Nike",category:"footwear",multiplier:1.3},{name:"adidas",category:"footwear",multiplier:1.2},{name:"New Balance",category:"footwear",multiplier:1},{name:"Gatorade",category:"nutrition",multiplier:.65},{name:"Beats",category:"audio",multiplier:.7},{name:"Tissot",category:"watches",multiplier:.55}];
export async function negotiateContracts(career:any,language:"de"|"en"){
 return oncePerKey(career.id,`agency:${career.universe_date}:${language}`,async()=>{
  const client=db();const rep=checked(await client.from("universe_reputation").select("star_power,cultural_impact,expert_respect").eq("career_id",career.id).maybeSingle());
  const power=rep?.star_power??50;const base=Math.round((50000+Math.pow(power/100,3)*2500000+Math.max(0,career.overall-75)*18000)/1000)*1000;
  let seed=0;for(const ch of career.id+career.universe_date)seed=(seed*31+ch.charCodeAt(0))>>>0;
  const selected=[brands[seed%3],brands[3+(seed%3)],brands[3+((seed+1)%3)]];
  const existing=await fetchPaged((from,to)=>client.from("career_contracts").select("category,status,signed_at,start_date,end_date,expires_on").eq("career_id",career.id).order("id").range(from,to));
  const available=selected.filter(b=>!existing.some(c=>c.category===b.category&&((c.signed_at&&c.end_date>career.universe_date&&c.start_date<addYears(career.universe_date,2))||(c.status==="offered"&&c.expires_on>=career.universe_date&&c.end_date>career.universe_date))));
  const rows=available.map(b=>({career_id:career.id,kind:"sponsorship",category:b.category,brand:b.name,status:"offered",annual_value:Math.round(base*b.multiplier/1000)*1000,signing_bonus:Math.round(base*b.multiplier*.1/1000)*1000,agent_fee_pct:15,start_date:career.universe_date,end_date:addYears(career.universe_date,2),offered_on:career.universe_date,expires_on:addDays(career.universe_date,14),language,terms:{appearances:4,social_posts:6,exclusive:true,simulation:true}}));
  if(!rows.length)return {offers:0};
  const {data,error}=await client.from("career_contracts").upsert(rows,{onConflict:"career_id,brand,offered_on,kind",ignoreDuplicates:true}).select("id");if(error)throw error;return {offers:data?.length||0};
 });
}
