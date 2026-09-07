export type StatRow = Record<string, any>;

function playedRows(rows:StatRow[]){
  return rows.filter(r=>r.appearance_status==="played");
}

function doubleDigitCategories(r:StatRow){
  return ["points","rebounds","assists","steals","blocks"]
    .filter(k=>Number(r[k]||0)>=10).length;
}

export function summarizeCareerMarks(rows:StatRow[]){
  const played=playedRows(rows);
  const max=(k:string)=>played.reduce((a,r)=>Math.max(a,Number(r[k]||0)),0);
  const count=(fn:(r:StatRow)=>boolean)=>played.filter(fn).length;

  return {
    games:played.length,
    careerHighPoints:max("points"),
    careerHighRebounds:max("rebounds"),
    careerHighAssists:max("assists"),
    careerHighSteals:max("steals"),
    careerHighBlocks:max("blocks"),
    doubleDoubles:count(r=>doubleDigitCategories(r)>=2),
    tripleDoubles:count(r=>doubleDigitCategories(r)>=3),
    games20Plus:count(r=>Number(r.points||0)>=20),
    games30Plus:count(r=>Number(r.points||0)>=30),
    games40Plus:count(r=>Number(r.points||0)>=40),
    games50Plus:count(r=>Number(r.points||0)>=50),
    games60Plus:count(r=>Number(r.points||0)>=60),
    games70Plus:count(r=>Number(r.points||0)>=70)
  };
}

export function summarizeStats(rows: StatRow[]) {
  const played = playedRows(rows);
  const n = played.length;
  const sum = (k:string) => played.reduce((a,r)=>a + Number(r[k] || 0),0);
  const max = (k:string) => played.reduce((a,r)=>Math.max(a,Number(r[k]||0)),0);
  return {
    games: n,
    ppg: n ? sum("points")/n : 0,
    rpg: n ? sum("rebounds")/n : 0,
    apg: n ? sum("assists")/n : 0,
    spg: n ? sum("steals")/n : 0,
    bpg: n ? sum("blocks")/n : 0,
    mpg: n ? sum("minutes")/n : 0,
    fg: sum("fga") ? sum("fgm")/sum("fga") : 0,
    tp: sum("tpa") ? sum("tpm")/sum("tpa") : 0,
    ft: sum("fta") ? sum("ftm")/sum("fta") : 0,
    careerHighPoints: max("points"),
    careerHighRebounds: max("rebounds"),
    careerHighAssists: max("assists"),
    careerHighSteals: max("steals"),
    careerHighBlocks: max("blocks")
  };
}

export function performanceScore(s: StatRow) {
  const fgBonus = Number(s.fga) ? (Number(s.fgm)/Number(s.fga)-0.45)*25 : 0;
  const value =
    Number(s.points)*0.55 + Number(s.rebounds)*0.45 + Number(s.assists)*0.6 +
    Number(s.steals)*1.4 + Number(s.blocks)*1.5 - Number(s.turnovers)*1.2 -
    Number(s.fouls)*0.25 + Number(s.plus_minus || 0)*0.08 + fgBonus;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function headlineFacts(s: StatRow) {
  const facts:string[] = [];
  if (s.points >= 50) facts.push(`${s.points}-Punkte-Explosion`);
  else if (s.points >= 40) facts.push(`${s.points} Punkte`);
  if (s.rebounds >= 20) facts.push(`${s.rebounds} Rebounds`);
  if (s.assists >= 15) facts.push(`${s.assists} Assists`);
  if (s.blocks >= 10) facts.push(`${s.blocks} Blocks`);
  else if (s.blocks >= 5) facts.push(`${s.blocks} Blocks`);
  if (s.fouled_out) facts.push("ausgefoult");
  if (s.ejected) facts.push("Ejection");
  if (s.injured) facts.push("Verletzung");
  return facts;
}
