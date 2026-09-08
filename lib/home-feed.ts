import {coopPlayers,type coopContext} from "@/lib/coop-data";
import {checked} from "@/lib/data";
import {balancedMediaPreview} from "@/lib/media-preview";

/** Context comes from the selected universe's verified owner; callers supply no peer IDs. */
export async function homeFeed(context:Awaited<ReturnType<typeof coopContext>>){
 const {career,universe,client,link}=context,shared=Boolean(link?.guest_universe_id);
 const players=shared?await coopPlayers(context):[{id:career.id,player_name:career.player_name}];
 if(shared&&(players.length!==2||!players.some(p=>p.id===career.id)))throw Error("COOP_NOT_LINKED");
 const groups=await Promise.all(players.map(async player=>{
  const posts=checked(await client.from("media_posts").select("*").eq("career_id",player.id)
   .eq("language",universe.language).order("created_at",{ascending:false}).order("id").limit(6))||[];
  return posts.map(post=>({...post,playerName:player.player_name,ownCareer:player.id===career.id}));
 }));
 return {shared,posts:balancedMediaPreview(groups)};
}
