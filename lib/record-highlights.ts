import {summarizeCareerMarks, type StatRow} from "@/lib/stats";
import type {AppLanguage} from "@/lib/i18n";

export type RecordHighlight={id:string;title:string;value:number;unit:string;kind:"count"|"high"};

/** Counts and career highs always come from appearances across all seasons. */
export function recordHighlights(rows:StatRow[],language:AppLanguage):RecordHighlight[]{
 const m=summarizeCareerMarks(rows),en=language==="en";
 if(!m.games)return [];
 const counts:[string,string,number][]=[
  ["reb20","20+ REB",m.games20Rebounds],["dd","Double-Double",m.doubleDoubles],
  ["td","Triple-Double",m.tripleDoubles],
  ...[20,30,40,50,60,70].map(n=>["pts"+n,n+"+ PTS",m[("games"+n+"Plus") as keyof typeof m]] as [string,string,number]),
  ["ast15","15+ AST",m.games15Assists],["blk5","5+ BLK",m.games5Blocks],["stl5","5+ STL",m.games5Steals]
 ];
 const highs:[string,number][]=[["PTS",m.careerHighPoints],["REB",m.careerHighRebounds],["AST",m.careerHighAssists],["STL",m.careerHighSteals],["BLK",m.careerHighBlocks]];
 const countItems:RecordHighlight[]=counts.filter(([, ,value])=>value>0).map(([id,title,value])=>({id,title,value,kind:"count",unit:en?(value===1?"game":"games"):(value===1?"Spiel":"Spiele")}));
 const highItems:RecordHighlight[]=highs.map(([unit,value])=>({id:"high"+unit,title:"Career High · "+unit,value,unit,kind:"high"}));
 // Interleave both meanings instead of showing several variations of the same record.
 const items:RecordHighlight[]=[];
 while(countItems.length||highItems.length){
  const count=countItems.shift(),high=highItems.shift();
  if(count)items.push(count);if(high)items.push(high);
 }
 return items;
}
