import StatCard from "@/components/StatCard";

export default function CareerMarks({marks,language}:{marks:any;language:"de"|"en"}){
  const en=language==="en";
  const rows=[
    [en?"Career High PTS":"Career High PTS",marks.careerHighPoints,en?"points":"Punkte"],
    [en?"Career High REB":"Career High REB",marks.careerHighRebounds,en?"rebounds":"Rebounds"],
    [en?"Career High AST":"Career High AST",marks.careerHighAssists,en?"assists":"Assists"],
    [en?"Career High STL":"Career High STL",marks.careerHighSteals,en?"steals":"Steals"],
    [en?"Career High BLK":"Career High BLK",marks.careerHighBlocks,en?"blocks":"Blocks"],
    ["Double-Doubles",marks.doubleDoubles,en?"games":"Spiele"],
    ["Triple-Doubles",marks.tripleDoubles,en?"games":"Spiele"],
    [en?"20+ point games":"20+ Punkte-Spiele",marks.games20Plus,en?"times":"Mal"],
    [en?"30+ point games":"30+ Punkte-Spiele",marks.games30Plus,en?"times":"Mal"],
    [en?"50+ point games":"50+ Punkte-Spiele",marks.games50Plus,en?"times":"Mal"],
    [en?"60+ point games":"60+ Punkte-Spiele",marks.games60Plus,en?"times":"Mal"],
    [en?"70+ point games":"70+ Punkte-Spiele",marks.games70Plus,en?"times":"Mal"]
  ];
  return <div className="statGrid careerMarksGrid">
    {rows.map(([label,value,sub])=><StatCard key={String(label)} label={String(label)} value={value} sub={String(sub)}/>)}
  </div>;
}
