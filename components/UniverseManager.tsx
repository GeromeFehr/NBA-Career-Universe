"use client";
import { useState } from "react";

async function api(path:string,body:any){
  const r=await fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||`HTTP ${r.status}`);
  return j;
}

export default function UniverseManager({email,universes,legacy,teams,season}:{email:string;universes:any[];legacy:any[];teams:any[];season:any}){
  const [busy,setBusy]=useState(false),[msg,setMsg]=useState("");

  async function run(fn:()=>Promise<any>,after?:()=>void){
    setBusy(true);setMsg("");
    try{await fn();if(after)after();else location.reload();}
    catch(e:any){setMsg(e.message)}
    finally{setBusy(false)}
  }

  return <div className="adminStack">
    {msg&&<div className="notice">Fehler: {msg}</div>}

    <section>
      <div className="sectionHead"><h2>Deine Universen</h2><span className="muted">{email}</span></div>
      <div className="offerGrid">
        {universes.map((u:any)=>{
          const c=u.career_profiles?.[0]||u.career_profiles;
          const team=c?.current_team;
          return <div className="offerCard" key={u.id}>
            <span className="pill">{u.visibility}</span>
            <h2>{u.name}</h2>
            <b>{c?.player_name||"Keine Karriere"} · {team?.abbreviation||"FA"}</b>
            <p className="muted">{u.universe_date} · {c?.position||"—"} · OVR {c?.overall??"—"}</p>
            <div className="inline">
              <button disabled={busy} onClick={()=>run(()=>api("/api/universes/select",{universeId:u.id}),()=>location.href="/")}>Öffnen</button>
              <button disabled={busy} onClick={()=>run(()=>api("/api/universes/visibility",{universeId:u.id,visibility:u.visibility==="public"?"private":"public"}))}>
                {u.visibility==="public"?"Privat machen":"Öffentlich teilen"}
              </button>
            </div>
            {u.visibility==="public"&&<p><a href={`/share/${u.slug}`} target="_blank" rel="noreferrer">Öffentliche Karriere ansehen →</a></p>}
          </div>;
        })}
        {!universes.length&&<div className="card muted">Noch keine eigene Karriere. Erstelle unten eine neue oder übernimm die bestehende Legacy-Karriere.</div>}
      </div>
    </section>

    {legacy.length>0&&<section className="panel">
      <span className="eyebrow">LEGACY MIGRATION</span>
      <h2>Bestehende Karriere übernehmen</h2>
      <p className="muted">Deine bisherige Single-User-Karriere wurde sicher in ein eigenes Universe verschoben. Zur einmaligen Übernahme brauchst du dein bisheriges ADMIN_PASSWORD.</p>
      {legacy.map((u:any)=>{
        const c=u.career_profiles?.[0]||u.career_profiles;
        return <form key={u.id} onSubmit={e=>{
          e.preventDefault();const f=new FormData(e.currentTarget);
          run(()=>api("/api/universes/claim",{universeId:u.id,legacyPassword:f.get("legacyPassword")}),()=>location.href="/");
        }}>
          <div className="card">
            <b>{u.name}</b>
            <p>{c?.player_name} · {c?.current_team?.abbreviation||"FA"}</p>
            <label>Bisheriges Admin-Passwort<input name="legacyPassword" type="password" required/></label>
            <button disabled={busy}>Karriere übernehmen</button>
          </div>
        </form>;
      })}
    </section>}

    <section className="panel">
      <span className="eyebrow">NEW UNIVERSE</span>
      <h2>Neue Karriere erstellen</h2>
      <form onSubmit={e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);
        run(()=>api("/api/universes/create",{
          name:f.get("name"),playerName:f.get("playerName"),teamId:f.get("teamId"),position:f.get("position"),
          overall:Number(f.get("overall")||75),jerseyNumber:f.get("jerseyNumber"),draftYear:f.get("draftYear"),
          draftRound:1,draftPick:f.get("draftPick"),universeDate:f.get("universeDate")
        }),()=>location.href="/");
      }}>
        <div className="grid2">
          <label>Universe-Name<input name="name" placeholder="z.B. Warriors Rookie Run" required/></label>
          <label>Spielername<input name="playerName" placeholder="G. Fehr" required/></label>
        </div>
        <div className="grid3">
          <label>Team<select name="teamId" required>{teams.map((t:any)=><option key={t.id} value={t.id}>{t.city} {t.name}</option>)}</select></label>
          <label>Position<input name="position" defaultValue="SG/SF"/></label>
          <label>OVR<input name="overall" type="number" min="25" max="99" defaultValue="75"/></label>
        </div>
        <div className="grid3">
          <label>Jersey #<input name="jerseyNumber" type="number"/></label>
          <label>Draft-Jahr<input name="draftYear" type="number" defaultValue={season?.start_date?.slice(0,4)||""}/></label>
          <label>Draft-Pick<input name="draftPick" type="number" min="1" max="60"/></label>
        </div>
        <label>Startdatum<input name="universeDate" type="date" defaultValue={season?.start_date||""} required/></label>
        <button disabled={busy}>Universe erstellen & öffnen</button>
      </form>
    </section>
  </div>;
}
