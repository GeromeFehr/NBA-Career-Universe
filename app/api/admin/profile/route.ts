import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {apiFailure, readJson} from "@/lib/http";
import {parseDraftInput} from "@/lib/career-background";
import {cleanText, finiteNumber, InputError, uuid} from "@/lib/game-input";
import {checked} from "@/lib/data";

export async function POST(req: Request) {
  try {
    const {career, universe, client} = await requireAdmin(), b = await readJson(req);
    const playerName = cleanText(b.playerName, 100);
    if (!playerName) throw new InputError("MISSING_VALUES");
    const rookieId = b.rookieSeasonId === undefined ? career.rookie_season_id : b.rookieSeasonId ? uuid(b.rookieSeasonId) : null;
    if (rookieId) {
      const ids = [...new Set([rookieId, universe.current_season_id].filter((id): id is string => !!id))];
      const seasons = checked(await client.from("seasons").select("id,start_date").in("id", ids)) || [];
      const rookie = seasons.find(s => s.id === rookieId), active = seasons.find(s => s.id === universe.current_season_id);
      if (!rookie || (active && rookie.start_date > active.start_date)) throw new InputError("INVALID_ROOKIE_SEASON");
    }
    const payload = {
      player_name: playerName, position: cleanText(b.position, 20), overall: finiteNumber(b.overall ?? 75, 25, 99),
      jersey_number: b.jerseyNumber == null || b.jerseyNumber === "" ? null : finiteNumber(b.jerseyNumber, 0, 99),
      ...parseDraftInput(b), rookie_season_id: rookieId, updated_at: new Date().toISOString(),
    };
    checked(await client.from("career_profiles").update(payload).eq("id", career.id).select("id").single());
    return NextResponse.json({ok: true});
  } catch (error) { return apiFailure(error); }
}
