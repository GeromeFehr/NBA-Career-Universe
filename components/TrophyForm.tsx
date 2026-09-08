"use client";
import {useState} from "react";

export default function TrophyForm({seasons,currentSeasonId,careerDate,language}:{seasons:any[];currentSeasonId:string|null;careerDate:string;language:"de"|"en"}){
  const en=language==="en";const [busy,setBusy]=useState(false),[msg,setMsg]=useState("");
  return <form className="card" onSubmit={async e=>{
    e.preventDefault();setBusy(true);setMsg("");
    const f=new FormData(e.currentTarget);
    try{
      const r=await fetch("/api/admin/trophy",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        seasonId:f.get("seasonId"),trophyType:f.get("trophyType"),title:f.get("title"),detail:f.get("detail"),awardedOn:f.get("awardedOn")
      })});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);
      setMsg(en?"Achievement saved.":"Erfolg gespeichert.");setTimeout(()=>location.reload(),500);
    }catch(err:any){setMsg(err.message)}
    finally{setBusy(false)}
  }}>
    <h3>{en?"Add achievement":"Erfolg hinzufügen"}</h3>
    <div className="grid3">
      <label>{en?"Season":"Saison"}<select name="seasonId" defaultValue={currentSeasonId||""}>{seasons.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
      <label>{en?"Type":"Typ"}<select name="trophyType"><option value="championship">NBA Champion</option><option value="all_star">All-Star</option><option value="all_nba">All-NBA</option><option value="award">Award</option><option value="achievement">{en?"Achievement":"Erfolg"}</option></select></label>
      <label>{en?"Date":"Datum"}<input name="awardedOn" type="date" defaultValue={careerDate}/></label>
    </div>
    <label>{en?"Title":"Titel"}<input name="title" required placeholder="NBA Champion 2028"/></label>
    <label>{en?"Details":"Details"}<textarea name="detail"/></label>
    <button disabled={busy}>{en?"Add trophy":"Trophäe hinzufügen"}</button>
    {msg&&<p className="muted">{msg}</p>}
  </form>;
}
