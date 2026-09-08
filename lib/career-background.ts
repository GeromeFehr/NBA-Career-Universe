import {finiteNumber, InputError} from "./game-input";

export type DraftStatus = "drafted" | "undrafted" | "unknown";
type Background = {draft_status?: string; draft_year?: number | null; draft_round?: number | null; draft_pick?: number | null; rookie_season_id?: string | null};
type Season = {id: string; start_date: string; label: string};

export function draftStatus(career: Background): DraftStatus {
  if (career.draft_status === "undrafted") return "undrafted";
  return career.draft_pick != null ? "drafted" : "unknown";
}

/** Season identity, never draft year or the number of entered games, determines rookie status. */
export function careerStage(rookie: Season | null, season: Season | null) {
  if (!rookie || !season) return {is_rookie: null, career_season: null, stage: "unknown"} as const;
  if (rookie.id === season.id) return {is_rookie: true, career_season: 1, stage: "rookie"} as const;
  const years = Number(season.start_date.slice(0, 4)) - Number(rookie.start_date.slice(0, 4));
  if (years < 0) return {is_rookie: false, career_season: null, stage: "before_debut"} as const;
  return {is_rookie: false, career_season: years > 0 ? years + 1 : null, stage: years === 1 ? "second_year" : "experienced"} as const;
}

export function draftLabel(career: Background, lang: "de" | "en") {
  const en = lang === "en", status = draftStatus(career), year = career.draft_year ? ` ${career.draft_year}` : "";
  if (status === "undrafted") return `${en ? "Undrafted" : "Nicht gedraftet"}${year}`;
  if (status === "unknown") return en ? "Draft status unknown" : "Draftstatus offen";
  return `Draft${year} · Pick ${career.draft_pick}${career.draft_round ? ` · ${en ? "Round" : "Runde"} ${career.draft_round}` : ""}`;
}

export function stageLabel(stage: ReturnType<typeof careerStage>, lang: "de" | "en") {
  if (stage.is_rookie) return lang === "en" ? "Rookie season" : "Rookie-Saison";
  if (stage.career_season) return lang === "en" ? `NBA season ${stage.career_season}` : `${stage.career_season}. NBA-Saison`;
  return null;
}

export function parseDraftInput(b: Record<string, unknown>) {
  const status = b.draftStatus ?? (b.draftPick ? "drafted" : "unknown");
  if (!["drafted", "undrafted", "unknown"].includes(String(status))) throw new InputError("INVALID_DRAFT");
  const year = b.draftYear == null || b.draftYear === "" ? null : finiteNumber(b.draftYear, 1946, 2200);
  const pick = status === "drafted" ? finiteNumber(b.draftPick, 1, 100) : null;
  const round = status === "drafted" && b.draftRound != null && b.draftRound !== "" ? finiteNumber(b.draftRound, 1, 2) : null;
  return {draft_status: status as DraftStatus, draft_year: year, draft_round: round, draft_pick: pick};
}

export const backgroundRules = "Player background is authoritative for the season being covered. Use rookie only when is_rookie is true; second_year means the second NBA season. If is_rookie is false or null, never describe the player as a current rookie or current Rookie of the Year candidate. Old articles, story arcs and persona memories are historical context, not current status. For non-rookies avoid the word rookie entirely in new coverage; historical articles stay unchanged. Never infer experience from draft year or the number of recorded games. Use the supplied draft pick and round naturally when relevant, without inventing a drafting team, expectations or achievements. Undrafted is a permanent origin, not a rookie status; unknown is not undrafted. Never invent missing draft information.";

/** Reject stale rookie framing without making another paid generation request. */
export function coverageFitsBackground(items: {headline?: string; body?: string; rationale?: string; package_summary?: string; tone?: string}[], background: {is_rookie: boolean | null}) {
  return background.is_rookie === true || items.every(item => !/\brookies?\b|\bROTY\b/i.test([item.headline,item.body,item.rationale,item.package_summary,item.tone].filter(Boolean).join(" ")));
}
