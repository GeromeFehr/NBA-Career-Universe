import {db} from "@/lib/db";
import {requireUser} from "@/lib/auth";
import {uuid,validDate,cleanText} from "@/lib/game-input";
export async function moveTeam(careerId:string,toTeamId:string,date:string,description:string,offerId?:string){
 const user=await requireUser();const {error}=await db().rpc("move_career_team",{p_actor:user.id,p_career:uuid(careerId),p_team:uuid(toTeamId),p_date:validDate(date),p_description:cleanText(description)||"",...(offerId?{p_offer:uuid(offerId)}:{})});if(error)throw error;return true;
}
