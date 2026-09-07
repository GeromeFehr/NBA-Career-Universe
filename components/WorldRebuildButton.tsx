"use client";
import {useState} from "react";

export default function WorldRebuildButton({language}:{language:"de"|"en"}){
  const en=language==="en";
  const [busy,setBusy]=useState(false),[msg,setMsg]=useState("");
  return <div className="inlineAction">
    <button disabled={busy} onClick={async()=>{
      if(!confirm(en?"Rebuild reputation, rivalries, grades, goals and persona memory from your saved career games?":"Reputation, Rivalries, Noten, Ziele und Persona-Gedächtnis aus deinen gespeicherten Karrierespielen neu aufbauen?"))return;
      setBusy(true);setMsg("");
      try{
        const r=await fetch("/api/admin/world/rebuild",{method:"POST"});
        const j=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);
        setMsg(j.message);setTimeout(()=>location.reload(),600);
      }catch(e:any){setMsg(e.message)}
      finally{setBusy(false)}
    }}>{busy?(en?"Rebuilding…":"Baue neu auf…"):(en?"Rebuild career world":"Karriere-Welt neu aufbauen")}</button>
    {msg&&<small>{msg}</small>}
  </div>;
}
