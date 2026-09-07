"use client";
import {useState} from "react";

export default function TradeSagaPanel({saga,updates,language}:{saga:any;updates:any[];language:"de"|"en"}){
  const en=language==="en";
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  async function respond(choice:string){
    setBusy(true);setMsg("");
    try{
      const r=await fetch("/api/admin/trade-saga/respond",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sagaId:saga.id,choice})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);
      setMsg(en?"Response saved. Reloading…":"Reaktion gespeichert. Lade neu…");
      setTimeout(()=>location.reload(),500);
    }catch(e:any){setMsg(e.message)}
    finally{setBusy(false)}
  }
  return <section className="panel tradeSaga">
    <div className="sectionHead"><div><span className="eyebrow">TRADE SAGA</span><h2>{saga.title}</h2></div><strong className="heatValue">{saga.heat}/100</strong></div>
    <p>{saga.summary}</p>
    <div className="progress"><i style={{width:`${saga.heat}%`}}/></div>
    {saga.status==="active"&&<div className="choiceGrid">
      <button disabled={busy} onClick={()=>respond("demand")}>{en?"Demand trade":"Trade fordern"}</button>
      <button disabled={busy} onClick={()=>respond("silent")}>{en?"Stay silent":"Schweigen"}</button>
      <button disabled={busy} onClick={()=>respond("deny")}>{en?"Deny rumors":"Gerüchte dementieren"}</button>
      <button disabled={busy} onClick={()=>respond("happy")}>{en?"Say you're happy":"Zum Team bekennen"}</button>
    </div>}
    {msg&&<p className="muted">{msg}</p>}
    <div className="timeline compactTimeline">{(updates||[]).map((u:any)=><div className="timelineItem" key={u.id}><small>{u.update_date} · {u.kind}</small><h3>{u.headline}</h3><p>{u.body}</p></div>)}</div>
  </section>;
}
