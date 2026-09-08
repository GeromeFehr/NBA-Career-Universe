"use client";
import {useEffect,useState} from "react";

function usd(v:any){return v==null?"—":"$"+Number(v||0).toFixed(Number(v||0)<0.1?4:2)}
function tokens(v:any){return new Intl.NumberFormat().format(Number(v||0))}

export default function AiUsageMeter({language,compact=false}:{language:"de"|"en";compact?:boolean}){
  const en=language==="en";
  const [data,setData]=useState<any>(null);
  const [error,setError]=useState("");

  useEffect(()=>{
    fetch("/api/admin/usage",{cache:"no-store"})
      .then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||"Usage request failed");return j})
      .then(setData).catch(e=>setError(e.message));
  },[]);

  if(error)return <div className="card muted">{en?"AI usage unavailable":"KI-Nutzung nicht verfügbar"}: {error}</div>;
  if(!data)return <div className="card muted">{en?"Loading AI usage…":"Lade KI-Nutzung…"}</div>;

  if(compact)return <div className="card usageCompact">
    <span className="eyebrow">{en?"AI USAGE":"KI-NUTZUNG"}</span>
    <strong>{usd(data.season.costUsd)}</strong>
    <small>{en?"this season":"diese Saison"} · {data.season.requests} {en?"requests":"Anfragen"}</small>
    <div className="progress"><i style={{width:String(Math.min(100,data.total.costUsd/Math.max(.01,data.budgetUsd)*100))+"%"}}/></div>
    <small>{en?"Estimated remaining":"Geschätzt verbleibend"}: {usd(data.estimatedRemainingUsd)}</small>
  </div>;

  return <section className="panel">
    <div className="sectionHead"><div><span className="eyebrow">OPENAI API</span><h2>{en?"AI Usage & Cost Estimate":"KI-Nutzung & Kostenschätzung"}</h2></div><strong>{usd(data.estimatedRemainingUsd)} {en?"left*":"übrig*"}</strong></div>
    <div className="statGrid">
      <div className="statCard"><span>{en?"Today":"Heute"}</span><strong>{usd(data.today.costUsd)}</strong><small>{data.today.requests} {en?"requests":"Anfragen"}</small></div>
      <div className="statCard"><span>{en?"This season":"Diese Saison"}</span><strong>{usd(data.season.costUsd)}</strong><small>{tokens(data.season.totalTokens)} Tokens</small></div>
      <div className="statCard"><span>{en?"Career total":"Karriere gesamt"}</span><strong>{usd(data.total.costUsd)}</strong><small>{data.total.requests} {en?"requests":"Anfragen"}</small></div>
      <div className="statCard"><span>{en?"Configured budget":"Rechenbudget"}</span><strong>{usd(data.budgetUsd)}</strong><small>{en?"estimate only":"nur Schätzung"}</small></div>
    </div>
    {data.byFeature?.length>0&&<div className="usageBreakdown">
      {data.byFeature.map((x:any)=><div key={x.feature}><span>{x.feature.replaceAll("_"," ")}</span><b>{usd(x.costUsd)}</b><small>{x.requests} req · {tokens(x.totalTokens)} tok</small></div>)}
    </div>}
    {data.total.unpricedRequests>0&&<p className="notice">{en?`${data.total.unpricedRequests} requests have no configured model price. The cost total is incomplete; remaining budget cannot be estimated.`:`Für ${data.total.unpricedRequests} Anfragen fehlt ein hinterlegter Modellpreis. Die Kostensumme ist unvollständig; das Restbudget lässt sich nicht schätzen.`}</p>}
    <p className="muted usageNote">* {en
      ?"This counter uses API-reported tokens and an estimated model price. It cannot read your live OpenAI credit balance."
      :"Der Zähler nutzt die von der API gemeldeten Tokens und einen geschätzten Modellpreis. Er kann dein echtes OpenAI-Guthaben nicht auslesen."}</p>
  </section>;
}
