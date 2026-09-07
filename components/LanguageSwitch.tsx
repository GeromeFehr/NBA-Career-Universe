"use client";
import {useState} from "react";

export default function LanguageSwitch({universeId,language}:{universeId:string;language:"de"|"en"}){
  const [busy,setBusy]=useState(false);
  return <select
    className="languageSwitch"
    aria-label="Language"
    value={language}
    disabled={busy}
    onChange={async e=>{
      const value=e.target.value as "de"|"en";
      setBusy(true);
      try{
        const r=await fetch("/api/universes/language",{
          method:"POST",headers:{"content-type":"application/json"},
          body:JSON.stringify({universeId,language:value})
        });
        if(!r.ok)throw new Error("Language update failed");
        location.reload();
      }finally{setBusy(false)}
    }}>
    <option value="de">DE</option>
    <option value="en">EN</option>
  </select>;
}
