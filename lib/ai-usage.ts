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

export function pricingForModel(model:string){
  const fallbackInput=num(process.env.OPENAI_INPUT_USD_PER_1M)||0.20;
  const fallbackOutput=num(process.env.OPENAI_OUTPUT_USD_PER_1M)||1.20;

  const table:Record<string,{input:number;output:number}>={
    "gpt-5.6-luna":{input:0.20,output:1.20},
    "gpt-5.4-mini":{input:0.15,output:0.60}
  };
  return table[model]||{input:fallbackInput,output:fallbackOutput};
}

export function estimateUsageCost(model:string,inputTokens:number,outputTokens:number){
  const p=pricingForModel(model);
  return Number(((inputTokens/1_000_000)*p.input+(outputTokens/1_000_000)*p.output).toFixed(6));
}

export async function logAiUsage(args:LogArgs){
  const usage=args.usage||{};
  const inputTokens=num(usage.input_tokens);
  const outputTokens=num(usage.output_tokens);
  const totalTokens=num(usage.total_tokens)||inputTokens+outputTokens;
  const estimatedCostUsd=estimateUsageCost(args.model,inputTokens,outputTokens);

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
    estimated_cost_usd:estimatedCostUsd,
    meta:{
      ...(args.meta||{}),
      cachedTokens:num(usage.input_tokens_details?.cached_tokens)
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
