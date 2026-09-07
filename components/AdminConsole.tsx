"use client";
import {useEffect,useMemo,useState} from "react";
import {optimizeImages} from "@/lib/image-optimize";

async function api(path:string,body?:any,method="POST"){
  const r=await fetch(path,{method,headers:{"content-type":"application/json"},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);
  return j;
}

function cleanTeam(v:any){return String(v||"").trim().toUpperCase().replace(/[^A-Z]/g,"")}

export default function AdminConsole({language}:{language:"de"|"en"}){
  const en=language==="en";
  const tx=(de:string,enText:string)=>en?enText:de;

  const [data,setData]=useState<any>(null);
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const [scan,setScan]=useState<any>(null);
  const [scanKey,setScanKey]=useState(0);

  const refresh=async()=>{
    const r=await fetch("/api/public/bootstrap",{cache:"no-store"});
    setData(await r.json());
  };
  useEffect(()=>{refresh()},[]);

  async function run(fn:()=>Promise<any>,ok:string){
    setBusy(true);setMsg("");
    try{
      const r=await fn();
      setMsg(ok+(r?.message?` · ${r.message}`:""));
      await refresh();
      return r;
    }catch(e:any){
      setMsg(`${tx("Fehler","Error")}: ${e.message}`);
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
    if(candidate&&(!s.orientation_confident||awayScore==null||homeScore==null)){
      const a=cleanTeam(s.team_a),b=cleanTeam(s.team_b);
      const away=cleanTeam(candidate.away?.abbreviation);
      if(a&&b){
        if(a===away){awayScore=s.team_a_score;homeScore=s.team_b_score}
        else if(b===away){awayScore=s.team_b_score;homeScore=s.team_a_score}
      }
    }
    return {awayScore,homeScore,stats:s.stats||{}};
  }
  const sd=scanDefaults();

  if(!data)return <div className="card">{tx("Control Room wird geladen…","Loading Control Room…")}</div>;
  if(data.error)return <div className="card"><h2>{tx("Control Room nicht verfügbar","Control Room unavailable")}</h2><p>{data.error}</p></div>;

  return <div className="adminStack">
    {msg&&<div className="notice">{msg}</div>}

    <section className="panel">
      <span className="eyebrow">SCREENSHOT IMPORT</span>
      <h2>{tx("2K-Screenshot oder Handyfoto auslesen","Read 2K screenshot or phone photo")}</h2>
      <p className="muted">{tx(
        "Starte möglichst mit einem Bild. Maximal zwei Bilder werden verkleinert und im Sparmodus analysiert. Das zweite Bild nur nutzen, wenn Scoreboard und Boxscore getrennt sind.",
        "Start with one image when possible. Up to two images are resized and analyzed in economy mode. Use the second only when scoreboard and box score are separate."
      )}</p>
      <form onSubmit={async e=>{
        e.preventDefault();
        const input=e.currentTarget.elements.namedItem("screenshots") as HTMLInputElement;
        const files=Array.from(input.files||[]).slice(0,2);
        if(!files.length){setMsg(tx("Bitte mindestens ein Bild auswählen.","Please select at least one image."));return}
        if(!files.every(f=>["image/jpeg","image/png","image/webp","image/gif"].includes(f.type))){
          setMsg(tx("Bitte JPG, PNG, WEBP oder GIF verwenden.","Please use JPG, PNG, WEBP or GIF."));
          return;
        }
        setBusy(true);setMsg("");
        try{
          const optimized=await optimizeImages(files,2);
          const images=optimized.map(x=>x.dataUrl);
          const imageMeta=optimized.map(x=>({originalBytes:x.originalBytes,optimizedBytes:x.optimizedBytes,width:x.width,height:x.height}));
          const r=await api("/api/admin/scoreboard-scan",{images,imageMeta,precision:"low"});
          setScan(r);setScanKey(v=>v+1);
          setMsg(r.message||tx("Screenshot analysiert. Werte bitte prüfen.","Screenshot analyzed. Please review the values."));
        }catch(err:any){setMsg(`${tx("Fehler","Error")}: ${err.message}`)}
        finally{setBusy(false)}
      }}>
        <label>{tx("1–2 Bilder auswählen","Choose 1–2 images")}
          <input name="screenshots" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple capture="environment"/>
        </label>
        <button disabled={busy}>{busy?tx("Analysiere…","Analyzing…"):tx("Screenshot(s) analysieren","Analyze screenshot(s)")}</button>
      </form>
      {scan&&<div className="card">
        <b>{tx("Erkennung","Recognition")} · Confidence {scan.scan?.confidence??0}%</b>
        <p>{scan.scan?.team_a||scan.scan?.away_team||"?"} {scan.scan?.team_a_score??scan.scan?.away_score??"?"} : {scan.scan?.team_b||scan.scan?.home_team||"?"} {scan.scan?.team_b_score??scan.scan?.home_score??"?"}</p>
      </div>}
    </section>

    <section className="panel">
      <span className="eyebrow">GAME ENTRY</span>
      <h2>{tx("Spiel + Statline eintragen","Enter game + stat line")}</h2>
      <p className="muted">{tx(
        "Es erscheinen nur relevante Spiele deiner gesteuerten Karriere. Nach einem Trade werden nur zukünftige Spiele des neuen Teams angeboten.",
        "Only relevant games from your controlled career are shown. After a trade, only future games from the new team are offered."
      )}</p>
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
        }),tx("Spiel gespeichert und Storyline verarbeitet","Game saved and storyline processed"))
          .then(()=>{setScan(null);setScanKey(v=>v+1)}).catch(()=>{});
      }}>
        <label>{tx("Spiel","Game")}
          <select name="gameId" required defaultValue={scan?.matchedGameId||""}>
            <option value="" disabled>{tx("Spiel auswählen","Select game")}</option>
            {future.map((g:any)=><option value={g.id} key={g.id}>{g.game_day} · {g.away?.abbreviation} @ {g.home?.abbreviation} · {g.stage}</option>)}
          </select>
        </label>
        <div className="grid2">
          <label>{tx("Auswärts-Score","Away score")}<input name="awayScore" type="number" required defaultValue={sd.awayScore??""}/></label>
          <label>{tx("Heim-Score","Home score")}<input name="homeScore" type="number" required defaultValue={sd.homeScore??""}/></label>
        </div>
        <label>{tx("Einsatzstatus","Appearance status")}
          <select name="appearanceStatus" defaultValue="played">
            <option value="played">{tx("Gespielt","Played")}</option>
            <option value="dnp_injury">{tx("DNP – verletzt","DNP – injured")}</option>
            <option value="dnp_coach">{tx("DNP – Coach","DNP – coach decision")}</option>
            <option value="suspended">{tx("Gesperrt","Suspended")}</option>
            <option value="inactive">{tx("Inaktiv","Inactive")}</option>
          </select>
        </label>
        <div className="statInputs">
          {["minutes","points","rebounds","assists","steals","blocks","turnovers","fouls","fgm","fga","tpm","tpa","ftm","fta","plus_minus"].map(k=><label key={k}><span>{k}</span><input name={k} type="number" step={k==="minutes"?"0.1":"1"} defaultValue={sd.stats?.[k]??0}/></label>)}
          {["technical_fouls","flagrant_fouls"].map(k=><label key={k}><span>{k}</span><input name={k} type="number" defaultValue={0}/></label>)}
        </div>
        <div className="checks">
          <label><input type="checkbox" name="started"/> Starter</label>
          <label><input type="checkbox" name="fouledOut"/> {tx("Ausgefoult","Fouled out")}</label>
          <label><input type="checkbox" name="ejected"/> Ejected</label>
          <label><input type="checkbox" name="injured"/> {tx("Verletzt","Injured")}</label>
          <label><input type="checkbox" name="autoMedia" defaultChecked/> {tx("KI-Medien automatisch","Generate AI media automatically")}</label>
        </div>
        <label>{tx("Verletzung / Status","Injury / status")}<textarea name="injuryNote"/></label>
        <label>{tx("Story-Notizen","Story notes")}<textarea name="storyNotes"/></label>
        <label>{tx("Andere auffällige Spieler / Boxscore-Notizen","Other notable players / box-score notes")}<textarea name="notables"/></label>
        <button disabled={busy}>{tx("Spiel abschließen + Welt aktualisieren","Complete game + update world")}</button>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">CUSTOM SCHEDULE</span>
      <h2>{tx("Playoff-/Custom-Spiel manuell anlegen","Create playoff/custom game manually")}</h2>
      <p className="muted">{tx(
        "Für Playoffs, Play-In, NBA-Cup-Flexspiele oder einen abweichenden MyNBA-Spielplan kannst du jede Partie einzeln setzen.",
        "For playoffs, play-in, NBA Cup flex games or a different MyNBA schedule, you can create every game manually."
      )}</p>
      <form onSubmit={e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);
        run(()=>api("/api/admin/manual-game",{
          seasonId:f.get("seasonId"),gameDay:f.get("gameDay"),tipoff:f.get("tipoff"),stage:f.get("stage"),
          awayTeamId:f.get("awayTeamId"),homeTeamId:f.get("homeTeamId"),venue:f.get("venue"),notes:f.get("notes"),
          countsTowardStandings:f.get("countsTowardStandings")==="on"
        }),tx("Manuelles Spiel angelegt","Manual game created")).catch(()=>{});
      }}>
        <div className="grid3">
          <label>{tx("Saison","Season")}<select name="seasonId" defaultValue={universe.current_season_id||""}>{seasons.map((s:any)=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
          <label>{tx("Datum","Date")}<input name="gameDay" type="date" defaultValue={career.universe_date} required/></label>
          <label>Tipoff<input name="tipoff" type="time" defaultValue="20:00"/></label>
        </div>
        <div className="grid3">
          <label>{tx("Auswärts","Away")}<select name="awayTeamId" defaultValue=""><option value="" disabled>Team</option>{teams.map((t:any)=><option key={t.id} value={t.id}>{t.abbreviation} · {t.city} {t.name}</option>)}</select></label>
          <label>{tx("Heim","Home")}<select name="homeTeamId" defaultValue={career.current_team_id}>{teams.map((t:any)=><option key={t.id} value={t.id}>{t.abbreviation} · {t.city} {t.name}</option>)}</select></label>
          <label>{tx("Phase","Stage")}<select name="stage"><option>Regular Season</option><option>Play-In</option><option>Playoffs - Round 1</option><option>Conference Semifinals</option><option>Conference Finals</option><option>NBA Finals</option><option>NBA Cup</option><option>Custom</option></select></label>
        </div>
        <label>{tx("Arena optional","Arena optional")}<input name="venue"/></label>
        <label>{tx("Notiz","Note")}<textarea name="notes"/></label>
        <label><input name="countsTowardStandings" type="checkbox" defaultChecked/> {tx("Für Saison-/Playoff-Historie zählen","Count toward season/playoff history")}</label>
        <button disabled={busy}>{tx("Spiel zum Universe hinzufügen","Add game to universe")}</button>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">SEASON CONTROL</span>
      <h2>{tx("Nächste MyNBA-Saison starten","Start next MyNBA season")}</h2>
      <p className="muted">{tx(
        "Die Saison deiner Karriere ist pro Universe getrennt. Alte Statlines und Team-Stints bleiben erhalten.",
        "Your career season is separated per universe. Old stat lines and team stints remain intact."
      )}</p>
      <form onSubmit={e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);
        run(()=>api("/api/admin/season",{label:f.get("label"),startDate:f.get("startDate"),endDate:f.get("endDate"),universeDate:f.get("startDate")}),tx("Saison gewechselt","Season changed")).catch(()=>{});
      }}>
        <div className="grid3">
          <label>{tx("Bezeichnung","Label")}<input name="label" placeholder="2027-28" required/></label>
          <label>{tx("Start","Start")}<input name="startDate" type="date" required/></label>
          <label>{tx("Ende","End")}<input name="endDate" type="date" required/></label>
        </div>
        <button disabled={busy}>{tx("Neue Saison anlegen & aktivieren","Create & activate new season")}</button>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">PLAYER FILE</span>
      <h2>{tx("Spielerprofil","Player profile")}</h2>
      <form onSubmit={e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);
        run(()=>api("/api/admin/profile",{
          playerName:f.get("playerName"),position:f.get("position"),overall:f.get("overall"),
          jerseyNumber:f.get("jerseyNumber"),draftYear:f.get("draftYear"),draftRound:1,draftPick:f.get("draftPick")
        }),tx("Spielerprofil aktualisiert","Player profile updated")).catch(()=>{});
      }}>
        <div className="grid3">
          <label>Name<input name="playerName" defaultValue={career.player_name}/></label>
          <label>Position<input name="position" defaultValue={career.position||""}/></label>
          <label>OVR<input name="overall" type="number" min="25" max="99" defaultValue={career.overall}/></label>
        </div>
        <div className="grid3">
          <label>Jersey #<input name="jerseyNumber" type="number" defaultValue={career.jersey_number??""}/></label>
          <label>{tx("Draft Jahr","Draft year")}<input name="draftYear" type="number" defaultValue={career.draft_year??""}/></label>
          <label>Pick<input name="draftPick" type="number" defaultValue={career.draft_pick??""}/></label>
        </div>
        <button disabled={busy}>{tx("Profil speichern","Save profile")}</button>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">UNIVERSE CLOCK</span>
      <h2>{tx("Datum der Karriere","Career date")}</h2>
      <form onSubmit={e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);
        run(()=>api("/api/admin/date",{date:f.get("date")}),tx("Datum aktualisiert","Date updated")).catch(()=>{});
      }}>
        <div className="inline"><input name="date" type="date" defaultValue={career.universe_date}/><button disabled={busy}>{tx("Datum setzen","Set date")}</button></div>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">LEAGUE DATA</span>
      <h2>{tx("NBA-Basisspielplan synchronisieren","Sync NBA base schedule")}</h2>
      <p className="muted">{tx(
        "Der komplette NBA-Spielplan wird nur als Hintergrund-Datenquelle geladen. Angezeigt werden weiterhin nur die Spiele deiner Karriere.",
        "The complete NBA schedule is loaded only as background data. Your interface still shows only games from your career."
      )}</p>
      <button disabled={busy} onClick={()=>run(()=>api("/api/admin/schedule-sync",{}),tx("Spielplan synchronisiert","Schedule synced")).catch(()=>{})}>{tx("NBA-Spielplan aktualisieren","Update NBA schedule")}</button>
    </section>

    <section className="panel">
      <span className="eyebrow">MEDIA ENGINE</span>
      <h2>Daily Pulse</h2>
      <p className="muted">{tx(
        "Erzeugt zusätzliche News, Expertenmeinungen, Social-Reaktionen, Zweifel und kritische Stimmen.",
        "Generates extra news, expert opinions, social reactions, doubts and critical voices."
      )}</p>
      <button disabled={busy} onClick={()=>run(()=>api("/api/admin/world-pulse",{}),tx("Neue Tagesberichte erzeugt","New daily coverage generated")).catch(()=>{})}>{tx("Newsroom anwerfen","Run newsroom")}</button>
    </section>

    <section className="panel">
      <span className="eyebrow">TRADE MARKET</span>
      <h2>{tx("Trades & Teamwechsel","Trades & team changes")}</h2>
      <button disabled={busy} onClick={()=>run(()=>api("/api/admin/trade-market",{}),tx("Neue Trade-Angebote erzeugt","New trade offers generated")).catch(()=>{})}>{tx("Trade-Markt aktualisieren","Update trade market")}</button>
      {offers.length>0&&<div className="offerGrid">{offers.map((o:any)=><div className="offerCard" key={o.id}>
        <b>{o.to_team?.city} {o.to_team?.name}</b>
        <span>{tx("Interesse","Interest")} {o.interest_score}/100 · Fairness {o.fairness_score}/100</span>
        <p>{o.package_summary}</p><small>{o.rationale}</small>
        <button disabled={busy} onClick={()=>run(()=>api("/api/admin/trade/accept",{offerId:o.id}),tx("Trade abgeschlossen","Trade completed")).catch(()=>{})}>{tx("Angebot annehmen","Accept offer")}</button>
      </div>)}</div>}
      <h3>{tx("Manueller Teamwechsel","Manual team change")}</h3>
      <form onSubmit={e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);
        run(()=>api("/api/admin/trade/manual",{toTeamId:f.get("toTeamId"),date:f.get("tradeDate"),notes:f.get("tradeNotes")}),tx("Teamwechsel gespeichert","Team change saved")).catch(()=>{});
      }}>
        <div className="grid2">
          <label>{tx("Neues Team","New team")}<select name="toTeamId">{teams.filter((t:any)=>t.id!==career.current_team_id).map((t:any)=><option value={t.id} key={t.id}>{t.city} {t.name}</option>)}</select></label>
          <label>{tx("Datum","Date")}<input name="tradeDate" type="date" defaultValue={career.universe_date}/></label>
        </div>
        <label>{tx("Trade-Paket / Story","Trade package / story")}<textarea name="tradeNotes"/></label>
        <button disabled={busy}>{tx("Teamwechsel durchführen","Complete team change")}</button>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">STORY EVENTS</span>
      <h2>{tx("Verletzung oder Karriere-Event","Injury or career event")}</h2>
      <div className="grid2">
        <form onSubmit={e=>{
          e.preventDefault();const f=new FormData(e.currentTarget);
          run(()=>api("/api/admin/injury",{startDate:f.get("startDate"),injury:f.get("injury"),severity:f.get("severity"),status:"active"}),tx("Verletzung gespeichert","Injury saved")).catch(()=>{});
        }}>
          <label>{tx("Start","Start")}<input name="startDate" type="date" defaultValue={career.universe_date}/></label>
          <label>{tx("Verletzung","Injury")}<input name="injury" required/></label>
          <label>{tx("Schwere","Severity")}<select name="severity"><option>day-to-day</option><option>minor</option><option>moderate</option><option>major</option></select></label>
          <button disabled={busy}>{tx("Injury-Arc starten","Start injury arc")}</button>
        </form>
        <div>
          <h3>{tx("Aktive Verletzungen","Active injuries")}</h3>
          {injuries.length?injuries.map((i:any)=><div className="card" key={i.id}><b>{i.injury}</b><p className="muted">{i.start_date} · {i.severity}</p><button disabled={busy} onClick={()=>run(()=>api("/api/admin/injury/resolve",{injuryId:i.id,endDate:career.universe_date,gamesMissed:0}),tx("Spieler wieder freigegeben","Player cleared")).catch(()=>{})}>{tx("Als genesen markieren","Mark as recovered")}</button></div>):<p className="muted">{tx("Keine aktive Verletzung.","No active injury.")}</p>}
        </div>
        <form onSubmit={e=>{
          e.preventDefault();const f=new FormData(e.currentTarget);
          run(()=>api("/api/admin/event",{date:f.get("eventDate"),type:f.get("eventType"),description:f.get("description")}),tx("Event gespeichert","Event saved")).catch(()=>{});
        }}>
          <label>{tx("Datum","Date")}<input name="eventDate" type="date" defaultValue={career.universe_date}/></label>
          <label>{tx("Typ","Type")}<select name="eventType"><option value="locker_room">Locker Room</option><option value="rivalry">Rivalry</option><option value="coach">Coach</option><option value="contract">Contract</option><option value="suspension">Suspension</option><option value="milestone">Milestone</option><option value="other">{tx("Sonstiges","Other")}</option></select></label>
          <label>{tx("Beschreibung","Description")}<textarea name="description" required/></label>
          <button disabled={busy}>{tx("Story-Event setzen","Add story event")}</button>
        </form>
      </div>
    </section>

    <section className="panel">
      <span className="eyebrow">AWARD TRACKER</span>
      <h2>{tx("2K-Award-Race übernehmen","Import 2K award race")}</h2>
      <form onSubmit={e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);
        run(()=>api("/api/admin/award",{award:f.get("award"),rank:Number(f.get("rank")),score:Number(f.get("score")||0),asOfDate:f.get("asOfDate"),note:f.get("note")}),tx("Award-Snapshot gespeichert","Award snapshot saved")).catch(()=>{});
      }}>
        <div className="grid3">
          <label>Award<select name="award"><option>Rookie of the Year</option><option>MVP</option><option>Defensive Player of the Year</option><option>Sixth Man of the Year</option><option>Most Improved Player</option></select></label>
          <label>{tx("Rang","Rank")}<input name="rank" type="number" min="1" required/></label>
          <label>{tx("Score optional","Score optional")}<input name="score" type="number" step="0.1"/></label>
        </div>
        <label>{tx("Stand","As of")}<input name="asOfDate" type="date" defaultValue={career.universe_date}/></label>
        <label>{tx("Notiz","Note")}<textarea name="note"/></label>
        <button disabled={busy}>{tx("Award Race speichern","Save award race")}</button>
      </form>
    </section>

    <section className="panel">
      <span className="eyebrow">BACKUP</span>
      <h2>{tx("Karriere exportieren","Export career")}</h2>
      <a className="buttonLink" href="/api/admin/backup">{tx("Backup herunterladen","Download backup")}</a>
    </section>
  </div>;
}
