import { db } from "@/lib/db";
import { normalizeAbbr, easternDay } from "@/lib/team-map";

type RawGame = {
  externalId?: string;
  utc: string;
  home: string;
  away: string;
  stage?: string;
  venue?: string | null;
  broadcast?: string | null;
  source: string;
  countsTowardStandings?: boolean;
};

const FETCH_TIMEOUT_MS = 7000;
const UPSERT_BATCH_SIZE = 250;

async function fetchJson(url:string, headers:Record<string,string> = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers, cache:"no-store", signal:controller.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFixtureDownload(url:string):Promise<RawGame[]> {
  const rows:any[] = await fetchJson(url, {"user-agent":"Mozilla/5.0 NBA-Career-Universe/2.0"});
  return rows.map((x:any)=>({
    externalId:String(x.MatchNumber ?? x.Id ?? ""),
    utc:String(x.DateUtc ?? x.Date ?? ""),
    home:String(x.HomeTeam ?? ""),
    away:String(x.AwayTeam ?? ""),
    stage:String(x.Group ?? "Regular Season"),
    venue:x.Location ?? null,
    source:"fixturedownload",
    countsTowardStandings: !/championship/i.test(String(x.Group ?? ""))
  })).filter(x=>x.utc);
}

async function fetchNbaCdn(url:string):Promise<RawGame[]> {
  const data:any = await fetchJson(url, {"user-agent":"Mozilla/5.0","accept":"application/json"});
  const out:RawGame[] = [];
  for (const d of data?.leagueSchedule?.gameDates || []) {
    for (const g of d.games || []) {
      out.push({
        externalId:String(g.gameId ?? ""),
        utc:String(g.gameDateTimeUTC ?? g.gameDateTimeEst ?? ""),
        home:String(g.homeTeam?.teamTricode ?? `${g.homeTeam?.teamCity||""} ${g.homeTeam?.teamName||""}`.trim()),
        away:String(g.awayTeam?.teamTricode ?? `${g.awayTeam?.teamCity||""} ${g.awayTeam?.teamName||""}`.trim()),
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

function chunk<T>(rows:T[], size:number) {
  const out:T[][] = [];
  for (let i=0;i<rows.length;i+=size) out.push(rows.slice(i,i+size));
  return out;
}

export async function syncSchedule(sourcePreference = process.env.NBA_SCHEDULE_SOURCE || "auto") {
  const client = db();
  const {data:season,error:seasonErr}=await client.from("seasons").select("*").eq("current",true).single();
  if (seasonErr || !season) throw new Error("No current season configured.");

  const {data:teams,error:teamErr}=await client.from("teams").select("id,abbreviation");
  if (teamErr) throw teamErr;
  const teamIds = Object.fromEntries((teams||[]).map((t:any)=>[t.abbreviation,t.id]));

  const nbaUrl=process.env.NBA_CDN_SCHEDULE_URL || "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json";
  const fixtureUrl=process.env.FIXTUREDOWNLOAD_URL || "https://fixturedownload.com/feed/json/nba-2026";

  let raws:RawGame[]=[];
  let used="";
  const errors:string[]=[];

  if(sourcePreference==="nba"){
    try{raws=await fetchNbaCdn(nbaUrl);used="nba-cdn"}catch(e:any){errors.push(`nba: ${e?.name==="AbortError"?"timeout":e?.message||String(e)}`)}
  }else if(sourcePreference==="fixture"){
    try{raws=await fetchFixtureDownload(fixtureUrl);used="fixturedownload"}catch(e:any){errors.push(`fixture: ${e?.name==="AbortError"?"timeout":e?.message||String(e)}`)}
  }else{
    // Fetch both sources concurrently so a slow/blocked source cannot consume the full serverless timeout.
    const [nba,fixture]=await Promise.allSettled([fetchNbaCdn(nbaUrl),fetchFixtureDownload(fixtureUrl)]);
    if(nba.status==="fulfilled"&&nba.value.length){raws=nba.value;used="nba-cdn"}
    else if(fixture.status==="fulfilled"&&fixture.value.length){raws=fixture.value;used="fixturedownload"}
    if(nba.status==="rejected")errors.push(`nba: ${nba.reason?.name==="AbortError"?"timeout":nba.reason?.message||String(nba.reason)}`);
    if(fixture.status==="rejected")errors.push(`fixture: ${fixture.reason?.name==="AbortError"?"timeout":fixture.reason?.message||String(fixture.reason)}`);
  }

  if (!raws.length) throw new Error(`No schedule source succeeded. ${errors.join(" | ")}`);

  const start = new Date(`${season.start_date}T00:00:00Z`);
  const end = new Date(`${season.end_date}T23:59:59Z`);
  let skipped=0;

  const rows:any[]=[];
  for (const g of raws) {
    const dt = new Date(g.utc);
    if (!Number.isFinite(dt.getTime()) || dt < start || dt > end) { skipped++; continue; }

    const ha = normalizeAbbr(g.home), aa = normalizeAbbr(g.away);
    if (!teamIds[ha] || !teamIds[aa]) { skipped++; continue; }

    const day = easternDay(dt.toISOString());
    rows.push({
      season_id:season.id,
      source_key:`${day}_${aa}_${ha}`,
      external_id:g.externalId || null,
      game_date:dt.toISOString(),
      game_day:day,
      stage:g.stage || "Regular Season",
      home_team_id:teamIds[ha],
      away_team_id:teamIds[aa],
      // Shared schedule rows never contain a user's MyNBA result.
      home_score:null,
      away_score:null,
      status:"scheduled",
      venue:g.venue || null,
      broadcast:g.broadcast || null,
      data_source:g.source,
      counts_toward_standings:g.countsTowardStandings !== false
    });
  }

  // One PostgREST request per batch instead of one request per game.
  // This is what prevents Netlify's schedule-sync route from timing out on ~1,200 games.
  let imported=0;
  for (const batch of chunk(rows, UPSERT_BATCH_SIZE)) {
    const {error}=await client.from("games").upsert(batch,{onConflict:"source_key"});
    if(error)throw error;
    imported+=batch.length;
  }

  const {error:logErr}=await client.from("schedule_sync_log").insert({
    source:used,
    imported_count:imported,
    skipped_count:skipped,
    errors
  });
  if(logErr)errors.push(`sync-log: ${logErr.message}`);

  return {source:used,imported,skipped,errors};
}
