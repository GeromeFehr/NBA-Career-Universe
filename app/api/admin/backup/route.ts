import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {fetchPaged} from "@/lib/universe";
import {apiFailure} from "@/lib/http";
export async function GET(){try{
 const {career,universe,client}=await requireAdmin();const out:Record<string,unknown>={exported_at:new Date().toISOString(),schema_version:"3.0",universe,career};
 const careerTables=["world_settings","team_stints","player_game_stats","game_notables","injuries","career_events","story_arcs","trade_interest","trade_offers","media_posts","award_snapshots","milestones","relationships","universe_reputation","rivalries","persona_memories","pregame_coverage","postgame_grades","season_goals","career_records","trophies","trade_sagas","interviews","fanbase_metrics","season_recaps","legacy_scores","screenshot_scans","ai_usage_logs","career_contracts","career_ledger"] as const;
 // Bounded concurrency, deterministic ordering, full pagination for long careers.
 for(let i=0;i<careerTables.length;i+=5)await Promise.all(careerTables.slice(i,i+5).map(async table=>{out[table]=await fetchPaged((from,to)=>client.from(table).select("*").eq("career_id",career.id).order(table==="universe_reputation"||table==="legacy_scores"?"career_id":"id").range(from,to));}));
 out.teams=await fetchPaged((from,to)=>client.from("teams").select("*").order("id").range(from,to));out.seasons=await fetchPaged((from,to)=>client.from("seasons").select("*").order("id").range(from,to));
 out.games=await fetchPaged((from,to)=>client.from("games").select("*").or(`universe_id.is.null,universe_id.eq.${universe.id}`).order("id").range(from,to));
 out.universe_games=await fetchPaged((from,to)=>client.from("universe_games").select("*").eq("universe_id",universe.id).order("id").range(from,to));
 out.trade_saga_updates=await fetchPaged((from,to)=>client.from("trade_saga_updates").select("*,trade_sagas!inner(career_id)").eq("trade_sagas.career_id",career.id).order("id").range(from,to));
 return new NextResponse(JSON.stringify(out,null,2),{headers:{"content-type":"application/json","Cache-Control":"no-store","content-disposition":`attachment; filename="career-universe-${universe.id}.json"`}});
}catch(e){return apiFailure(e);}}
