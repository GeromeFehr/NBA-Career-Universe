import {cache} from "react";
import {redirect} from "next/navigation";
import {selectedCareer} from "@/lib/career-selection";
import {currentUser} from "@/lib/auth";
import {fetchPaged} from "@/lib/universe";
import type {FootballMatch} from "@/lib/football";

export const activeFootball=cache(async()=>{
 const context=await selectedCareer();if(!context||context.universe.game!=="fc")return null;
 const {data:profile,error}=await context.client.from("fc_profiles").select("*").eq("universe_id",context.universe.id).maybeSingle();
 if(error)throw error;if(!profile)return null;return {...context,profile};
});
export async function requireFootball(){if(!(await currentUser()))throw Error("UNAUTHORIZED");const context=await activeFootball();if(!context)throw Error("NO_UNIVERSE");return context;}
export async function footballPage(){if(!(await currentUser()))redirect("/login");const context=await activeFootball();if(!context)redirect("/universes?game=fc");return context;}
export const footballData=cache(async()=>{
 const ctx=await footballPage(),{client,universe,profile}=ctx,id=universe.id;
 const load=async(table:string,order:string,ascending=false)=>fetchPaged((from,to)=>client.from(table).select("*").eq("universe_id",id).order(order,{ascending}).order("id").range(from,to));
 const [matches,seasons,squad,media,interviews,transfers,trophies,events]=await Promise.all([load("fc_matches","match_date",true),load("fc_seasons","start_date",true),load("fc_squad","name",true),load("fc_media","created_at"),load("fc_interviews","created_at"),load("fc_transfers","transfer_date"),load("fc_trophies","award_date"),load("fc_events","event_date")]);
 return {...ctx,matches:matches as FootballMatch[],seasons,squad,media:media.filter(m=>m.language===universe.language),interviews:interviews.filter(m=>m.language===universe.language),transfers,trophies,events,season:seasons.find(s=>s.id===profile.current_season_id)};
});
