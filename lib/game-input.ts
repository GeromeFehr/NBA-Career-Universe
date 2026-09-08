export const statKeys=["minutes","points","rebounds","assists","steals","blocks","turnovers","fouls","technical_fouls","flagrant_fouls","fgm","fga","tpm","tpa","ftm","fta","plus_minus"] as const;
export const statLabels:Record<string,string>={minutes:"MIN",points:"PTS",rebounds:"REB",assists:"AST",steals:"STL",blocks:"BLK",turnovers:"TO",fouls:"PF",technical_fouls:"TECH",flagrant_fouls:"FLG",fgm:"FGM",fga:"FGA",tpm:"3PM",tpa:"3PA",ftm:"FTM",fta:"FTA",plus_minus:"+/-"};
export class InputError extends Error {constructor(public code:string){super(code);}}
export function finiteNumber(value:unknown,min=0,max=100000,integer=true){
 if(value===null||value===""||typeof value==="boolean"||value===undefined)throw new InputError("MISSING_VALUES");
 const n=Number(value);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new InputError("INVALID_VALUES");return n;
}
export function validDate(value:unknown):string {const s=String(value||"");if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw new InputError("INVALID_DATE");return s;}
export function uuid(value:unknown):string {const s=String(value||"");if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s))throw new InputError("INVALID_ID");return s;}
export function cleanText(value:unknown,max=12000):string|null {if(value==null||value==="")return null;if(typeof value!=="string"||value.length>max)throw new InputError("TEXT_TOO_LONG");return value.trim()||null;}
export function parseGameInput(b:any){
 const gameId=uuid(b.gameId),homeScore=finiteNumber(b.homeScore,0,9999),awayScore=finiteNumber(b.awayScore,0,9999);
 if(homeScore===awayScore)throw new InputError("INVALID_SCORE");
 const status=b.appearanceStatus||"played";if(!["played","dnp_injury","dnp_coach","suspended","inactive"].includes(status))throw new InputError("INVALID_STATUS");
 const values={} as Record<typeof statKeys[number],number>;
 for(const k of statKeys)values[k]=status!=="played"?0:finiteNumber(b.stats?.[k]??(k==="technical_fouls"||k==="flagrant_fouls"?0:undefined),k==="plus_minus"?-9999:0,k==="minutes"?1440:100000,k!=="minutes");
 if(values.fgm>values.fga||values.tpm>values.tpa||values.ftm>values.fta||values.tpm>values.fgm||values.tpa>values.fga)throw new InputError("INVALID_SHOOTING");
 if(values.points!==values.fgm*2+values.tpm+values.ftm)throw new InputError("POINTS_MISMATCH");
 const notables=(cleanText(b.notableText,12000)||"").split(/\r?\n/).filter(s=>s.trim()).map(line=>{const [player_name,team_abbreviation,...rest]=line.split("|").map(x=>x.trim());if(!player_name||!team_abbreviation||rest.length===0)throw new InputError("INVALID_NOTABLES");return {player_name:cleanText(player_name,120)!,team_abbreviation:cleanText(team_abbreviation,5)!,note:rest.join(" | ")};});
 if(notables.length>50)throw new InputError("TEXT_TOO_LONG");
 return {gameId,homeScore,awayScore,expectedUpdatedAt:b.expectedUpdatedAt||null,notables,stat:{...values,appearance_status:status,started:status==="played"&&b.started===true,fouled_out:status==="played"&&(b.fouledOut===true||values.fouls>=6),ejected:b.ejected===true,injured:b.injured===true||status==="dnp_injury",injury_note:cleanText(b.injuryNote,2000),story_notes:cleanText(b.storyNotes)}};
}
