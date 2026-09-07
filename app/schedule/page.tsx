import {db,hasDatabaseConfig} from "@/lib/db";
import ScheduleExplorer from "@/components/ScheduleExplorer";
export const dynamic="force-dynamic";
export default async function Page(){
 if(!hasDatabaseConfig()) return <div className="card">Supabase noch nicht konfiguriert.</div>;
 const client=db(); const [{data:games},{data:teams},{data:career}]=await Promise.all([
  client.from("games").select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)").order("game_date"),
  client.from("teams").select("*").eq("active",true).order("city"),
  client.from("career_profiles").select("universe_date").limit(1).maybeSingle()
 ]);
 return <><div className="sectionHead"><div><span className="eyebrow">FULL LEAGUE</span><h1>NBA Spielplan</h1></div><div className="muted">{games?.length||0} gespeicherte Spiele</div></div>
 <p className="muted">Alle 30 Teams in einem Kalender. Die zwei NBA-Cup-Flexspiele pro Team erscheinen erst, sobald sie real feststehen und erneut synchronisiert wurden.</p>
 <ScheduleExplorer games={games||[]} teams={teams||[]} universeDate={career?.universe_date||""}/></>
}
