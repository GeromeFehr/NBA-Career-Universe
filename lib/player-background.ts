import {cache} from "react";
import {db} from "@/lib/db";
import {checked} from "@/lib/data";
import {careerStage, draftStatus} from "@/lib/career-background";

const loadSeasons = cache(async (rookieId: string | null, seasonId: string | null) => {
  const ids = [...new Set([rookieId, seasonId].filter((id): id is string => !!id))];
  return ids.length ? checked(await db().from("seasons").select("id,label,start_date").in("id", ids)) : [];
});

export async function playerBackground(career: {rookie_season_id?: string | null; draft_status?: string; draft_year?: number | null; draft_pick?: number | null; draft_round?: number | null}, seasonId: string | null) {
  const seasons = await loadSeasons(career.rookie_season_id || null, seasonId) || [];
  const rookie = seasons.find(s => s.id === career.rookie_season_id) || null;
  const season = seasons.find(s => s.id === seasonId) || null;
  return {...careerStage(rookie, season), season: season?.label || null, rookie_season: rookie?.label || null,
    draft_status: draftStatus(career), draft_year: career.draft_year ?? null,
    draft_pick: career.draft_pick ?? null, draft_round: career.draft_round ?? null};
}
