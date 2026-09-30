import test from "node:test";
import assert from "node:assert/strict";
import {footballClubs,footballLeagues,findFootballLeague,findFootballClub,clubsForFootballLeague,footballLeagueClubNames} from "../lib/football-catalog";
import {parseFootballCreate,generateFootballSchedule,clubsFromText} from "../lib/football";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {FootballLeagueClubFields,FootballClubField} from "../components/FootballCatalogFields";

test("EAFC catalog has unique clubs and complete, reciprocal league memberships",()=>{
 assert.equal(footballClubs.length,769);assert.equal(new Set(footballClubs.map(club=>club.id)).size,769);
 assert.equal(footballLeagues.length,43);assert.equal(footballLeagues.filter(league=>league.kind==="league").length,39);
 for(const league of footballLeagues){assert.equal(new Set(league.clubs).size,league.clubs.length);for(const id of league.clubs){const club=footballClubs.find(club=>club.id===id);assert.ok(club,`${league.name}: missing ${id}`);assert.equal(club.gender,league.gender);assert.ok(club.leagues.includes(league.id));}}
 for(const club of footballClubs){assert.ok(club.name.length>0&&club.name.length<=100);assert.ok(club.leagues.length);for(const id of club.leagues)assert.ok(footballLeagues.find(league=>league.id===id)?.clubs.includes(club.id));if(club.badge)assert.equal(new URL(club.badge).hostname,"drop-assets.ea.com");}
});
test("major leagues, women's leagues and supplemental clubs are available",()=>{
 for(const [league,count] of [["Bundesliga",18],["2. Bundesliga",18],["3. Liga",20],["Premier League",20],["MLS",30],["Liga Profesional de Fútbol",30],["Liga F",16],["WSL",14],["ISL",13]] as const)assert.equal(clubsForFootballLeague(league).length,count,league);
 for(const club of ["Jamshedpur FC","Flamengo","Vasco da Gama","AFC Richmond Women","United Tigers SC"])assert.ok(findFootballClub(club),club);
 assert.equal(findFootballClub("Arsenal","Premier League")?.gender,"men");assert.equal(findFootballClub("Arsenal","WSL")?.gender,"women");assert.notEqual(findFootballClub("Arsenal","Premier League")?.id,findFootballClub("Arsenal","WSL")?.id);
 assert.equal(findFootballClub("Manchester United")?.id,"11");assert.equal(findFootballClub("Borussia Monchengladbach")?.id,"23");assert.equal(findFootballLeague("MLS")?.id,"39");
});
test("catalog rosters preserve a save's club name and never duplicate its alias",()=>{
 const names=footballLeagueClubNames("Bundesliga","Eintracht Frankfurt");assert.equal(names.length,18);assert.ok(names.includes("Eintracht Frankfurt"));assert.ok(!names.includes("Frankfurt"));
 const custom=footballLeagueClubNames("Bundesliga","My created club");assert.equal(custom.length,19);assert.equal(custom[0],"My created club");assert.deepEqual(footballLeagueClubNames("My league","My club"),["My club"]);
});
test("30-club careers and league schedules accept the full MLS and Argentina roster",()=>{
 for(const league of ["MLS","Liga Profesional de Fútbol"]){const names=footballLeagueClubNames(league),club=names[0],created=parseFootballCreate({name:"Career",mode:"player",person_name:"Alex",club_name:club,league,clubs:names.join("\n"),universe_date:"2026-07-01",end_date:"2027-06-30",season_name:"2026/27"});assert.equal(created.clubs.length,30);const fixtures=generateFootballSchedule(names,created.universe_date,created.end_date,league,club);assert.equal(fixtures.length,870);assert.equal(fixtures.filter(match=>match.home_club===club||match.away_club===club).length,58);}
 assert.throws(()=>clubsFromText(Array.from({length:41},(_,i)=>`Club ${i}`).join("\n")));
});

test("career fields include the selected league roster; imported and custom club names survive prefilling",()=>{
 const html=renderToStaticMarkup(createElement(FootballLeagueClubFields,{league:"MLS",club:"Inter Miami CF",includeClubs:true}));
 assert.match(html,/name="league"/);assert.match(html,/name="club_name"/);assert.match(html,/name="clubs"/);assert.match(html,/Inter Miami CF/);assert.match(html,/San Diego FC/);assert.match(html,/Frauenfußball/);
 const custom=renderToStaticMarkup(createElement(FootballLeagueClubFields,{league:"Custom League",club:"Created FC",includeClubs:true}));assert.match(custom,/name="league"[^>]*value="Custom League"/);assert.match(custom,/name="club_name"[^>]*value="Created FC"/);
 const scan=renderToStaticMarkup(createElement(FootballClubField,{name:"away_club",label:"Away",value:"Screenshot United",league:"Bundesliga"}));assert.match(scan,/name="away_club"[^>]*value="Screenshot United"/);assert.match(scan,/Borussia Dortmund/);
});
