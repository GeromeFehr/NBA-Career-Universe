import {findFootballLeague,footballSearchKey,footballLeagues} from "./football-catalog";

export const footballCompetitionEdition="EA FC 27";
export const footballCompetitionSources=[
 "https://www.ea.com/de/games/ea-sports-fc/fc-27/news/fc-27-authenticity",
 "https://fifauteam.com/fc-27-tournaments/",
] as const;
export const footballStages=["league","cup","international","friendly","playoff"] as const;
export type FootballStage=typeof footballStages[number];
export type FootballCompetition={name:string;stage:FootballStage;leagueIds?:string[];gender:"men"|"women";aliases?:string[]};

// Domestic names are the FC27 tournament names, including its new Copa MX.
// Do not infer in-game competitions from a country's real-world cup calendar.
const cup=(name:string,leagueIds:string[],aliases:string[]=[]):FootballCompetition=>({name,stage:"cup",leagueIds,gender:"men",aliases});
export const footballCompetitions:FootballCompetition[]=[
 cup("Österreich-Pokal",["80"],["ÖFB-Cup"]),
 cup("Coupe Belgique",["4"],["Croky Cup","Belgischer Pokal"]),
 cup("Pokalen",["1"],["DBU Pokalen","Dänischer Pokal"]),
 cup("Emirates FA Cup",["13","14","60","61"],["FA Cup"]),
 cup("Carabao Cup",["13","14","60","61"],["EFL Cup"]),
 // FC27 manager-career gameplay: https://rutube.ru/video/6f7a2f6c4e97923c14e9f070af8f0c8d/
 cup("FA Community Shield",["13","14","60","61"],["Community Shield"]),
 cup("EFL Trophy",["60","61"],["Vertu Trophy"]),
 cup("Coupe de France",["16","17"]),
 cup("DFB-Pokal",["19","20","2076"]),
 cup("FAI Cup",["65"]),
 cup("Coppa Italia",["31","32"]),
 cup("Copa MX",["341"]),
 cup("Oranje Beker",["10"],["KNVB Beker","KNVB-Pokal"]),
 cup("NM",["41"],["Norgesmesterskapet","Norwegischer Pokal"]),
 cup("Puchar Kraju",["66"],["Puchar Polski","Polnischer Pokal"]),
 cup("Taça de Portugal",["308"]),
 cup("Cupa Națională",["330"],["Cupa României"]),
 cup("Scottish Cup",["50"]),
 cup("Copa de España",["53","54"],["Copa del Rey"]),
 cup("Sveriges Cup",["56"],["Svenska Cupen"]),
 cup("Schweizer Pokal",["189"],["Schweizer Cup"]),
 cup("Türk Kupasi",["68"],["Türkiye Kupası","Türkischer Pokal"]),
 cup("US Open Cup",["39"],["U.S. Open Cup"]),
 ...["UEFA Champions League","UEFA Europa League","UEFA Conference League","UEFA Super Cup","CONMEBOL Libertadores","CONMEBOL Sudamericana","CONMEBOL Recopa"].map(name=>({name,stage:"international" as const,gender:"men" as const})),
 {name:"UEFA Women's Champions League",stage:"international",gender:"women",aliases:["UEFA Women’s Champions League"]},
 {name:"Women's International Cup",stage:"international",gender:"women",aliases:["Women’s International Cup","Women's Intl. Cup"]},
];

export function findFootballCompetition(value:string){const key=footballSearchKey(value);return footballCompetitions.find(c=>[c.name,...c.aliases||[]].some(name=>footballSearchKey(name)===key));}
export function footballCompetitionStage(value:string):FootballStage|undefined{return findFootballCompetition(value)?.stage||(footballLeagues.some(l=>footballSearchKey(l.name)===footballSearchKey(value))?"league":undefined);}
export function competitionsForFootballLeague(league:string,stage:FootballStage):string[]{
 const selected=findFootballLeague(league),gender=selected?.gender||"men";
 if(stage==="league")return selected?.id==="341"?[selected.name,"Liga BBVA MX Apertura","Liga BBVA MX Clausura"]:[selected?.name||league].filter(Boolean);
 if(stage==="cup")return footballCompetitions.filter(c=>c.stage==="cup"&&c.gender===gender&&c.leagueIds?.includes(selected?.id||"")).map(c=>c.name);
 if(stage==="international"){
  const continental=selected?.kind==="continental"||selected?.country==="Argentinien";
  return footballCompetitions.filter(c=>c.stage===stage&&c.gender===gender).sort((a,b)=>continental?Number(b.name.startsWith("CONMEBOL"))-Number(a.name.startsWith("CONMEBOL")):0).map(c=>c.name);
 }
 return [];
}
