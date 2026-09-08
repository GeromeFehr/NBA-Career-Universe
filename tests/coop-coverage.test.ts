import test from "node:test";
import assert from "node:assert/strict";
import {comparisonStats,ensureCoopComparisons,type CoopMediaCanon} from "../lib/coop-coverage";

const row=(id:string,date:string,points:number,status="played",season="s")=>({id,appearance_status:status,points,rebounds:12,assists:5,steals:1,blocks:2,fgm:10,fga:20,games:{season_id:season,game_day:date}});
test("comparison uses the covered season and date, excluding future results and missed games from averages",()=>{
 const stats=comparisonStats([row("a","2026-10-20",20),row("b","2026-10-21",30),row("c","2026-10-22",100,"dnp"),row("d","2026-10-23",99),row("e","2026-10-19",90,"played","old")],"s","2026-10-22");
 assert.equal(stats.season.games,2);assert.equal(stats.season.PPG,25);assert.equal(stats.last5.games,2);
 assert.equal(stats.latest[0].status,"dnp");assert.equal(stats.latest[0].points,null);
});

const background={is_rookie:true,draft_status:"drafted",draft_year:2026,draft_pick:2,draft_round:1};
function canon():CoopMediaCanon{return {as_of:"2026-10-22",season_id:"s",both_rookies:true,players:[
 {name:"Alex Walker",position:"C",background,stats:comparisonStats([row("a","2026-10-20",20)],"s","2026-10-22")},
 {name:"Fabian Miller",position:"SG",background:{...background,draft_status:"undrafted",draft_pick:null,draft_round:null},stats:comparisonStats([row("b","2026-10-20",30)],"s","2026-10-22")}
],shared_games:[]};}
const items=()=>Array.from({length:6},(_,i)=>({headline:"Individual report "+i,body:"Saved performance",kind:i?"social":"recap"}));
test("game packs include two comparisons without increasing pack size or replacing the recap",()=>{
 const result=ensureCoopComparisons(items(),canon(),"de",2);
 assert.equal(result.length,6);assert.equal(result[0].headline,"Individual report 0");
 assert.equal(result.filter(p=>p.headline.includes("Alex Walker")&&p.headline.includes("Fabian Miller")).length,2);
 assert.ok(result[5].headline.includes("Rookie-Vergleich"));
 assert.notEqual(result[5].body,result[4].body);
 assert.deepEqual(ensureCoopComparisons(result,canon(),"de",2),result);
 assert.deepEqual(ensureCoopComparisons(items(),null,"de",2),items());
});
test("missing peer data stays unknown and comparisons stop rookie framing after a season transition",()=>{
 const context=canon();context.both_rookies=false;context.players[1].background.is_rookie=false;
 context.players[1].stats=comparisonStats([],"s",context.as_of);
 const result=ensureCoopComparisons(items(),context,"en",1);
 assert.ok(!/rookie/i.test(result[5].headline));
 assert.match(result[5].body,/Missing entries are not missed games/);
 assert.ok(!result[5].body.includes("0 PPG"));
 assert.equal(result.filter(p=>p.headline.includes("Alex Walker")).length,1);
});
