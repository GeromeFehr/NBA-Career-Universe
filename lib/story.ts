import {db} from "@/lib/db";
import {requireUser} from "@/lib/auth";
import {fetchPaged} from "@/lib/universe";
import {milestoneRows} from "@/lib/milestone-logic";
export async function rebuildMilestones(careerId:string,language:"de"|"en"){
 const client=db(),user=await requireUser();const stats=await fetchPaged((from,to)=>client.from("player_game_stats").select("*,games(game_date)").eq("career_id",careerId).order("id").range(from,to));const rows=milestoneRows(stats,language);
 const {error}=await client.rpc("replace_career_milestones",{p_actor:user.id,p_career:careerId,p_language:language,p_rows:rows});if(error)throw error;return rows;
}
export async function detectMilestones(careerId:string,stat:any){const {data,error}=await db().from("career_profiles").select("universes(language)").eq("id",careerId).single();if(error)throw error;return (await rebuildMilestones(careerId,data?.universes?.language==="en"?"en":"de")).filter(x=>x.game_id===stat.game_id);}
