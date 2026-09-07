import { db } from "@/lib/db";
import { normalizeAbbr, easternDay } from "@/lib/team-map";

type RawGame = {
  externalId?: string;
  utc: string;
  home: string;
  away: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status?: string;
  stage?: string;
  venue?: string | null;
  broadcast?: string | null;
  source: string;
  countsTowardStandings?: boolean;
};

async function fetchFixtureDownload(url:string):Promise<RawGame[]> {
  const r = await fetch(url, {headers:{"user-agent":"Mozilla/5.0 NBA-Career-Universe/1.0"}, cache:"no-store"});
  if (!r.ok) throw new Error(`FixtureDownload HTTP ${r.status}`);
  const rows:any[] = await r.json();
  return rows.map((x:any)=>({
    externalId:String(x.MatchNumber ?? x.Id ?? ""),
    utc:String(x.DateUtc ?? x.Date ?? ""),
    home:String(x.HomeTeam ?? ""),
    away:String(x.AwayTeam ?? ""),
    homeScore:x.HomeTeamScore ?? null,
    awayScore:x.AwayTeamScore ?? null,
    status:x.HomeTeamScore != null && x.AwayTeamScore != null ? "completed" : "scheduled",
    stage:String(x.Group ?? "Regular Season"),
    venue:x.Location ?? null,
    source:"fixturedownload",
    countsTowardStandings: !/championship/i.test(String(x.Group ?? ""))
  })).filter(x=>x.utc);
}

async function fetchNbaCdn(url:string):Promise<RawGame[]> {
  const r = await fetch(url, {headers:{"user-agent":"Mozilla/5.0","accept":"application/json"}, cache:"no-store"});
  if (!r.ok) throw new Error(`NBA CDN HTTP ${r.status}`);
  const data:any = await r.json();
  const out:RawGame[] = [];
  for (const d of data?.leagueSchedule?.gameDates || []) {
    for (const g of d.games || []) {
      out.push({
        externalId:String(g.gameId ?? ""),
        utc:String(g.gameDateTimeUTC ?? g.gameDateTimeEst ?? ""),
        home:String(g.homeTeam?.teamTricode ?? `${g.homeTeam?.teamCity||""} ${g.homeTeam?.teamName||""}`.trim()),
        away:String(g.awayTeam?.teamTricode ?? `${g.awayTeam?.teamCity||""} ${g.awayTeam?.teamName||""}`.trim()),
        homeScore:g.homeTeam?.score ? Number(g.homeTeam.score) : null,
        awayScore:g.awayTeam?.score ? Number(g.awayTeam.score) : null,
        status:Number(g.gameStatus) === 3 ? "completed" : "scheduled",
        stage:String(g.gameLabel ?? g.gameSubtype ?? "Regular Season"),
        venue:g.arenaName ?? null,
        broadcast:(g.broadcasters?.nationalTvBroadcasters||[]).map((b:any)=>b.broadcasterDisplay).join(", ") || null,
        source:"nba-cdn",
        countsTowardStandings: !/championship/i.test(String(g.gameLabel ?? ""))
      });
    }
  }
  return out;
}

export async function syncSchedule(sourcePreference = process.env.NBA_SCHEDULE_SOURCE || "auto") {
  const client = db();
  const {data:season,error:seasonErr}=await client.from("seasons").select("*").eq("current",true).single();
  if (seasonErr || !season) throw new Error("No current season configured.");
  const {data:teams}=await client.from("teams").select("id,abbreviation");
  const teamIds = Object.fromEntries((teams||[]).map((t:any)=>[t.abbreviation,t.id]));

  let raws:RawGame[] = [];
  let used = "";
  const errors:string[] = [];
  const attempts = sourcePreference === "nba" ? ["nba"] : sourcePreference === "fixture" ? ["fixture"] : ["nba","fixture"];

  for (const source of attempts) {
    try {
      if (source === "nba") {
        raws = await fetchNbaCdn(process.env.NBA_CDN_SCHEDULE_URL || "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json");
        used = "nba-cdn";
      } else {
        raws = await fetchFixtureDownload(process.env.FIXTUREDOWNLOAD_URL || "https://fixturedownload.com/feed/json/nba-2026");
        used = "fixturedownload";
      }
      if (raws.length) break;
    } catch (e:any) { errors.push(`${source}: ${e.message}`); }
  }
  if (!raws.length) throw new Error(`No schedule source succeeded. ${errors.join(" | ")}`);

  const start = new Date(`${season.start_date}T00:00:00Z`);
  const end = new Date(`${season.end_date}T23:59:59Z`);
  let imported=0, skipped=0;

  for (const g of raws) {
    const dt = new Date(g.utc);
    if (!Number.isFinite(dt.getTime()) || dt < start || dt > end) { skipped++; continue; }
    const ha = normalizeAbbr(g.home), aa = normalizeAbbr(g.away);
    if (!teamIds[ha] || !teamIds[aa]) { skipped++; continue; }
    const day = easternDay(dt.toISOString());
    const sourceKey = `${day}_${aa}_${ha}`;
    const payload:any = {
      season_id:season.id, source_key:sourceKey, external_id:g.externalId || null,
      game_date:dt.toISOString(), game_day:day, stage:g.stage || "Regular Season",
      home_team_id:teamIds[ha], away_team_id:teamIds[aa],
      home_score:g.homeScore ?? null, away_score:g.awayScore ?? null,
      status:g.status || "scheduled", venue:g.venue || null, broadcast:g.broadcast || null,
      data_source:g.source, counts_toward_standings:g.countsTowardStandings !== false
    };
    const {error}=await client.from("games").upsert(payload,{onConflict:"source_key"});
    if (error) throw error;
    imported++;
  }
  await client.from("schedule_sync_log").insert({source:used, imported_count:imported, skipped_count:skipped, errors});
  return {source:used,imported,skipped,errors};
}
