import {pageContext} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import {summarizeCareerMarks} from "@/lib/stats";
import CareerMarks from "@/components/CareerMarks";

export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe),en=lang==="en";
  const [{data:a},{data:stats}]=await Promise.all([
    client.from("award_snapshots").select("*").eq("career_id",career.id).eq("language",lang).order("as_of_date",{ascending:false}),
    client.from("player_game_stats").select("*").eq("career_id",career.id)
  ]);
  const latest=new Map<string,any>();
  for(const x of a||[])if(!latest.has(x.award))latest.set(x.award,x);
  const marks=summarizeCareerMarks(stats||[]);

  return <>
    <div className="sectionHead"><div><span className="eyebrow">RACE WATCH · {universe.name}</span><h1>{en?"Awards & Records":"Awards & Rekorde"}</h1></div></div>

    {Array.from(latest.values()).length
      ?Array.from(latest.values()).map((x:any)=><div className="card awardCard" key={x.id}>
        <div><span className="eyebrow">{x.as_of_date}</span><h2>{x.award}</h2><p className="muted">{x.note}</p><div className="progress"><i style={{width:String(Math.max(8,100-Math.min(9,x.rank-1)*10))+"%"}}/></div></div>
        <div className="rank">#{x.rank}</div>
      </div>)
      :<div className="emptyState compact">{en?"No award race entries yet.":"Noch keine Award-Race-Einträge."}</div>}

    <div className="sectionHead"><div><span className="eyebrow">CAREER MARKS</span><h2>{en?"Career Highs & Big Games":"Career Highs & Big Games"}</h2></div></div>
    <CareerMarks marks={marks} language={lang}/>
  </>;
}
