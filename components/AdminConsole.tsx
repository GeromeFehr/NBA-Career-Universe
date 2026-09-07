"use client";
import {useEffect,useMemo,useState} from "react";

async function api(path:string,body?:any,method="POST"){
  const r=await fetch(path,{method,headers:{"content-type":"application/json"},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||`HTTP ${r.status}`);
  return j;
}

function readFile(file:File){
  return new Promise<string>((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result||""));
    r.onerror=()=>reject(new Error("Bild konnte nicht gelesen werden."));
    r.readAsDataURL(file);
  });
}

function cleanTeam(v:any){return String(v||"").trim().toUpperCase().replace(/[^A-Z]/g,"")}

export default function AdminConsole({language}:{language:"de"|"en"}){
  const en=language==="en";
  const x=(de:string,enText:string)=>en?enText:de;
  const [data,setData]=useState<any>(null);
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const [scan,setScan]=useState<any>(null);
  const [scanKey,setScanKey]=useState(0);

  const refresh=async()=>{const r=await fetch("/api/public/bootstrap",{cache:"no-store"});setData(await r.json())};
  useEffect(()=>{refresh()},[]);

  async function run(fn:()=>Promise<any>,ok:string){
    setBusy(true);setMsg("");
    try{
      const r=await fn();
      setMsg(ok+(r?.message?` · ${r.message}`:""));
      await refresh();
      return r;
    }catch(e:any){
      setMsg(`${x("Fehler","Error")}: ${e.message}`);
      throw e;
    }finally{setBusy(false)}
  }

  const career=data?.career;
  const universe=data?.universe;
  const teams=data?.teams||[];
  const games=data?.careerGames||[];
  const offers=data?.offers||[];
  const injuries=data?.injuries||[];
  const seasons=data?.seasons||[];

  const future=useMemo(
    ()=>games.filter((g:any)=>g.game_day>=String(career?.universe_date||"")&&g.status!=="completed").slice(0,100),
    [games,career]
  );

  function scanDefaults(){
    const s=scan?.scan||{};
    const candidate=games.find((g:any)=>g.id===scan?.matchedGameId);
    let awayScore=s.away_score,homeScore=s.home_score;

    if(candidate && (!s.orientation_confident || awayScore==null || homeScore==null)){
      const a=cleanTeam(s.team_a),b=cleanTeam(s.team_b);
      const away=cleanTeam(candidate.away?.abbreviation),home=cleanTeam(candidate.home?.abbreviation);
      if(a&&b){
        if(a===away){awayScore=s.team_a_score;homeScore=s.team_b_score}
        else if(b===away){awayScore=s.team_b_score;homeScore=s.team_a_score}
      }
    }
    return {s,candidate,awayScore,homeScore,stats:s.stats||{}};
  }
  const sd=scanDefaults();

  if(!data)return <div className="card">{x("Control Room wird geladen…","Loading Control Room…")}</div>;
  if(data.error)return <div className="card"><h2>{x("Control Room nicht verfügbar","Control Room unavailable")}</h2><p>{data.error}</p><a href="/universes">{x("Universe auswählen →","Select universe →")}</a></div>;

  return <div className="adminStack">
    {msg&&<div className="notice">{msg}</div>}

    <section className="panel">
      <span className="eyebrow">SCREENSHOT IMPORT</span>
      <h2>{x("2K-Screenshot oder Handyfoto auslesen","Read 2K screenshot or phone photo")}</h2>
      <p className="muted">
        Lade bis zu vier Bilder vom selben Spiel hoch. Scoreboard und Boxscore können auf getrennten Screenshots liegen.
        Die Bilder werden nur zur Analyse an die KI geschickt und nicht als Foto in deiner Datenbank gespeichert.
      </p>
      <form onSubmit={async e=>{
        e.preventDefault();
        const input=(e.currentTarget.elements.namedItem("screenshots") as HTMLInputElement);
        const files=Array.from(input.files||[]).slice(0,4);
        if(!files.length){setMsg("Fehler: Bitte mindestens ein Bild auswählen.");return}
        const allowed=files.every(f=>["image/jpeg","image/png","image/webp","image/gif"].includes(f.type));
        if(!allowed){setMsg("Fehler: Bitte JPG, PNG, WEBP oder GIF verwenden. HEIC vorher als Screenshot/JPG speichern.");return}
        setBusy(true);setMsg("");
        try{
          const images=await Promise.all(files.map(readFile));
          const r=await api("/api/admin/scoreboard-scan",{images});
          setScan(r);
          setScanKey(x=>x+1);
          setMsg(r.message||"Screenshot analysiert. Werte bitte vor dem Speichern kontrollieren.");
        }catch(err:any){setMsg(`Fehler: ${err.message}`)}
        finally{setBusy(false)}
      }}>
        <label>{x("Bilder auswählen","Choose images")}
          <input name="screenshots" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple capture="environment"/>
        </label>
        <button disabled={busy}>{busy?"Analysiere…":"{x("Screenshot(s) analysieren","Analyze screenshot(s)")}"}</button>
      </form>
      {scan&&<div className="card">
        <b>Erkennung · Confidence {scan.scan?.confidence??0}%</b>
        <p>
          {scan.scan?.team_a||scan.scan?.away_team||"?"} {scan.scan?.team_a_score??scan.scan?.away_score??"?"}
          {" : "}
          {scan.scan?.team_b||scan.scan?.home_team||"?"} {scan.scan?.team_b_score??scan.scan?.home_score??"?"}
        </p>
        <p className="muted">
          {scan.matchedGameId?"Spiel automatisch zugeordnet.":"Mehrere/keine eindeutige Partie gefunden – unten manuell auswählen."}
          {scan.scan?.player_found?" Spieler-Statline erkannt.":" Spieler-Statline nicht eindeutig erkannt."}
        </p>
      </div>}
    </section>

    <section className="panel">
      <span className="eyebrow">GAME ENTRY</span><h2>{x("Spiel + Statline eintragen","Enter game + stat line")}</h2>
      <p className="muted">{x("Es erscheinen nur relevante Spiele deiner gesteuerten Karriere. Nach einem Trade werden nur zukünftige Spiele des neuen Teams angeboten.","Only relevant games from your controlled career are shown. After a trade, only future games from the new team are offered.")}</p>
      <form key={scanKey} onSubmit={e=>{
        e.preventDefault();const form=new FormData(e.currentTarget);
        const stats:any={};
        ["minutes","points","rebounds","assists","steals","blocks","turnovers","fouls","technical_fouls","flagrant_fouls","fgm","fga","tpm","tpa","ftm","fta","plus_minus"].forEach(k=>stats[k]=Number(form.get(k)||0));
        run(()=>api("/api/admin/game",{
          gameId:form.get("gameId"),homeScore:Number(form.get("homeScore")),awayScore:Number(form.get("awayScore")),
          appearanceStatus:form.get("appearanceStatus"),stats,
          started:form.get("started")==="on",fouledOut:form.get("fouledOut")==="on",ejected:form.get("ejected")==="on",
          injured:form.get("injured")==="on",injuryNote:form.get("injuryNote"),storyNotes:form.get("storyNotes"),
          notableText:form.get("notables"),autoMedia:form.get("autoMedia")==="on"
        }),"Spiel gespeichert und Storyline verarbeitet").then(()=>{setScan(null);setScanKey(x=>x+1)}).catch(()=>{})
      }}>
        <label>Spiel<select name="gameId" required defaultValue={scan?.matchedGameId||""}>
          <option value="" disabled>{x("Spiel auswählen","Select game")}</option>
          {future.map((g:any)=><option value={g.id} key={g.id}>{g.game_day} · {g.away?.abbreviation} @ {g.home?.abbreviation} · {g.stage}</option>)}
        </select></label>
        <div className="grid2">
          <label>{x("{x("Auswärts","Away")}-Score","Away score")}<input name="awayScore" type="number" required defaultValue={sd.awayScore??""}/></label>
          <label>{x("{x("Heim","Home")}-Score","Home score")}<input name="homeScore" type="number" required defaultValue={sd.homeScore??""}/></label>
        </div>
        <label>{x("Einsatzstatus","Appearance status")}<select name="appearanceStatus" defaultValue="played"><option value="played">{x("Gespielt","Played")}</option><option value="dnp_injury">{x("DNP – verletzt","DNP – injured")}</option><option value="dnp_coach">DNP – Coach</option><option value="suspended">{x("Gesperrt","Suspended")}</option><option value="inactive">{x("Inaktiv","Inactive")}</option></select></label>
        <div className="statInputs">
          {["minutes","points","rebounds","assists","steals","blocks","turnovers","fouls","fgm","fga","tpm","tpa","ftm","fta","plus_minus"].map(k=><label key={k}><span>{k}</span><input name={k} type="number" step={k==="minutes"?"0.1":"1"} defaultValue={sd.stats?.[k]??0}/></label>)}
          {["technical_fouls","flagrant_fouls"].map(k=><label key={k}><span>{k}</span><input name={k} type="number" defaultValue={0}/></label>)}
        </div>
        <div className="checks">
          <label><input type="checkbox" name="started"/> {x("Starter","Starter")}</label>
          <label><input type="checkbox" name="fouledOut"/> {x("Ausgefoult","Fouled out")}</label>
          <label><input type="checkbox" name="ejected"/> Ejected</label>
          <label><input type="checkbox" name="injured"/> {x("Verletzt","Injured")}</label>
          <label><input type="checkbox" name="autoMedia" defaultChecked/> {x("KI-Medien automatisch","Generate AI media automatically")}</label>
        </div>
        <label>{x("Verletzung / Status","Injury / status")}<textarea name="injuryNote"/></label>
        <label>{x("Story-{x("Notiz","Note")}en","Story notes")}<textarea name="storyNotes" placeholder="Buzzer Beater, Streit, technische Fouls, Poster Dunk, Coach-Reaktion…"/></label>
        <label>{x("Andere auffällige Spieler / Boxscore-{x("Notiz","Note")}en","Other notable players / box-score notes")}<textarea name="notables" placeholder={"Eine Zeile pro Person, z.B.\nLuka Dončić | LAL | dominierte früh, kühlte später ab"}/></label>
        <button disabled={busy}>{x("Spiel abschließen + Welt aktualisieren","Complete game + update world")}</button>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">CUSTOM SCHEDULE</span><h2>{x("Playoff-/Custom-Spiel manuell anlegen","Create playoff/custom game manually")}</h2>
      <p className="muted">{x("Für Playoffs, Play-In, NBA-Cup-Flexspiele oder einen abweichenden MyNBA-Spielplan kannst du jede Partie einzeln setzen.","For playoffs, play-in, NBA Cup flex games or a different MyNBA schedule, you can create every game manually.")}</p>
      <form onSubmit={e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);
        run(()=>api("/api/admin/manual-game",{
          seasonId:f.get("seasonId"),gameDay:f.get("gameDay"),tipoff:f.get("tipoff"),stage:f.get("stage"),
          awayTeamId:f.get("awayTeamId"),homeTeamId:f.get("homeTeamId"),venue:f.get("venue"),notes:f.get("notes"),
          countsTowardStandings:f.get("countsTowardStandings")==="on"
        }),"Manuelles Spiel angelegt").catch(()=>{})
      }}>
        <div className="grid3">
          <label>{x("Saison","Season")}<select name="seasonId" defaultValue={universe.current_season_id||""}>{seasons.map((s:any)=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <label>{x("Datum","Date")}<input name="gameDay" type="date" defaultValue={career.universe_date} required/></label>
          <label>Tipoff<input name="tipoff" type="time" defaultValue="20:00"/></label>
        </div>
        <div className="grid3">
          <label>{x("Auswärts","Away")}<select name="awayTeamId" defaultValue="">{<option value="" disabled>Team</option>}{teams.map((t:any)=><option key={t.id} value={t.id}>{t.abbreviation} · {t.city} {t.name}</option>)}</select></label>
          <label>{x("Heim","Home")}<select name="homeTeamId" defaultValue={career.current_team_id}>{teams.map((t:any)=><option key={t.id} value={t.id}>{t.abbreviation} · {t.city} {t.name}</option>)}</select></label>
          <label>{x("Phase","Stage")}<select name="stage"><option>Regular Season</option><option>Play-In</option><option>Playoffs - Round 1</option><option>Conference Semifinals</option><option>Conference Finals</option><option>NBA Finals</option><option>NBA Cup</option><option>Custom</option></select></label>
        </div>
        <label>{x("Arena optional","Arena optional")}<input name="venue"/></label>
        <label>{x("Notiz","Note")}<textarea name="notes" placeholder="z.B. Game 1 · Best of 7"/></label>
        <label><input name="countsTowardStandings" type="checkbox" defaultChecked/> Für {x("Saison","Season")}-/Playoff-Historie zählen</label>
        <button disabled={busy}>{x("Spiel zum Universe hinzufügen","Add game to universe")}</button>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">SEASON CONTROL</span><h2>Nächste MyNBA-{x("Saison","Season")} starten</h2>
      <p className="muted">Die {x("Saison","Season")} deiner Karriere ist pro Universe getrennt. Alte Statlines und Team-Stints bleiben erhalten.</p>
      <form onSubmit={e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);
        run(()=>api("/api/admin/season",{label:f.get("label"),startDate:f.get("startDate"),endDate:f.get("endDate"),universeDate:f.get("startDate")}),"{x("Saison","Season")} gewechselt").catch(()=>{})
      }}>
        <div className="grid3">
          <label>{x("Bezeichnung","Label")}<input name="label" placeholder="2027-28" required/></label>
          <label>Start<input name="startDate" type="date" required/></label>
          <label>Ende<input name="endDate" type="date" required/></label>
        </div>
        <button disabled={busy}>Neue {x("Saison","Season")} anlegen & aktivieren</button>
      </form>
    </section>

    <section className="panel">
      <div className="panelHead"><div><span className="eyebrow">PLAYER FILE</span><h2>{x("Spielerprofil","Player profile")}</h2></div><strong>{career.current_team?.abbreviation}</strong></div>
      <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>api("/api/admin/profile",{playerName:f.get("playerName"),position:f.get("position"),overall:f.get("overall"),jerseyNumber:f.get("jerseyNumber"),draftYear:f.get("draftYear"),draftRound:f.get("draftRound"),draftPick:f.get("draftPick")}),"{x("Spielerprofil","Player profile")} aktualisiert").catch(()=>{})}}>
        <div className="grid3"><label>Name<input name="playerName" defaultValue={career.player_name}/></label><label>Position<input name="position" defaultValue={career.position||""}/></label><label>OVR<input name="overall" type="number" min="25" max="99" defaultValue={career.overall}/></label></div>
        <div className="grid3"><label>Jersey #<input name="jerseyNumber" type="number" defaultValue={career.jersey_number??""}/></label><label>{x("Draft Jahr","Draft year")}<input name="draftYear" type="number" defaultValue={career.draft_year??""}/></label><label>Pick<input name="draftPick" type="number" defaultValue={career.draft_pick??""}/></label></div>
        <input type="hidden" name="draftRound" value={career.draft_round||1}/><button disabled={busy}>{x("Profil speichern","Save profile")}</button>
      </form>
    </section>

    <section className="panel">
      <div className="panelHead"><div><span className="eyebrow">UNIVERSE CLOCK</span><h2>{x("Datum","Date")} der Karriere</h2></div><strong>{career.universe_date}</strong></div>
      <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>api("/api/admin/date",{date:f.get("date")}),"{x("Datum","Date")} aktualisiert").catch(()=>{})}}>
        <div className="inline"><input name="date" type="date" defaultValue={career.universe_date}/><button disabled={busy}>{x("Datum","Date")} setzen</button></div>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">LEAGUE DATA</span><h2>{x("NBA-Basisspielplan synchronisieren","Sync NBA base schedule")}</h2>
      <p className="muted">{x("Der komplette NBA-Spielplan wird nur als Hintergrund-Datenquelle geladen. In deiner Oberfläche erscheinen trotzdem ausschließlich die Spiele deiner gesteuerten Karriere.","The full NBA schedule is loaded only as background data. Your interface still shows only games from your controlled career.")}</p>
      <button disabled={busy} onClick={()=>run(()=>api("/api/admin/schedule-sync",{}),"Spielplan synchronisiert").catch(()=>{})}>{x("NBA-Spielplan aktualisieren","Update NBA schedule")}</button>
    </section>

    <section className="panel">
      <span className="eyebrow">MEDIA ENGINE</span><h2>Daily Pulse</h2>
      <button disabled={busy} onClick={()=>run(()=>api("/api/admin/world-pulse",{}),"Neue Tagesberichte erzeugt").catch(()=>{})}>{x("Newsroom anwerfen","Run newsroom")}</button>
    </section>

    <section className="panel">
      <span className="eyebrow">TRADE MARKET</span><h2>{x("Trades & Teamwechsel","Trades & team changes")}</h2>
      <p className="muted">Ein Trade beendet den alten Team-Stint. {x("Gespielt","Played")}e alte Partien bleiben in der Karrierehistorie, zukünftige Spiele des alten Teams verschwinden aus deinem Karriere-Spielplan.</p>
      <button disabled={busy} onClick={()=>run(()=>api("/api/admin/trade-market",{}),"Neue Trade-Angebote erzeugt").catch(()=>{})}>{x("Trade-Markt aktualisieren","Update trade market")}</button>
      {offers.length>0&&<div className="offerGrid">{offers.map((o:any)=><div className="offerCard" key={o.id}><b>{o.to_team?.city} {o.to_team?.name}</b><span>Interesse {o.interest_score}/100 · Fairness {o.fairness_score}/100</span><p>{o.package_summary}</p><small>{o.rationale}</small><button disabled={busy} onClick={()=>run(()=>api("/api/admin/trade/accept",{offerId:o.id}),`Trade zu ${o.to_team?.abbreviation} abgeschlossen`).catch(()=>{})}>{x("Angebot annehmen","Accept offer")}</button></div>)}</div>}
      <h3>{x("Manueller Teamwechsel","Manual team change")}</h3>
      <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>api("/api/admin/trade/manual",{toTeamId:f.get("toTeamId"),date:f.get("tradeDate"),notes:f.get("tradeNotes")}),"Teamwechsel gespeichert").catch(()=>{})}}>
        <div className="grid2"><label>{x("Neues Team","New team")}<select name="toTeamId">{teams.filter((t:any)=>t.id!==career.current_team_id).map((t:any)=><option value={t.id} key={t.id}>{t.city} {t.name}</option>)}</select></label><label>{x("Datum","Date")}<input name="tradeDate" type="date" defaultValue={career.universe_date}/></label></div>
        <label>{x("Trade-Paket / Story","Trade package / story")}<textarea name="tradeNotes"/></label><button disabled={busy}>{x("Teamwechsel durchführen","Complete team change")}</button>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">STORY EVENTS</span><h2>{x("Verletzung oder Karriere-Event","Injury or career event")}</h2>
      <div className="grid2">
        <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>api("/api/admin/injury",{startDate:f.get("startDate"),injury:f.get("injury"),severity:f.get("severity"),status:"active"}),"Verletzung gespeichert").catch(()=>{})}}>
          <label>Start<input name="startDate" type="date" defaultValue={career.universe_date}/></label><label>Verletzung<input name="injury" required/></label><label>Schwere<select name="severity"><option>day-to-day</option><option>minor</option><option>moderate</option><option>major</option></select></label><button disabled={busy}>Injury-Arc starten</button>
        </form>
        <div><h3>{x("Aktive Verletzungen","Active injuries")}</h3>{injuries.length?injuries.map((i:any)=><div className="card" key={i.id}><b>{i.injury}</b><p className="muted">{i.start_date} · {i.severity}</p><button disabled={busy} type="button" onClick={()=>run(()=>api("/api/admin/injury/resolve",{injuryId:i.id,endDate:career.universe_date,gamesMissed:0}),"Spieler wieder freigegeben").catch(()=>{})}>{x("Als genesen markieren","Mark as recovered")}</button></div>):<p className="muted">{x("Keine aktive Verletzung.","No active injury.")}</p>}</div>
        <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>api("/api/admin/event",{date:f.get("eventDate"),type:f.get("eventType"),description:f.get("description")}),"Event gespeichert").catch(()=>{})}}>
          <label>{x("Datum","Date")}<input name="eventDate" type="date" defaultValue={career.universe_date}/></label><label>Typ<select name="eventType"><option value="locker_room">Locker Room</option><option value="rivalry">Rivalry</option><option value="coach">Coach</option><option value="contract">Contract</option><option value="suspension">Suspension</option><option value="milestone">Milestone</option><option value="other">{x("Sonstiges","Other")}</option></select></label><label>{x("Beschreibung","Description")}<textarea name="description" required/></label><button disabled={busy}>{x("Story-Event setzen","Add story event")}</button>
        </form>
      </div>
    </section>

    <section className="panel">
      <span className="eyebrow">AWARD TRACKER</span><h2>{x("2K-Award-Race übernehmen","Import 2K award race")}</h2>
      <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>api("/api/admin/award",{award:f.get("award"),rank:Number(f.get("rank")),score:Number(f.get("score")||0),asOfDate:f.get("asOfDate"),note:f.get("note")}),"Award-Snapshot gespeichert").catch(()=>{})}}>
        <div className="grid3"><label>Award<select name="award"><option>Rookie of the Year</option><option>MVP</option><option>Defensive Player of the Year</option><option>Sixth Man of the Year</option><option>Most Improved Player</option></select></label><label>{x("Rang","Rank")}<input name="rank" type="number" min="1" required/></label><label>{x("Score optional","Score optional")}<input name="score" type="number" step="0.1"/></label></div>
        <label>Stand<input name="asOfDate" type="date" defaultValue={career.universe_date}/></label><label>{x("Notiz","Note")}<textarea name="note"/></label><button disabled={busy}>{x("Award Race speichern","Save award race")}</button>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">BACKUP</span><h2>{x("Karriere exportieren","Export career")}</h2>
      <a className="buttonLink" href="/api/admin/backup">{x("Backup herunterladen","Download backup")}</a>
    </section>
  </div>
}
