"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {label} from "@/lib/labels";
import StatusMessage from "@/components/StatusMessage";

export default function TradeSagaPanel({saga,updates,careerDate,language}:{saga:any;updates:any[];careerDate:string;language:"de"|"en"}){
  const router=useRouter(),locked=useRef(false);
  const en=language==="en";
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const [failed,setFailed]=useState(false);
  const [respondedOn,setRespondedOn]=useState<string|null>(null);
  const respondedToday=saga.metadata?.last_response_date===careerDate||respondedOn===careerDate;
  async function respond(choice:string){
    if(locked.current||respondedToday)return;
    locked.current=true;setBusy(true);setMsg("");setFailed(false);
    try{
      const r=await fetch("/api/admin/trade-saga/respond",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sagaId:saga.id,choice})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);
      setRespondedOn(careerDate);setMsg(en?"Response saved.":"Reaktion gespeichert.");router.refresh();
    }catch(e:any){setFailed(true);setMsg(e.message)}
    finally{locked.current=false;setBusy(false)}
  }
  return <section className="panel tradeSaga">
    <div className="sectionHead"><div><h2>{saga.title}</h2></div><strong className="heatValue">{saga.heat}/100</strong></div>
    <p>{saga.summary}</p>
    <div className="progress"><i style={{width:`${saga.heat}%`}}/></div>
    {saga.status==="active"&&!respondedToday&&<div className="choiceGrid">
      <button disabled={busy} onClick={()=>respond("demand")}>{en?"Demand trade":"Trade fordern"}</button>
      <button disabled={busy} onClick={()=>respond("silent")}>{en?"Stay silent":"Schweigen"}</button>
      <button disabled={busy} onClick={()=>respond("deny")}>{en?"Deny rumors":"Gerüchte dementieren"}</button>
      <button disabled={busy} onClick={()=>respond("happy")}>{en?"Say you're happy":"Zum Team bekennen"}</button>
    </div>}
    {respondedToday&&<p className="muted">{en?"You can respond again on the next career date.":"Am nächsten Karrieredatum kannst du erneut Stellung beziehen."}</p>}
    {msg&&<StatusMessage tone={failed?"error":"success"}>{msg}</StatusMessage>}
    <div className="timeline compactTimeline">{(updates||[]).map((u:any)=><div className="timelineItem" key={u.id}><small>{u.update_date} · {label(u.kind,language)}</small><h3>{u.headline}</h3><p>{u.body}</p></div>)}</div>
  </section>;
}
