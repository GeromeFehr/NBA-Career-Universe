"use client";
import {useEffect,useMemo,useState} from "react";

async function api(path:string,body?:any,method="POST"){
  const r=await fetch(path,{method,headers:{"content-type":"application/json"},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||`HTTP ${r.status}`);
  return j;
}

export default function AdminConsole(){
  const [data,setData]=useState<any>(null),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
  const refresh=async()=>{const r=await fetch("/api/public/bootstrap",{cache:"no-store"});setData(await r.json())};
  useEffect(()=>{refresh()},[]);
  async function run(fn:()=>Promise<any>,ok:string){setBusy(true);setMsg("");try{const r=await fn();setMsg(ok+(r?.message?` · ${r.message}`:""));await refresh()}catch(e:any){setMsg(`Fehler: ${e.message}`)}finally{setBusy(false)}}
  const career=data?.career,teams=data?.teams||[],games=data?.careerGames||[],offers=data?.offers||[],injuries=data?.injuries||[];
  const future=useMemo(()=>games.filter((g:any)=>g.game_day>=String(career?.universe_date||"")&&g.status!=="completed").slice(0,25),[games,career]);

  if(!data) return <div className="card">Control Room wird geladen…</div>;
  if(data.needsSetup) return <div className="card"><h2>Datenbank noch nicht eingerichtet</h2><p>SQL-Migrationen in Supabase ausführen und Environment Variables setzen.</p></div>;

  return <div className="adminStack">
    {msg&&<div className="notice">{msg}</div>}
    <section className="panel">
      <span className="eyebrow">PLAYER FILE</span><h2>Spielerprofil</h2>
      <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>api("/api/admin/profile",{playerName:f.get("playerName"),position:f.get("position"),overall:f.get("overall"),jerseyNumber:f.get("jerseyNumber"),draftYear:f.get("draftYear"),draftRound:f.get("draftRound"),draftPick:f.get("draftPick")}),"Spielerprofil aktualisiert")}}>
        <div className="grid3"><label>Name<input name="playerName" defaultValue={career.player_name}/></label><label>Position<input name="position" defaultValue={career.position||""}/></label><label>OVR<input name="overall" type="number" min="25" max="99" defaultValue={career.overall}/></label></div>
        <div className="grid3"><label>Jersey #<input name="jerseyNumber" type="number" defaultValue={career.jersey_number??""}/></label><label>Draft Jahr<input name="draftYear" type="number" defaultValue={career.draft_year??""}/></label><label>Pick<input name="draftPick" type="number" defaultValue={career.draft_pick??""}/></label></div>
        <input type="hidden" name="draftRound" value={career.draft_round||1}/><button disabled={busy}>Profil speichern</button>
      </form>
    </section>
    <section className="panel">
      <div className="panelHead"><div><span className="eyebrow">UNIVERSE CLOCK</span><h2>Datum der Karriere</h2></div><strong>{career.universe_date}</strong></div>
      <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>api("/api/admin/date",{date:f.get("date")}),"Datum aktualisiert")}}>
        <div className="inline"><input name="date" type="date" defaultValue={career.universe_date}/><button disabled={busy}>Datum setzen</button></div>
      </form>
    </section>

    <section className="panel">
      <div className="panelHead"><div><span className="eyebrow">LEAGUE DATA</span><h2>Kompletten NBA-Spielplan synchronisieren</h2></div></div>
      <p className="muted">Versucht zuerst die offizielle NBA-Schedule-JSON und fällt bei Bedarf auf den konfigurierten Fixture-Feed zurück.</p>
      <button disabled={busy} onClick={()=>run(()=>api("/api/admin/schedule-sync",{}),"Spielplan synchronisiert")}>Alle Teams synchronisieren</button>
    </section>

    <section className="panel">
      <span className="eyebrow">GAME ENTRY</span><h2>Spiel + Statline eintragen</h2>
      <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);
        const stats:any={};["minutes","points","rebounds","assists","steals","blocks","turnovers","fouls","technical_fouls","flagrant_fouls","fgm","fga","tpm","tpa","ftm","fta","plus_minus"].forEach(k=>stats[k]=Number(f.get(k)||0));
        run(()=>api("/api/admin/game",{
          gameId:f.get("gameId"),homeScore:Number(f.get("homeScore")),awayScore:Number(f.get("awayScore")),
          appearanceStatus:f.get("appearanceStatus"),stats,
          started:f.get("started")==="on",fouledOut:f.get("fouledOut")==="on",ejected:f.get("ejected")==="on",
          injured:f.get("injured")==="on",injuryNote:f.get("injuryNote"),storyNotes:f.get("storyNotes"),
          notableText:f.get("notables"),autoMedia:f.get("autoMedia")==="on"
        }),"Spiel gespeichert und Storyline verarbeitet")
      }}>
        <label>Spiel<select name="gameId" required defaultValue="">
          <option value="" disabled>Spiel auswählen</option>
          {future.map((g:any)=><option value={g.id} key={g.id}>{g.game_day} · {g.away?.abbreviation} @ {g.home?.abbreviation}</option>)}
        </select></label>
        <div className="grid2"><label>Auswärts-Score<input name="awayScore" type="number" required/></label><label>Heim-Score<input name="homeScore" type="number" required/></label></div>
        <label>Einsatzstatus<select name="appearanceStatus"><option value="played">Gespielt</option><option value="dnp_injury">DNP – verletzt</option><option value="dnp_coach">DNP – Coach</option><option value="suspended">Gesperrt</option><option value="inactive">Inaktiv</option></select></label>
        <div className="statInputs">
          {["minutes","points","rebounds","assists","steals","blocks","turnovers","fouls","technical_fouls","flagrant_fouls","fgm","fga","tpm","tpa","ftm","fta","plus_minus"].map(k=><label key={k}><span>{k}</span><input name={k} type="number" step={k==="minutes"?"0.1":"1"} defaultValue="0"/></label>)}
        </div>
        <div className="checks">
          <label><input type="checkbox" name="started"/> Starter</label><label><input type="checkbox" name="fouledOut"/> Ausgefoult</label>
          <label><input type="checkbox" name="ejected"/> Ejected</label><label><input type="checkbox" name="injured"/> Verletzt</label>
          <label><input type="checkbox" name="autoMedia" defaultChecked/> KI-Medien automatisch</label>
        </div>
        <label>Verletzung / Status<textarea name="injuryNote" placeholder="z.B. leichte Knöchelverstauchung, Rückkehr fraglich"/></label>
        <label>Story-Notizen<textarea name="storyNotes" placeholder="Buzzer Beater, Streit, technische Fouls, Poster Dunk, Coach-Reaktion, clutch sequence…"/></label>
        <label>Andere auffällige Spieler / Boxscore-Notizen<textarea name="notables" placeholder={"Eine Zeile pro Person, z.B.\nLuka Dončić | LAL | dominierte früh, kühlte später ab\nStephen Curry | GSW | heißer Start, zog viel Aufmerksamkeit"}/></label>
        <button disabled={busy}>Spiel abschließen + Welt aktualisieren</button>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">MEDIA ENGINE</span><h2>Zusätzlichen Daily Pulse erzeugen</h2>
      <button disabled={busy} onClick={()=>run(()=>api("/api/admin/world-pulse",{}),"Neue Tagesberichte erzeugt")}>Newsroom anwerfen</button>
    </section>

    <section className="panel">
      <span className="eyebrow">TRADE MARKET</span><h2>Interesse & Angebote simulieren</h2>
      <button disabled={busy} onClick={()=>run(()=>api("/api/admin/trade-market",{}),"Neue Trade-Angebote erzeugt")}>Trade-Markt aktualisieren</button>
      {offers.length>0&&<div className="offerGrid">{offers.map((o:any)=><div className="offerCard" key={o.id}><b>{o.to_team?.city} {o.to_team?.name}</b><span>Interesse {o.interest_score}/100 · Fairness {o.fairness_score}/100</span><p>{o.package_summary}</p><small>{o.rationale}</small><button disabled={busy} onClick={()=>run(()=>api("/api/admin/trade/accept",{offerId:o.id}),`Trade zu ${o.to_team?.abbreviation} abgeschlossen`)}>Angebot annehmen</button></div>)}</div>}
      <h3>Oder manueller Teamwechsel</h3>
      <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>api("/api/admin/trade/manual",{toTeamId:f.get("toTeamId"),date:f.get("tradeDate"),notes:f.get("tradeNotes")}),"Teamwechsel gespeichert")}}>
        <div className="grid2"><label>Neues Team<select name="toTeamId">{teams.filter((t:any)=>t.id!==career.current_team_id).map((t:any)=><option value={t.id} key={t.id}>{t.city} {t.name}</option>)}</select></label><label>Datum<input name="tradeDate" type="date" defaultValue={career.universe_date}/></label></div>
        <label>Trade-Paket / Story<textarea name="tradeNotes" placeholder="Was ging zurück? Warum kam es zum Trade?"/></label><button disabled={busy}>Teamwechsel durchführen</button>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">STORY EVENTS</span><h2>Verletzung oder freies Karriere-Event</h2>
      <div className="grid2">
        <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>api("/api/admin/injury",{startDate:f.get("startDate"),injury:f.get("injury"),severity:f.get("severity"),status:"active"}),"Verletzung gespeichert")}}>
          <label>Start<input name="startDate" type="date" defaultValue={career.universe_date}/></label><label>Verletzung<input name="injury" required/></label><label>Schwere<select name="severity"><option>day-to-day</option><option>minor</option><option>moderate</option><option>major</option></select></label><button disabled={busy}>Injury-Arc starten</button>
        </form>
        <div>
          <h3>Aktive Verletzungen</h3>
          {injuries.length?injuries.map((i:any)=><div className="card" key={i.id}><b>{i.injury}</b><p className="muted">{i.start_date} · {i.severity}</p><button disabled={busy} type="button" onClick={()=>run(()=>api("/api/admin/injury/resolve",{injuryId:i.id,endDate:career.universe_date,gamesMissed:0}),"Spieler wieder freigegeben")}>Als genesen markieren</button></div>):<p className="muted">Keine aktive Verletzung.</p>}
        </div>
        <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>api("/api/admin/event",{date:f.get("eventDate"),type:f.get("eventType"),description:f.get("description")}),"Event gespeichert")}}>
          <label>Datum<input name="eventDate" type="date" defaultValue={career.universe_date}/></label><label>Typ<select name="eventType"><option value="locker_room">Locker Room</option><option value="rivalry">Rivalry</option><option value="coach">Coach</option><option value="contract">Contract</option><option value="suspension">Suspension</option><option value="milestone">Milestone</option><option value="other">Sonstiges</option></select></label><label>Beschreibung<textarea name="description" required/></label><button disabled={busy}>Story-Event setzen</button>
        </form>
      </div>
    </section>

    <section className="panel">
      <span className="eyebrow">AWARD TRACKER</span><h2>2K-Award-Race übernehmen</h2>
      <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>api("/api/admin/award",{award:f.get("award"),rank:Number(f.get("rank")),score:Number(f.get("score")||0),asOfDate:f.get("asOfDate"),note:f.get("note")}),"Award-Snapshot gespeichert")}}>
        <div className="grid3"><label>Award<select name="award"><option>Rookie of the Year</option><option>MVP</option><option>Defensive Player of the Year</option><option>Sixth Man of the Year</option><option>Most Improved Player</option></select></label><label>Rang<input name="rank" type="number" min="1" required/></label><label>Score optional<input name="score" type="number" step="0.1"/></label></div>
        <label>Stand<input name="asOfDate" type="date" defaultValue={career.universe_date}/></label><label>Notiz<textarea name="note"/></label><button disabled={busy}>Award Race speichern</button>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">BACKUP</span><h2>Komplette Karriere exportieren</h2>
      <p className="muted">Alle Kern-Tabellen als JSON. Ideal vor größeren Änderungen oder Saisonwechseln.</p>
      <a className="buttonLink" href="/api/admin/backup">Backup herunterladen</a>
    </section>
  </div>
}
