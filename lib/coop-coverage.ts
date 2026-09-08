import {summarizeStats,type StatRow} from "./stats";
import {draftLabel} from "./career-background";

export function comparisonStats(rows:StatRow[],seasonId:string,asOf:string){
 const eligible=rows.filter(r=>r.games?.season_id===seasonId&&r.games.game_day<=asOf)
  .sort((a,b)=>b.games.game_day.localeCompare(a.games.game_day)||String(a.id).localeCompare(String(b.id)));
 const compact=(list:StatRow[])=>{const s=summarizeStats(list);return {games:s.games,PPG:+s.ppg.toFixed(1),RPG:+s.rpg.toFixed(1),APG:+s.apg.toFixed(1),SPG:+s.spg.toFixed(1),BPG:+s.bpg.toFixed(1),FG_pct:+(s.fg*100).toFixed(1)};};
 return {season:compact(eligible),last5:compact(eligible.filter(r=>r.appearance_status==="played").slice(0,5)),latest:eligible.slice(0,2).map(r=>({date:r.games.game_day,status:r.appearance_status,team:r.team_id,points:r.appearance_status==="played"?r.points:null,rebounds:r.appearance_status==="played"?r.rebounds:null,assists:r.appearance_status==="played"?r.assists:null}))};
}

export type CoopMediaCanon={as_of:string;season_id:string;both_rookies:boolean;players:{name:string;position:string|null;background:{is_rookie:boolean|null;draft_status:string;draft_year:number|null;draft_pick:number|null;draft_round:number|null};stats:ReturnType<typeof comparisonStats>}[];shared_games:unknown[]};

export const coopCoverageRules=`When co_op is present, make comparisons between BOTH named players a recurring editorial thread: at least two items per game pack (one expert/analysis/debate and one social reaction), or one item in a daily pack. Use both full player names in comparison items. Rotate Scoring, Playmaking, Defense, Efficiency, recent form and draft expectations; use recent headlines to avoid repeating yesterday's angle. Only call this a rookie comparison if co_op.both_rookies is true. Otherwise frame it as a career comparison without the word rookie. Use each player's supplied draft origin; unknown is not undrafted. Compare averages with appearance counts, not raw totals when sample sizes differ. No recorded games means missing data, not DNP or poor play. Stats cover all recorded stages in the supplied season through as_of only; they are not official league-wide regular-season standings. Shared games whose date differs from the covered game are historical encounters, never tonight's matchup; never invent future games, league rankings, award standings, quotes or personal hostility. A direct duel or teammate performance is only established by shared_games, not by comparing separate fixtures. Rivalry is an editorial debate, not a claim that the players dislike each other. Keep individual game coverage too.`;

/** A factual local fallback guarantees regular comparisons without another paid request. */
export function ensureCoopComparisons<T extends {headline:string;body:string}>(items:T[],canon:CoopMediaCanon|null,language:"de"|"en",minimum:number){
 if(!canon||canon.players.length!==2)return items;
 const [a,b]=canon.players,en=language==="en";
 const compared=(item:T)=>canon.players.every(p=>(item.headline+" "+item.body).toLocaleLowerCase().includes(p.name.toLocaleLowerCase()));
 const missing=Math.max(0,minimum-items.filter(compared).length);
 if(!missing)return items;
 const x=a.stats.season,y=b.stats.season;
 const sample=en?`${a.name}: ${x.games} recorded appearances. ${b.name}: ${y.games}.`:`${a.name}: ${x.games} erfasste Einsätze. ${b.name}: ${y.games}.`;
 const angles=[
  `${a.name}: ${x.PPG} PPG · ${x.RPG} RPG. ${b.name}: ${y.PPG} PPG · ${y.RPG} RPG.`,
  `Playmaking: ${a.name} ${x.APG} APG; ${b.name} ${y.APG} APG.`,
  `Defense: ${a.name} ${x.SPG} SPG · ${x.BPG} BPG; ${b.name} ${y.SPG} SPG · ${y.BPG} BPG.`,
  `Efficiency: ${a.name} ${x.FG_pct}% FG; ${b.name} ${y.FG_pct}% FG.`,
  `${a.name}: ${draftLabel(a.background,language)}. ${b.name}: ${draftLabel(b.background,language)}.`,
  `${en?"Last five appearances at most":"Höchstens die letzten fünf Einsätze"}: ${a.name} ${a.stats.last5.PPG} PPG (${a.stats.last5.games}); ${b.name} ${b.stats.last5.PPG} PPG (${b.stats.last5.games}).`
 ];
 const available=items.map((item,i)=>!compared(item)?i:-1).filter(i=>i>=0).reverse();
 const result=[...items];
 for(let i=0;i<missing&&i<available.length;i++){
  const detail=x.games&&y.games?angles[(x.games+y.games+i)%angles.length]:(en?"A performance comparison needs recorded appearances from both players. Missing entries are not missed games.":"Ein Leistungsvergleich braucht erfasste Einsätze beider Spieler. Fehlende Einträge sind keine ausgefallenen Spiele.");
  const question=en?"Who will sustain it over the next games?":"Wer bestätigt seine Leistung in den nächsten Spielen?";
  result[available[i]]={...result[available[i]],outlet:i===0?"Career Universe":"Social",kind:i===0?"expert":"social",author_name:i===0?"Tess Morgan":"@ReceiptCollector",tone:en?"analytical":"analytisch",headline:`${a.name} & ${b.name}: ${canon.both_rookies?(en?"the rookie comparison":"der Rookie-Vergleich"):(en?"two careers in comparison":"zwei Karrieren im Vergleich")}`,body:`${sample} ${detail} ${question}`,virality:55};
 }
 return result;
}
