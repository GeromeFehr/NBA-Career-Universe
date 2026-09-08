import Link from "next/link";
import {label} from "@/lib/labels";
import {pageContext} from "@/lib/universe";
import {langOf,t} from "@/lib/i18n";
import TradeSagaPanel from "@/components/TradeSagaPanel";
export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe),en=lang==="en";
  const [{data:i},{data:o},{data:sagas}]=await Promise.all([
    client.from("trade_interest").select("*,teams(*)").eq("career_id",career.id).eq("language",lang).order("interest_score",{ascending:false}),
    client.from("trade_offers").select("*,to_team:teams!trade_offers_to_team_id_fkey(*)").eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false}),
    client.from("trade_sagas").select("*,team:target_team_id(*)").eq("career_id",career.id).eq("language",lang).order("updated_at",{ascending:false})
  ]);
  const ids=(sagas||[]).map(x=>x.id);const {data:updates}=ids.length?await client.from("trade_saga_updates").select("*").in("saga_id",ids).eq("language",lang).order("created_at",{ascending:false}):{data:[]};
  const sagaRows=(sagas||[]).map(saga=>({saga,updates:(updates||[]).filter(x=>x.saga_id===saga.id)}));

  return <>
    <div className="sectionHead"><div><h1>{t(lang,"tradeCenter")}</h1></div></div>
    <p className="muted">{en
      ?"Trade rumors now develop as multi-day sagas. Your public response can raise or cool the pressure."
      :"Trade-Gerüchte entwickeln sich jetzt als mehrtägige Sagas. Deine öffentliche Reaktion kann den Druck erhöhen oder abkühlen."}</p>

    {sagaRows.length?sagaRows.map((x:any)=><TradeSagaPanel key={x.saga.id} saga={x.saga} updates={x.updates} careerDate={career.universe_date} language={lang}/>):<div className="emptyState compact">{en?"No active trade saga yet. Interest builds organically as your career develops.":"Noch keine aktive Trade-Saga. Interesse baut sich jetzt organisch mit deiner Karriere auf."}</div>}

    <div className="sectionHead"><h2>{en?"Current Offers":"Aktuelle Angebote"}</h2></div>
    {(o||[]).length?<div className="offerGrid">{(o||[]).map((x:any)=><div className="offerCard" key={x.id}>
      <span className="pill">{label(x.status,lang)}</span><h2>{x.to_team?.city} {x.to_team?.name}</h2>
      <b>{en?"Interest":"Interesse"} {x.interest_score}/100 · Fairness {x.fairness_score}/100</b>
      <p>{x.package_summary}</p>{x.status==="pending"&&<Link className="textLink" href="/admin#trade">{en?"Review and accept":"Prüfen und annehmen"} →</Link>}<small>{x.rationale}</small>
    </div>)}</div>:<div className="emptyState compact">{en?"No formal offer yet. Formal packages can appear after your market heats up.":"Noch kein formelles Angebot. Konkrete Pakete können erscheinen, sobald dein Markt heiß genug ist."}</div>}

    <div className="sectionHead"><h2>{t(lang,"leagueInterest")}</h2></div>
    {(i||[]).length?<div className="statGrid">{(i||[]).map((x:any)=><div className="statCard" key={x.id}><span>{x.teams?.abbreviation}</span><strong>{x.interest_score}</strong><small>{x.rationale}</small></div>)}</div>:<div className="emptyState compact">{en?"No scouting interest has surfaced yet. It begins after the first few career games.":"Noch kein sichtbares Scouting-Interesse. Es beginnt jetzt nach den ersten Karrierespielen und wächst mit Leistung, Hype und Star-Power."}</div>}
  </>;
}
