import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function pageContext() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const store = await cookies();
  const universeId = store.get("nba_universe")?.value;
  if (!universeId) redirect("/universes");

  const client = db();
  const { data: universe } = await client.from("universes").select("*").eq("id", universeId).maybeSingle();
  if (!universe || universe.owner_id !== user.id) redirect("/universes");

  const { data: career } = await client
    .from("career_profiles")
    .select("*,current_team:teams(*)")
    .eq("universe_id", universe.id)
    .maybeSingle();

  if (!career) redirect("/universes");
  return { user, universe, career, client };
}

export function mergeUniverseResults(games: any[], results: any[]) {
  const byGame = new Map((results || []).map((r: any) => [r.game_id, r]));
  return (games || []).map((g: any) => {
    const r: any = byGame.get(g.id);
    return {
      ...g,
      universe_game_id: r?.id ?? null,
      status: r?.status ?? "scheduled",
      home_score: r?.home_score ?? null,
      away_score: r?.away_score ?? null,
      universe_story_notes: r?.story_notes ?? null
    };
  });
}
