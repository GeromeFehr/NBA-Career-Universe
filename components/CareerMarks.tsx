import type {summarizeCareerMarks} from "@/lib/stats";
export default function CareerMarks({marks,language}:{marks:ReturnType<typeof summarizeCareerMarks>;language:"de"|"en"}) {
  const en=language==="en";
  const highs=[["PTS",marks.careerHighPoints],["REB",marks.careerHighRebounds],["AST",marks.careerHighAssists],["STL",marks.careerHighSteals],["BLK",marks.careerHighBlocks]];
  const counts=[["Double-Doubles",marks.doubleDoubles],["Triple-Doubles",marks.tripleDoubles],...[20,30,40,50,60,70].map(n=>[n+ (en?"+ point games":"+ Punkte-Spiele"),marks[("games"+n+"Plus") as keyof typeof marks]])];
  return <div className="careerMarks"><div className="recordHighs">{highs.map(([key,value])=><div key={String(key)}><span>{en?"Career high":"Karrierebestwert"} · {key}</span><strong>{value}</strong></div>)}</div><dl className="achievementCounts">{counts.map(([key,value])=><div key={String(key)}><dt>{key}</dt><dd>{value}<small>{en?"games":"Spiele"}</small></dd></div>)}</dl></div>;
}
