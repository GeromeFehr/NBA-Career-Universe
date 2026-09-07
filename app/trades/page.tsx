import {pageContext} from "@/lib/universe";
import {langOf,t} from "@/lib/i18n";
export const dynamic="force-dynamic";

export default async function Page(){
 const {client,career,universe}=await pageContext();
 const lang=langOf(universe);
 const [{data:i},{data:o}]=await Promise.all([
  client.from("trade_interest").select("*,teams(*)").eq("career_id",career.id).order("interest_score",{ascending:false}),
  client.from("trade_offers").select("*,to_team:teams!trade_offers_to_team_id_fkey(*)").eq("career_id",career.id).order("created_at",{ascending:false})
 ]);
 return <><div className="sectionHead"><div><span className="eyebrow">RUMOR MILL · {universe.name}</span><h1>{t(lang,"tradeCenter")}</h1></div></div>
 <div className="offerGrid">{(o||[]).map((x:any)=><div className="offerCard" key={x.id}><span className="pill">{x.status}</span><h2>{x.to_team?.city} {x.to_team?.name}</h2><b>{lang==="en"?"Interest":"Interesse"} {x.interest_score}/100 · {lang==="en"?"Fairness":"Fairness"} {x.fairness_score}/100</b><p>{x.package_summary}</p><small>{x.rationale}</small></div>)}</div>
 <div className="sectionHead"><h2>{t(lang,"leagueInterest")}</h2></div><div className="statGrid">{(i||[]).map((x:any)=><div className="statCard" key={x.id}><span>{x.teams?.abbreviation}</span><strong>{x.interest_score}</strong><small>{x.rationale}</small></div>)}</div></>;
}
