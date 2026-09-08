import {playerBackground} from "@/lib/player-background";
import {comparisonStats} from "@/lib/coop-coverage";
import {sharedMatchups} from "@/lib/coop";
import {pageContext,fetchPaged} from "@/lib/universe";
import {checked} from "@/lib/data";

/** Only owners of the currently selected universe can enter this shared read surface. */
export async function coopContext() {
  const context=await pageContext();
  const link=checked(await context.client.from("coop_links").select("id,name,host_universe_id,guest_universe_id,invite_expires_at,joined_at,created_at").or(`host_universe_id.eq.${context.universe.id},guest_universe_id.eq.${context.universe.id}`).maybeSingle());
  return {...context,link};
}

export async function coopPlayers(context:Awaited<ReturnType<typeof coopContext>>) {
  const {link,client}=context;
  if(!link?.guest_universe_id)return [];
  return checked(await client.from("career_profiles").select("id,universe_id,player_name,position,overall,jersey_number,draft_status,draft_year,draft_round,draft_pick,rookie_season_id,universe_date,current_team_id,current_team:teams(id,abbreviation,city,name,primary_color),universes!inner(current_season_id,language)").in("universe_id",[link.host_universe_id,link.guest_universe_id]))||[];
}

export async function coopStats(context:Awaited<ReturnType<typeof coopContext>>,careerIds:string[],seasonId:string) {
  return fetchPaged((from,to)=>context.client.from("player_game_stats").select("id,career_id,game_id,team_id,appearance_status,minutes,points,rebounds,assists,steals,blocks,turnovers,fgm,fga,tpm,tpa,ftm,fta,games!inner(id,season_id,game_day,home_team_id,away_team_id,stage,home:teams!games_home_team_id_fkey(id,abbreviation),away:teams!games_away_team_id_fkey(id,abbreviation))").in("career_id",careerIds).eq("games.season_id",seasonId).order("id").range(from,to));
}

/** Only result numbers are exposed when the owner opens their own matching game. */
export async function coopResultForGame(client:Awaited<ReturnType<typeof pageContext>>["client"],universeId:string,game:{id:string;season_id:string;game_day:string;home_team_id:string|null;away_team_id:string|null;stage:string}) {
 const link=checked(await client.from("coop_links").select("host_universe_id,guest_universe_id").or(`host_universe_id.eq.${universeId},guest_universe_id.eq.${universeId}`).not("guest_universe_id","is",null).maybeSingle());
 if(!link?.guest_universe_id || !game.home_team_id || !game.away_team_id)return null;
 const peer=link.host_universe_id===universeId?link.guest_universe_id:link.host_universe_id;
 const rows=checked(await client.from("universe_games").select("home_score,away_score,games!inner(season_id,game_day,home_team_id,away_team_id,stage)").eq("universe_id",peer).eq("status","completed").eq("games.season_id",game.season_id).eq("games.game_day",game.game_day).eq("games.home_team_id",game.home_team_id).eq("games.away_team_id",game.away_team_id).eq("games.stage",game.stage).limit(2));
 return rows?.length===1?{home_score:rows[0].home_score,away_score:rows[0].away_score,status:"completed"}:null;
}

/** Season comparison is opt-in through the active link and bounded by the covered date. */
export async function coopMediaCanon(universeId:string,seasonId:string|null,asOf:string) {
 if(!seasonId)return null;
 const {db}=await import("@/lib/db"),client=db();
 const link=checked(await client.from("coop_links").select("host_universe_id,guest_universe_id").or(`host_universe_id.eq.${universeId},guest_universe_id.eq.${universeId}`).not("guest_universe_id","is",null).maybeSingle());
 if(!link?.guest_universe_id)return null;
 const players=checked(await client.from("career_profiles").select("id,universe_id,player_name,position,draft_status,draft_year,draft_pick,draft_round,rookie_season_id,universes!inner(language)").in("universe_id",[link.host_universe_id,link.guest_universe_id]))||[];
 if(players.length!==2||players[0].universes.language!==players[1].universes.language)return null;
 players.sort((a,b)=>a.universe_id===universeId?-1:b.universe_id===universeId?1:0);
 const [rows,backgrounds]=await Promise.all([
  fetchPaged((from,to)=>client.from("player_game_stats").select("id,career_id,game_id,team_id,appearance_status,points,rebounds,assists,steals,blocks,minutes,fgm,fga,tpm,tpa,ftm,fta,games!inner(id,season_id,game_day,home_team_id,away_team_id,stage)").in("career_id",players.map(p=>p.id)).eq("games.season_id",seasonId).lte("games.game_day",asOf).order("id").range(from,to)),
  Promise.all(players.map(p=>playerBackground(p,seasonId)))
 ]);
 const byPlayer=players.map(p=>rows.filter(r=>r.career_id===p.id));
 return {as_of:asOf,season_id:seasonId,both_rookies:backgrounds.every(b=>b.is_rookie===true),
  players:players.map((p,i)=>({name:p.player_name,position:p.position,background:backgrounds[i],stats:comparisonStats(byPlayer[i],seasonId,asOf)})),
  shared_games:sharedMatchups(byPlayer[0],byPlayer[1]).slice(0,2).map(m=>({date:m.host.games.game_day,same_team:m.sameTeam,players:[m.host,m.guest].map((r,i)=>({name:players[i].player_name,status:r.appearance_status,PTS:r.appearance_status==="played"?r.points:null,REB:r.appearance_status==="played"?r.rebounds:null,AST:r.appearance_status==="played"?r.assists:null}))}))
 };
}
