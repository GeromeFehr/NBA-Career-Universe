"use client";
import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import DraftFields from "@/components/DraftFields";
import QuickGameEntry from "@/components/QuickGameEntry";
import StatusMessage from "@/components/StatusMessage";
import {label,stageLabel} from "@/lib/labels";

async function api(path:string,body?:any,method="POST"){
  const r=await fetch(path,{method,headers:{"content-type":"application/json"},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);
  return j;
}


export default function AdminConsole({language,initialData}:{language:"de"|"en";initialData:any}){
  const router=useRouter();
  const [selectedGame,setSelectedGame]=useState("");
  const en=language==="en";
  const tx=(de:string,enText:string)=>en?enText:de;

  const [data,setData]=useState<any>(initialData);
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(()=>{setData(initialData)},[initialData]);
  const refresh=async()=>router.refresh();

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

  if(!data)return <div className="card">{tx("Control Room wird geladen…","Loading Control Room…")}</div>;
  if(data.error)return <div className="card"><h2>{tx("Control Room nicht verfügbar","Control Room unavailable")}</h2><p>{data.error}</p></div>;

  return <div className="adminStack">
    {msg&&<StatusMessage tone={msg.startsWith(tx("Fehler","Error"))?"error":"success"}>{msg}</StatusMessage>}

    <nav className="controlTabs" aria-label={tx("Bereiche der Verwaltung","Control room sections")}>
      {[["game-entry",tx("Spiel eintragen","Game entry")],["custom-schedule",tx("Spielplan","Schedule")],["profile",tx("Spieler","Player")],["media",tx("Redaktion","Newsroom")],["trade",tx("Teamwechsel","Team change")],["events",tx("Ereignisse","Events")],["awards","Awards"]].map(([id,text])=><a key={id} href={"#"+id}>{text}</a>)}
    </nav>
    <section className="panel" id="game-entry"><h2>{tx("Ein Spiel festhalten","Put a game on record")}</h2><label>{tx("Partie auswählen","Choose a matchup")}<select value={selectedGame} onChange={e=>setSelectedGame(e.target.value)}><option value="">{tx("Spiel auswählen…","Choose a game…")}</option>{future.map((g:any)=><option key={g.id} value={g.id}>{g.game_day} · {g.away?.abbreviation} @ {g.home?.abbreviation} · {stageLabel(g.stage,language)}</option>)}</select></label>
    {selectedGame&&games.find((g:any)=>g.id===selectedGame)?<QuickGameEntry key={selectedGame} game={games.find((g:any)=>g.id===selectedGame)} existingStat={null} existingResult={null} language={language} autoMedia={data.settings?.auto_media!==false}/>:<p className="muted">{tx("Wähle eine Partie. Danach kannst du einen Screenshot importieren oder die Werte selbst eintragen.","Choose a matchup, then import a screenshot or enter the values yourself.")}</p>}<Link href="/schedule">{tx("Bereits gespielte Partien öffnen und korrigieren","Open and correct completed games")} →</Link></section>

    <section className="panel" id="custom-schedule">
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
          <label>{tx("Phase","Stage")}<select name="stage">{["Regular Season","Play-In","Playoffs - Round 1","Conference Semifinals","Conference Finals","NBA Finals","NBA Cup","Custom"].map(x=><option key={x} value={x}>{stageLabel(x,language)}</option>)}</select></label>
        </div>
        <label>{tx("Arena optional","Arena optional")}<input name="venue"/></label>
        <label>{tx("Notiz","Note")}<textarea name="notes"/></label>
        <label><input name="countsTowardStandings" type="checkbox" defaultChecked/> {tx("Für Saison-/Playoff-Historie zählen","Count toward season/playoff history")}</label>
        <button disabled={busy}>{tx("Spiel zum Universe hinzufügen","Add game to universe")}</button>
      </form>
    </section>

    <section className="panel" id="season">
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

    <section className="panel" id="profile">
      <h2>{tx("Spielerprofil","Player profile")}</h2>
      <form onSubmit={e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);
        run(()=>api("/api/admin/profile",{
          playerName:f.get("playerName"),position:f.get("position"),overall:f.get("overall"),
          jerseyNumber:f.get("jerseyNumber"),draftYear:f.get("draftYear"),draftRound:f.get("draftRound"),draftPick:f.get("draftPick"),draftStatus:f.get("draftStatus"),rookieSeasonId:f.get("rookieSeasonId")
        }),tx("Spielerprofil aktualisiert","Player profile updated")).catch(()=>{});
      }}>
        <div className="grid3">
          <label>Name<input name="playerName" defaultValue={career.player_name}/></label>
          <label>Position<input name="position" defaultValue={career.position||""}/></label>
          <label>OVR<input name="overall" type="number" min="25" max="99" defaultValue={career.overall}/></label>
        </div>
        <div className="grid2">
          <label>{tx("Trikotnummer","Jersey number")}<input name="jerseyNumber" type="number" defaultValue={career.jersey_number??""}/></label>
          <label>{tx("Rookie-Saison","Rookie season")}<select name="rookieSeasonId" defaultValue={career.rookie_season_id||""}><option value="">{tx("Nicht bekannt","Unknown")}</option>{seasons.map((s:any)=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        </div>
        <DraftFields key={`${career.id}:${career.updated_at}`} career={career} language={language}/><button disabled={busy}>{tx("Profil speichern","Save profile")}</button>
      </form>
    </section>

    <section className="panel" id="clock">
      <h2>{tx("Datum der Karriere","Career date")}</h2>
      <form onSubmit={e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);
        run(()=>api("/api/admin/date",{date:f.get("date")}),tx("Datum aktualisiert","Date updated")).catch(()=>{});
      }}>
        <div className="inline"><input name="date" type="date" defaultValue={career.universe_date}/><button disabled={busy}>{tx("Datum setzen","Set date")}</button></div>
      </form>
    </section>

    <section className="panel" id="schedule-sync">
      <h2>{tx("NBA-Basisspielplan synchronisieren","Sync NBA base schedule")}</h2>
      <p className="muted">{tx(
        "Der komplette NBA-Spielplan wird nur als Hintergrund-Datenquelle geladen. Angezeigt werden weiterhin nur die Spiele deiner Karriere.",
        "The complete NBA schedule is loaded only as background data. Your interface still shows only games from your career."
      )}</p>
      <button disabled={busy} onClick={()=>run(()=>api("/api/admin/schedule-sync",{}),tx("Spielplan synchronisiert","Schedule synced")).catch(()=>{})}>{tx("NBA-Spielplan aktualisieren","Update NBA schedule")}</button>
    </section>

    <section className="panel" id="media">
      <h2>{tx("Der Tagesbericht","The daily report")}</h2>
      <p className="muted">{tx(
        "Erzeugt zusätzliche News, Expertenmeinungen, Social-Reaktionen, Zweifel und kritische Stimmen.",
        "Generates extra news, expert opinions, social reactions, doubts and critical voices."
      )}</p>
      <button disabled={busy} onClick={()=>run(()=>api("/api/admin/world-pulse",{}),tx("Neue Tagesberichte erzeugt","New daily coverage generated")).catch(()=>{})}>{tx("Newsroom anwerfen","Run newsroom")}</button>
    </section>

    <section className="panel" id="trade">
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

    <section className="panel" id="events">
      <h2>{tx("Verletzung oder Karriere-Event","Injury or career event")}</h2>
      <div className="grid2">
        <form onSubmit={e=>{
          e.preventDefault();const f=new FormData(e.currentTarget);
          run(()=>api("/api/admin/injury",{startDate:f.get("startDate"),injury:f.get("injury"),severity:f.get("severity"),status:"active"}),tx("Verletzung gespeichert","Injury saved")).catch(()=>{});
        }}>
          <label>{tx("Start","Start")}<input name="startDate" type="date" defaultValue={career.universe_date}/></label>
          <label>{tx("Verletzung","Injury")}<input name="injury" required/></label>
          <label>{tx("Schwere","Severity")}<select name="severity">{["day-to-day","minor","moderate","major"].map(x=><option key={x} value={x}>{label(x,language)}</option>)}</select></label>
          <button disabled={busy}>{tx("Injury-Arc starten","Start injury arc")}</button>
        </form>
        <div>
          <h3>{tx("Aktive Verletzungen","Active injuries")}</h3>
          {injuries.length?injuries.map((i:any)=><div className="card" key={i.id}><b>{i.injury}</b><p className="muted">{i.start_date} · {label(i.severity,language)}</p><button disabled={busy} onClick={()=>run(()=>api("/api/admin/injury/resolve",{injuryId:i.id,endDate:career.universe_date,gamesMissed:0}),tx("Spieler wieder freigegeben","Player cleared")).catch(()=>{})}>{tx("Als genesen markieren","Mark as recovered")}</button></div>):<p className="muted">{tx("Keine aktive Verletzung.","No active injury.")}</p>}
        </div>
        <form onSubmit={e=>{
          e.preventDefault();const f=new FormData(e.currentTarget);
          run(()=>api("/api/admin/event",{date:f.get("eventDate"),type:f.get("eventType"),description:f.get("description")}),tx("Event gespeichert","Event saved")).catch(()=>{});
        }}>
          <label>{tx("Datum","Date")}<input name="eventDate" type="date" defaultValue={career.universe_date}/></label>
          <label>{tx("Typ","Type")}<select name="eventType"><option value="locker_room">{label("locker_room",language)}</option><option value="rivalry">{label("rivalry",language)}</option><option value="coach">{label("coach",language)}</option><option value="contract">{label("contract",language)}</option><option value="suspension">{label("suspension",language)}</option><option value="milestone">{label("milestone",language)}</option><option value="other">{tx("Sonstiges","Other")}</option></select></label>
          <label>{tx("Beschreibung","Description")}<textarea name="description" required/></label>
          <button disabled={busy}>{tx("Story-Event setzen","Add story event")}</button>
        </form>
      </div>
    </section>

    <section className="panel" id="awards">
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

    <section className="panel" id="backup">
      <h2>{tx("Karriere exportieren","Export career")}</h2>
      <a className="buttonLink" href="/api/admin/backup">{tx("Backup herunterladen","Download backup")}</a>
    </section>
  </div>;
}
