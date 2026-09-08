"use client";
import {useState} from "react";
import {label} from "@/lib/labels";

export default function InterviewPanel({interview,language}:{interview:any;language:"de"|"en"}){
  const en=language==="en";
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const [error,setError]=useState("");

  if(done)return <div className="card successCard">
    <span className="eyebrow">{en?"PRESS CONFERENCE":"PRESSEKONFERENZ"}</span>
    <b>{en?"Answer recorded.":"Antwort gespeichert."}</b>
    <p>{en?"Your response is now part of the career narrative.":"Deine Antwort ist jetzt Teil des Karriere-Narrativs."}</p>
  </div>;

  return <article className={"interviewCard interviewTone-"+String(interview.tone||"balanced")}>
    <div className="interviewMeta">
      <div>
        <span className="eyebrow">{interview.outlet|| (en?"PRESS CONFERENCE":"PRESSEKONFERENZ")}</span>
        <strong>{interview.reporter_name|| (en?"Reporter":"Reporter")}</strong>
      </div>
      {interview.topic&&<span className="pill">{label(interview.topic,language)}</span>}
    </div>

    {interview.context&&<p className="interviewContext">{interview.context}</p>}
    <h2>{interview.question}</h2>

    {error&&<div className="notice inlineNotice">{error}</div>}

    <div className="interviewOptions">
      {(interview.options||[]).map((o:any)=><button key={o.id} disabled={busy} onClick={async()=>{
        setBusy(true);setError("");
        try{
          const r=await fetch("/api/admin/interview/respond",{
            method:"POST",
            headers:{"content-type":"application/json"},
            body:JSON.stringify({interviewId:interview.id,optionId:o.id})
          });
          const j=await r.json().catch(()=>({}));
          if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);
          setDone(true);
        }catch(e:any){setError(e.message)}
        finally{setBusy(false)}
      }}>
        {o.style&&<span className="answerStyle">{label(o.style,language)}</span>}
        <span>{o.label}</span>
      </button>)}
    </div>
  </article>;
}
