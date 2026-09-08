import assert from "node:assert/strict";
import test from "node:test";
import {matchupKey,sharedMatchups} from "../lib/coop";
import {summarizeStats} from "../lib/stats";
const game={id:"a",season_id:"s",game_day:"2026-11-15",home_team_id:"gsw",away_team_id:"lal",stage:"Regular Season"};
const host={id:"s1",team_id:"gsw",games:game},guest={id:"s2",team_id:"lal",games:{...game,id:"b"}};
test("shared games match across imported and custom IDs, preserving home and away",()=>{
 assert.equal(matchupKey(game),matchupKey(guest.games));
 assert.equal(sharedMatchups([host],[guest]).length,1);
 assert.equal(sharedMatchups([host],[guest])[0].sameTeam,false);
 assert.equal(sharedMatchups([host],[{...guest,team_id:"gsw"}])[0].sameTeam,true);
 for(const field of ["season_id","game_day","home_team_id","away_team_id","stage"]){assert.equal(sharedMatchups([host],[{...guest,games:{...game,[field]:"different"}}]).length,0);}
 assert.equal(matchupKey(null),null);
});
test("ambiguous duplicate fixtures are not silently paired",()=>{
 assert.equal(sharedMatchups([host],[guest,{...guest,id:"duplicate"}]).length,0);
 assert.equal(sharedMatchups([host,{...host,id:"duplicate"}],[guest]).length,0);
});
test("unequal game counts compare per-appearance averages and exclude DNP",()=>{
 const one=summarizeStats([{appearance_status:"played",points:30}]);
 const two=summarizeStats([{appearance_status:"played",points:20},{appearance_status:"played",points:40},{appearance_status:"dnp_injury",points:0}]);
 assert.equal(one.ppg,two.ppg);assert.equal(one.games,1);assert.equal(two.games,2);
});
