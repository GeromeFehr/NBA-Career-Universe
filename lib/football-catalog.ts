import catalog from "../data/football-catalog.json";

export type FootballGender = "men" | "women";
export type FootballLeague = {id:string;name:string;country:string;gender:FootballGender;kind:"league"|"continental"|"rest";clubs:string[]};
export type FootballClub = {id:string;name:string;country:string;gender:FootballGender;badge:string|null;leagues:string[];aliases:string[]};
export const footballCatalog = {edition:catalog.edition,updated:catalog.updated,sources:catalog.sources};
export const footballLeagues = (catalog.leagues as FootballLeague[]).slice().sort((a,b)=>a.gender.localeCompare(b.gender)||a.country.localeCompare(b.country,"de")||a.name.localeCompare(b.name,"de"));
export const footballClubs = (catalog.clubs as FootballClub[]).slice().sort((a,b)=>a.name.localeCompare(b.name,"de"));
const clubsById = new Map(footballClubs.map(club=>[club.id,club]));
export function footballSearchKey(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
const leagueAliases:Record<string,string[]>={"20":["2. Bundesliga"],"31":["Serie A"],"32":["Serie B"],"39":["MLS"],"53":["La Liga","LaLiga"],"54":["LaLiga 2"],"2215":["Frauen-Bundesliga"],"2216":["WSL","Women’s Super League"],"2221":["National Women's Soccer League"],"2222":["Liga F"]};
export function findFootballLeague(value:string):FootballLeague|undefined{const key=footballSearchKey(value);return footballLeagues.find(league=>league.id===value||footballSearchKey(league.name)===key||(leagueAliases[league.id]||[]).some(alias=>footballSearchKey(alias)===key));}
export function clubsForFootballLeague(value:string):FootballClub[]{const league=findFootballLeague(value);return league?league.clubs.map(id=>clubsById.get(id)!).sort((a,b)=>a.name.localeCompare(b.name,"de")):[];}
export function findFootballClub(value:string,league?:string):FootballClub|undefined{
 const key=footballSearchKey(value),scope=league?clubsForFootballLeague(league):[];
 const matches=(club:FootballClub)=>club.id===value||[club.name,...club.aliases].some(name=>footballSearchKey(name)===key);
 return scope.find(matches)||footballClubs.find(matches);
}
// Custom save names stay valid; reading the catalog never rewrites stored history.
export function footballLeagueClubNames(league:string,tracked?:string):string[]{const names=clubsForFootballLeague(league).map(club=>club.name);return tracked&&!names.includes(tracked)?[tracked,...names.filter(name=>findFootballClub(name,league)?.id!==findFootballClub(tracked,league)?.id)]:names;}
export function footballLeagueLabel(league:FootballLeague,en=false){return `${league.country} · ${en?league.name.replace("Rest der Welt","Rest of World").replace("Frauen","Women").replace("Männer","Men"):league.name}`;}
