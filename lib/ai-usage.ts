import {db} from "@/lib/db";

type UsageLike={
  input_tokens?:number|null;
  output_tokens?:number|null;
  total_tokens?:number|null;
  input_tokens_details?:{cached_tokens?:number|null}|null;
};

type LogArgs={
  careerId:string;
  universeId?:string|null;
  gameId?:string|null;
  feature:string;
  model:string;
  usage?:UsageLike|null;
  meta?:Record<string,any>;
};

function num(v:any){const n=Number(v||0);return Number.isFinite(n)?n:0}

// Standard, short-context rates verified 2026-09-08:
// https://developers.openai.com/api/docs/models/gpt-5.6-luna
// https://developers.openai.com/api/docs/models/gpt-5.4-mini
export function pricingForModel(model:string){
 const table:Record<string,{input:number;cached:number;output:number}>={"gpt-5.6-luna":{input:.20,cached:.02,output:1.20},"gpt-5.4-mini":{input:.75,cached:.075,output:4.50}};
 if(process.env.OPENAI_INPUT_USD_PER_1M&&process.env.OPENAI_OUTPUT_USD_PER_1M)return {input:num(process.env.OPENAI_INPUT_USD_PER_1M),cached:num(process.env.OPENAI_CACHED_INPUT_USD_PER_1M||process.env.OPENAI_INPUT_USD_PER_1M),output:num(process.env.OPENAI_OUTPUT_USD_PER_1M)};
 return table[model]||null;
}
export function estimateUsageCost(model:string,inputTokens:number,outputTokens:number,cachedTokens=0){
 const p=pricingForModel(model);if(!p)return null;const cached=Math.min(inputTokens,Math.max(0,cachedTokens));
 return Number((((inputTokens-cached)*p.input+cached*p.cached+outputTokens*p.output)/1_000_000).toFixed(6));
}

export async function logAiUsage(args:LogArgs){
  const usage=args.usage||{};
  const inputTokens=num(usage.input_tokens);
  const outputTokens=num(usage.output_tokens);
  const totalTokens=num(usage.total_tokens)||inputTokens+outputTokens;
  const estimatedCostUsd=estimateUsageCost(args.model,inputTokens,outputTokens,num(usage.input_tokens_details?.cached_tokens));

  const {error}=await db().from("ai_usage_logs").insert({
    career_id:args.careerId,
    universe_id:args.universeId||null,
    game_id:args.gameId||null,
    feature:args.feature,
    model:args.model,
    request_count:1,
    input_tokens:inputTokens,
    output_tokens:outputTokens,
    total_tokens:totalTokens,
    estimated_cost_usd:estimatedCostUsd??0,
    meta:{
      ...(args.meta||{}),
      priceKnown:estimatedCostUsd!==null,priceVerifiedOn:"2026-09-08",pricing:pricingForModel(args.model),cachedTokens:num(usage.input_tokens_details?.cached_tokens)
    }
  });

  // Usage tracking must never break the actual career action.
  if(error)console.error("AI usage log failed",error.message);
  return {inputTokens,outputTokens,totalTokens,estimatedCostUsd};
}

export function configuredBudgetUsd(){
  const raw=num(process.env.AI_BUDGET_USD);
  return raw>0?raw:5;
}
