import {pageContext} from "@/lib/universe";
import {langOf,t} from "@/lib/i18n";
export const dynamic="force-dynamic";

export default async function Page(){
 const {client,career,universe}=await pageContext();
 const lang=langOf(universe);
 const [{data:a},{data:m}]=await Promise.all([
  client.from("award_snapshots").select("*").eq("career_id",career.id).eq("language",lang).order("as_of_date",{ascending:false}),
  client.from("milestones").select("*").eq("career_id",career.id).eq("language",lang).order("achieved_at",{ascending:false})
 ]);
 const latest=new Map<string,any>();for(const x of a||[])if(!latest.has(x.award))latest.set(x.award,x);
 return <><div className="sectionHead"><div><span className="eyebrow">RACE WATCH · {universe.name}</span><h1>{lang==="en"?"Awards & Records":"Awards & Rekorde"}</h1></div></div>
 {Array.from(latest.values()).map((x:any)=><div className="card awardCard" key={x.id}><div><span className="eyebrow">{x.as_of_date}</span><h2>{x.award}</h2><p className="muted">{x.note}</p><div className="progress"><i style={{width:`${Math.max(8,100-Math.min(9,x.rank-1)*10)}%`}}/></div></div><div className="rank">#{x.rank}</div></div>)}
 <div className="sectionHead"><h2>{t(lang,"milestones")}</h2></div><div className="offerGrid">{(m||[]).map((x:any)=><div className="card" key={x.id}><b>{x.title}</b><p>{x.description}</p></div>)}</div></>;
}
