import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {footballValidationIssues,FootballValidationError,localizeFootballIssues,validateFootballInput} from "../lib/football-validation";
import {footballCompetitions,footballCompetitionEdition,footballCompetitionSources,competitionsForFootballLeague,footballCompetitionStage} from "../lib/football-competitions";
import {FootballCompetitionFields} from "../components/FootballCatalogFields";
import {FootballErrorsContext,FCLabel} from "../components/FootballFieldErrors";

const match={season_id:"11111111-1111-4111-8111-111111111111",match_date:"2027-07-01",competition:"UEFA Champions League",stage:"international",home_club:"Juventus",away_club:"AS Monaco",tracked_club:"Juventus",status:"completed",home_score:7,away_score:1,player_stats:{appearance:"played",minutes:92,goals:1,assists:4,shots:5,shots_on_target:4,rating:10}};
test("FC27 catalog includes its domestic cups, including Copa MX, and uses only FC27 source URLs",()=>{
 assert.equal(footballCompetitionEdition,"EA FC 27");assert.ok(footballCompetitionSources.every(url=>url.includes("fc-27")&&!url.includes("fc-26")));
 assert.deepEqual(competitionsForFootballLeague("Bundesliga","cup"),["DFB-Pokal"]);assert.deepEqual(competitionsForFootballLeague("2. Bundesliga","cup"),["DFB-Pokal"]);
 assert.deepEqual(competitionsForFootballLeague("Serie A","cup"),["Coppa Italia"]);assert.deepEqual(competitionsForFootballLeague("Liga BBVA MX","cup"),["Copa MX"]);
 assert.deepEqual(competitionsForFootballLeague("Premier League","cup"),["Emirates FA Cup","Carabao Cup"]);assert.deepEqual(competitionsForFootballLeague("EFL League Two","cup"),["Emirates FA Cup","Carabao Cup","EFL Trophy"]);
 assert.equal(new Set(footballCompetitions.map(c=>c.name)).size,footballCompetitions.length);assert.ok(!footballCompetitions.some(c=>c.name==="FIFA Club World Cup"));
});
test("international competitions stay international and women's careers receive women's competitions",()=>{
 const men=competitionsForFootballLeague("Bundesliga","international");for(const name of ["UEFA Champions League","UEFA Europa League","UEFA Conference League","UEFA Super Cup","CONMEBOL Libertadores","CONMEBOL Sudamericana","CONMEBOL Recopa"])assert.ok(men.includes(name));
 assert.deepEqual(competitionsForFootballLeague("WSL","international"),["UEFA Women's Champions League","Women's International Cup"]);assert.deepEqual(competitionsForFootballLeague("Frauen-Bundesliga","cup"),[]);
 assert.equal(footballCompetitionStage("UEFA Champions League"),"international");assert.equal(footballCompetitionStage("Copa del Rey"),"cup");assert.equal(footballCompetitionStage("My custom cup"),undefined);
 assert.equal(competitionsForFootballLeague("CONMEBOL Libertadores","international")[0],"CONMEBOL Libertadores");
});
test("competition selectors preserve saved names and expose each option for the selected category",()=>{
 const cup=renderToStaticMarkup(createElement(FootballCompetitionFields,{league:"Premier League",stage:"cup",value:"FA Cup"}));assert.ok(cup.includes('value="FA Cup" selected=""'));assert.ok(cup.includes('value="Carabao Cup"'));assert.ok(!cup.includes('value="UEFA Champions League"'));
 const international=renderToStaticMarkup(createElement(FootballCompetitionFields,{league:"Bundesliga",stage:"international",value:"UEFA Champions League"}));assert.ok(international.includes('value="UEFA Conference League"'));assert.ok(international.includes('value="UEFA Europa League"'));
 const custom=renderToStaticMarkup(createElement(FootballCompetitionFields,{league:"My league",stage:"cup",value:"My custom cup"}));assert.ok(custom.includes('name="competition"'));assert.ok(custom.includes('value="My custom cup"'));assert.ok(custom.includes("FC27"));
});
test("validation collects separate date, minute, rating, goal and shot errors in one response",()=>{
 const issues=footballValidationIssues("match",{...match,match_date:"2027-02-30",shots:2,shots_on_target:5,player_stats:{...match.player_stats,minutes:151,rating:11,goals:5,assists:4,shots:1,shots_on_target:3}},{mode:"player"});
 for(const field of ["match_date","stats.minutes","stats.rating","stats.goals","stats.assists","stats.shots_on_target","shots_on_target"])assert.ok(issues.some(issue=>issue.field===field),field);
 assert.ok(issues.find(issue=>issue.field==="stats.goals")?.message[0].includes("nur 7 Tore"));assert.ok(issues.find(issue=>issue.field==="stats.shots_on_target")?.message[0].includes("(1)"));
 const localized=localizeFootballIssues(issues,true);assert.ok(localized.find(issue=>issue.field==="stats.minutes")?.message.includes("0 to 150"));
 assert.throws(()=>validateFootballInput("match",{...match,player_stats:{...match.player_stats,minutes:151}},{mode:"player"}),error=>error instanceof FootballValidationError&&error.code==="INVALID_FC_MINUTES"&&error.issues[0].field==="stats.minutes");
 assert.deepEqual(footballValidationIssues("match",match,{mode:"player"}),[]);
});
test("penalty and category errors identify the exact fields and do not mistake stoppage time for extra time",()=>{
 const wrongType=footballValidationIssues("match",{...match,stage:"cup"},{mode:"player"});assert.equal(wrongType[0].field,"stage");assert.ok(wrongType[0].message[0].includes("International"));
 const missing=footballValidationIssues("match",{...match,home_score:1,away_score:1,home_penalties:4,player_stats:{appearance:"bench"}},{mode:"player"});assert.ok(missing.some(issue=>issue.field==="away_penalties"));
 const tied=footballValidationIssues("match",{...match,home_score:1,away_score:1,home_penalties:4,away_penalties:4,player_stats:{appearance:"bench"}},{mode:"player"});assert.ok(tied.some(issue=>issue.field==="home_penalties"));assert.ok(tied.some(issue=>issue.field==="away_penalties"));
 assert.deepEqual(footballValidationIssues("match",{...match,competition:"Bundesliga",stage:"league"},{mode:"player"}),[]);
});
test("season, roster, squad and transfer forms collect field-specific problems",()=>{
 const season=footballValidationIssues("season",{name:"2027/28",league:"Bundesliga",start_date:"2027-06-01",end_date:"2027-05-01",clubs:"Beta\nBeta"},{club:"Alpha",currentDate:"2027-07-01"});for(const field of ["start_date","end_date","clubs"])assert.ok(season.some(issue=>issue.field===field));assert.ok(season.find(issue=>issue.message[0].includes("doppelt")));assert.ok(season.find(issue=>issue.message[0].includes("Alpha")));
 const squad=footballValidationIssues("squad",{name:"Alex",position:"ST",overall:100,age:10,weekly_wage:-1});for(const field of ["overall","age","weekly_wage"])assert.ok(squad.some(issue=>issue.field===field));
 const transfer=footballValidationIssues("transfer",{direction:"in",kind:"permanent",player_name:"Alex",from_club:"Alpha",transfer_date:"bad",fee:200,contract_until:"bad"},{club:"Alpha",budget:100});for(const field of ["from_club","transfer_date","fee","contract_until"])assert.ok(transfer.some(issue=>issue.field===field));assert.ok(transfer.find(issue=>issue.field==="fee")?.message[0].includes("100 €"));
});
test("invalid controls expose an accessible error description while valid controls stay unmarked",()=>{
 const html=renderToStaticMarkup(createElement(FootballErrorsContext.Provider,{value:[{field:"stats.minutes",message:"Minuten: ganze Zahl von 0 bis 150 erforderlich."}]},createElement(FCLabel,{name:"stats.minutes",label:"Minuten",children:createElement("input",{name:"stats.minutes",type:"number",defaultValue:151})})));
 assert.ok(html.includes('aria-invalid="true"'));const description=html.match(/aria-describedby="([^"]+)"/)?.[1];assert.ok(description);assert.ok(html.includes(`id="${description}"`));assert.ok(html.includes("fcFieldError"));
 const valid=renderToStaticMarkup(createElement(FCLabel,{name:"home_score",label:"Tore",children:createElement("input",{name:"home_score",defaultValue:7})}));assert.ok(!valid.includes("aria-invalid"));assert.ok(!valid.includes("fcFieldError"));
});
