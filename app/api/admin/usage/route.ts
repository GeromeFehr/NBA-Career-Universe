import {apiFailure} from "@/lib/http";
import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {fetchPaged} from "@/lib/universe";
import {configuredBudgetUsd} from "@/lib/ai-usage";

function sum(rows:any[],key:string){return rows.reduce((a,r)=>a+Number(r?.[key]||0),0)}
function summary(rows:any[]){
  return {
    requests:sum(rows,"request_count"),
    inputTokens:sum(rows,"input_tokens"),
    outputTokens:sum(rows,"output_tokens"),
    totalTokens:sum(rows,"total_tokens"),
    unpricedRequests:rows.filter(r=>r.meta?.priceKnown===false).reduce((n,r)=>n+Number(r.request_count||0),0),
    costUsd:Number(sum(rows,"estimated_cost_usd").toFixed(6))
  };
}

export async function GET(){
  try{
    const {career,universe,client}=await requireAdmin();
    const rows=await fetchPaged((from,to)=>client.from("ai_usage_logs")
      .select("*")
      .eq("career_id",career.id)
      .order("created_at",{ascending:false})
      .order("id").range(from,to));
    const today=new Date().toISOString().slice(0,10);
    const todayRows=rows.filter((r:any)=>String(r.created_at||"").slice(0,10)===today);
    const seasonRows=rows.filter((r:any)=>r.meta?.seasonId===universe.current_season_id);

    const byFeature=Object.entries(rows.reduce((acc:any,row:any)=>{
      const k=String(row.feature||"other");
      if(!acc[k])acc[k]=[];
      acc[k].push(row);
      return acc;
    },{})).map(([feature,featureRows]:any)=>({feature,...summary(featureRows)}))
      .sort((a,b)=>b.costUsd-a.costUsd);

    const total=summary(rows);
    const budgetUsd=configuredBudgetUsd();
    return NextResponse.json({
      ok:true,
      today:summary(todayRows),
      season:summary(seasonRows),
      total,
      byFeature,
      budgetUsd,
      estimatedRemainingUsd:total.unpricedRequests?null:Number(Math.max(0,budgetUsd-total.costUsd).toFixed(4)),
      note:"Estimated project usage based on API-reported tokens; this is not the live OpenAI billing balance."
    });
  }catch(e){
    return apiFailure(e);
  }
}
