import test from "node:test";
import assert from "node:assert/strict";
import {recordHighlights} from "../lib/record-highlights";
import {summarizeCareerMarks} from "../lib/stats";
import {balancedMediaPreview} from "../lib/media-preview";
import {basketballTerms} from "../lib/basketball-terms";

test("20+ rebounds displays game count separately from the career high, across seasons",()=>{
 const rows=[
  {appearance_status:"played",points:30,rebounds:23,assists:4,blocks:5,game:{season_id:"first"}},
  {appearance_status:"played",points:46,rebounds:22,assists:15,steals:5,game:{season_id:"second"}},
  {appearance_status:"dnp",points:99,rebounds:99,assists:99},
  {appearance_status:"injured",points:99,rebounds:99,assists:99}
 ];
 const items=recordHighlights(rows,"de");
 assert.deepEqual(items.find(x=>x.id==="reb20"),{id:"reb20",title:"20+ REB",value:2,unit:"Spiele",kind:"count"});
 assert.equal(items.find(x=>x.id==="highREB")?.value,23);
 assert.equal(items.find(x=>x.id==="highPTS")?.value,46);
 assert.equal(items.find(x=>x.id==="dd")?.value,2);
 assert.equal(items.find(x=>x.id==="td")?.value,1);
 assert.equal(summarizeCareerMarks(rows).games15Assists,1);
 assert.equal(summarizeCareerMarks(rows).games5Blocks,1);
 assert.equal(summarizeCareerMarks(rows).games5Steals,1);
 assert.equal(new Set(items.map(x=>x.id)).size,items.length);
 assert.ok(items.length>3,"additional statistics are available to browse");
 assert.deepEqual(recordHighlights([],"de"),[]);
 assert.equal(recordHighlights([rows[0]],"en").find(x=>x.id==="reb20")?.unit,"game");
});

test("co-op preview includes both players even when one publishes all the newest posts",()=>{
 const own=Array.from({length:6},(_,i)=>({id:"own"+i,created_at:`2026-09-08T12:00:0${6-i}Z`}));
 const peer=Array.from({length:6},(_,i)=>({id:"peer"+i,created_at:`2026-09-07T12:00:0${6-i}Z`}));
 const feed=balancedMediaPreview([own,peer]);
 assert.equal(feed.length,6);
 assert.equal(feed.filter(p=>p.id.startsWith("peer")).length,3);
 assert.deepEqual(feed.map(p=>p.id),["own0","own1","own2","peer0","peer1","peer2"]);
 assert.equal(balancedMediaPreview([own,[]]).length,6);
 assert.equal(balancedMediaPreview([own,peer.slice(0,1)]).filter(p=>p.id.startsWith("own")).length,5);
 assert.deepEqual(balancedMediaPreview([[],[]]),[]);
 assert.equal(balancedMediaPreview([[own[0]],[own[0]]]).length,1);
});

test("saved German grade summaries retain standard basketball category names",()=>{
 assert.equal(basketballTerms("Punkteproduktion 90, Spielgestaltung 80, Verteidigung 70, Effizienz 60."),"Scoring 90, Playmaking 80, Defense 70, Efficiency 60.");
 assert.equal(basketballTerms("Scoring · Playmaking · Defense · Efficiency"),"Scoring · Playmaking · Defense · Efficiency");
});
