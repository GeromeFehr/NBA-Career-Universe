import {uiLanguage} from "@/lib/ui-language";
import {PageHeader} from "@/components/Editorial";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import UniverseManager from "@/components/UniverseManager";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const lang=await uiLanguage(),en=lang==="en";
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
    <PageHeader title={en?"My careers":"Meine Karrieren"} subtitle={en?"Every career has its own games, stories and decisions.":"Jede Karriere hat ihre eigenen Spiele, Geschichten und Entscheidungen."} actions={<form action="/api/auth/logout" method="post"><button className="secondaryButton">{en?"Sign out":"Abmelden"}</button></form>}/>
    <UniverseManager
      language={lang}
      universes={universes||[]}
      legacy={legacy||[]}
      teams={teams||[]}
      season={season}
    />
  </>;
}
