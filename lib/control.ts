import {pageContext,loadCareerSchedule} from "@/lib/universe";
import {checked} from "@/lib/data";
export async function controlData(){const {career,universe,client}=await pageContext();const [teams,careerGames,offers,injuries,seasons,settings]=await Promise.all([
 client.from("teams").select("*").eq("active",true).order("city").then(checked),loadCareerSchedule(client,career,universe),
 client.from("trade_offers").select("*,to_team:teams!trade_offers_to_team_id_fkey(*)").eq("career_id",career.id).eq("language",universe.language).eq("status","pending").order("created_at",{ascending:false}).then(checked),
 client.from("injuries").select("*").eq("career_id",career.id).eq("status","active").order("start_date",{ascending:false}).then(checked),client.from("seasons").select("*").order("start_date").then(checked),client.from("world_settings").select("*").eq("career_id",career.id).maybeSingle().then(checked)
 ]);return {career,universe,teams,careerGames,offers,injuries,seasons,settings};}
