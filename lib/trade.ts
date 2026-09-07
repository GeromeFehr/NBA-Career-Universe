import {db} from "@/lib/db";

export async function moveTeam(careerId:string,toTeamId:string,date:string,description:string,offerId?:string){
  const client=db();
  const {data:c}=await client.from("career_profiles").select("*").eq("id",careerId).single();
  if(!c)throw new Error("Career not found");
  if(c.current_team_id===toTeamId)throw new Error("Player is already on that team.");

  await client.from("team_stints").update({end_date:date,departure:"Trade"}).eq("career_id",careerId).is("end_date",null);
  await client.from("team_stints").insert({career_id:careerId,team_id:toTeamId,start_date:date,acquisition:"Trade"});

  await Promise.all([
    client.from("career_profiles").update({current_team_id:toTeamId,universe_date:date,updated_at:new Date().toISOString()}).eq("id",careerId),
    client.from("world_settings").update({universe_date:date,updated_at:new Date().toISOString()}).eq("career_id",careerId),
    client.from("universes").update({universe_date:date,updated_at:new Date().toISOString()}).eq("id",c.universe_id)
  ]);

  await client.from("career_events").insert({
    career_id:careerId,event_date:date,event_type:"trade",
    from_team_id:c.current_team_id,to_team_id:toTeamId,title:"Trade completed",description,
    metadata:offerId?{offer_id:offerId}:{}
  });

  if(offerId){
    await client.from("trade_offers").update({status:"accepted",accepted_at:new Date().toISOString()}).eq("id",offerId).eq("career_id",careerId);
    await client.from("trade_offers").update({status:"withdrawn"}).eq("career_id",careerId).eq("status","pending").neq("id",offerId);
  }
  return true;
}
