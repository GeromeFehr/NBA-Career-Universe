"use client";
import {useState} from "react";

export default function InterviewPanel({interview,language}:{interview:any;language:"de"|"en"}){
  const en=language==="en";
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const [error,setError]=useState("");
  if(done)return <div className="card successCard"><b>{en?"Answer recorded.":"Antwort gespeichert."}</b><p>{en?"Your response is now part of the career narrative.":"Deine Antwort ist jetzt Teil des Karriere-Narrativs."}</p></div>;
  return <div className="interviewCard">
    <span className="eyebrow">{en?"PRESS CONFERENCE":"PRESSEKONFERENZ"}</span>
    <h2>{interview.question}</h2>
    {error&&<div className="notice inlineNotice">{error}</div>}
    <div className="interviewOptions">
      {(interview.options||[]).map((o:any)=><button key={o.id} disabled={busy} onClick={async()=>{
        setBusy(true);setError("");
        try{
          const r=await fetch("/api/admin/interview/respond",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({interviewId:interview.id,optionId:o.id})});
          const j=await r.json().catch(()=>({}));
          if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);
          setDone(true);
        }catch(e:any){setError(e.message)}
        finally{setBusy(false)}
      }}>{o.label}</button>)}
    </div>
  </div>;
}
