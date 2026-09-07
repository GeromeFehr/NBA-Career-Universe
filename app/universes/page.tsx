import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import UniverseManager from "@/components/UniverseManager";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const client = db();
  const [{data:universes},{data:legacy},{data:teams},{data:season}] = await Promise.all([
    client.from("universes")
      .select("*,career_profiles(*,current_team:teams!career_profiles_current_team_id_fkey(*))")
      .eq("owner_id",user.id)
      .order("updated_at",{ascending:false}),
    client.from("universes")
      .select("*,career_profiles(player_name,current_team:teams!career_profiles_current_team_id_fkey(abbreviation,city,name))")
      .is("owner_id",null)
      .order("created_at"),
    client.from("teams").select("*").eq("active",true).order("city"),
    client.from("seasons").select("*").eq("current",true).maybeSingle()
  ]);

  return <>
    <div className="sectionHead">
      <div><span className="eyebrow">MULTI-UNIVERSE HUB</span><h1>Meine Karrieren</h1></div>
      <form action="/api/auth/logout" method="post"><button>Logout</button></form>
    </div>
    <p className="muted">Jede Karriere besitzt eigene Spielstände, Stats, Trades, Storylines, Medien, Verletzungen und Ergebnisse.</p>
    <UniverseManager
      email={user.email||""}
      universes={universes||[]}
      legacy={legacy||[]}
      teams={teams||[]}
      season={season}
    />
  </>;
}
