"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";

const statKeys=[
  "minutes","points","rebounds","assists","steals","blocks","turnovers","fouls",
  "technical_fouls","flagrant_fouls","fgm","fga","tpm","tpa","ftm","fta","plus_minus"
];

const labels:Record<string,string>={
  minutes:"MIN",points:"PTS",rebounds:"REB",assists:"AST",steals:"STL",blocks:"BLK",
  turnovers:"TO",fouls:"PF",technical_fouls:"TECH",flagrant_fouls:"FLG",
  fgm:"FGM",fga:"FGA",tpm:"3PM",tpa:"3PA",ftm:"FTM",fta:"FTA",plus_minus:"+/-"
};

function readFile(file:File){
  return new Promise<string>((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result||""));
    r.onerror=()=>reject(new Error("Bild konnte nicht gelesen werden."));
    r.readAsDataURL(file);
  });
}

function abbr(v:any){return String(v||"").trim().toUpperCase().replace(/[^A-Z]/g,"")}

export default function QuickGameEntry({
  game,
  existingStat,
  existingResult
}:{game:any;existingStat:any;existingResult:any}){
  const router=useRouter();
  const formRef=useRef<HTMLFormElement>(null);
  const [busy,setBusy]=useState(false);
  const [scanBusy,setScanBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const editing=Boolean(existingStat||existingResult);

  function setField(name:string,value:any){
    if(value==null||!formRef.current)return;
    const el=formRef.current.elements.namedItem(name) as HTMLInputElement|null;
    if(el)el.value=String(value);
  }

  async function scanScreenshots(files:File[]){
    if(!files.length){setMsg("Bitte mindestens ein Bild auswählen.");return}
    const allowed=files.every(f=>["image/jpeg","image/png","image/webp","image/gif"].includes(f.type));
    if(!allowed){setMsg("Bitte JPG, PNG, WEBP oder GIF verwenden.");return}

    setScanBusy(true);setMsg("");
    try{
      const images=await Promise.all(files.slice(0,4).map(readFile));
      const r=await fetch("/api/admin/scoreboard-scan",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({images,expectedGameId:game.id})
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);

      const s=j.scan||{};
      const home=abbr(game.home?.abbreviation),away=abbr(game.away?.abbreviation);
      let homeScore=s.home_score,awayScore=s.away_score;

      if(!s.orientation_confident || homeScore==null || awayScore==null){
        const a=abbr(s.team_a),b=abbr(s.team_b);
        if(a===away){awayScore=s.team_a_score;homeScore=s.team_b_score}
        else if(b===away){awayScore=s.team_b_score;homeScore=s.team_a_score}
        else if(a===home){homeScore=s.team_a_score;awayScore=s.team_b_score}
        else if(b===home){homeScore=s.team_b_score;awayScore=s.team_a_score}
      }

      setField("awayScore",awayScore);
      setField("homeScore",homeScore);
      for(const k of statKeys)setField(k,s.stats?.[k]);

      setMsg(
        `Screenshot erkannt · Confidence ${s.confidence??0}%`+
        (s.player_found?" · Spieler-Statline übernommen":" · Spieler-Statline bitte prüfen")
      );
    }catch(err:any){
      setMsg(`Fehler beim Screenshot-Import: ${err.message}`);
    }finally{
      setScanBusy(false);
    }
  }

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);setMsg("");
    try{
      const f=new FormData(e.currentTarget);
      const stats:any={};
      for(const k of statKeys) stats[k]=Number(f.get(k)||0);

      const r=await fetch("/api/admin/game",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          gameId:game.id,
          awayScore:Number(f.get("awayScore")),
          homeScore:Number(f.get("homeScore")),
          appearanceStatus:f.get("appearanceStatus"),
          stats,
          started:f.get("started")==="on",
          fouledOut:f.get("fouledOut")==="on",
          ejected:f.get("ejected")==="on",
          injured:f.get("injured")==="on",
          injuryNote:f.get("injuryNote"),
          storyNotes:f.get("storyNotes"),
          notableText:f.get("notables"),
          autoMedia:f.get("autoMedia")==="on"
        })
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);
      setMsg(editing?"Spiel aktualisiert.":"Spiel gespeichert.");
      router.refresh();
    }catch(err:any){
      setMsg(`Fehler: ${err.message}`);
    }finally{
      setBusy(false);
    }
  }

  return <section className="panel quickEntry" id="stats">
    <div className="sectionHead">
      <div>
        <span className="eyebrow">{editing?"GAME EDITOR":"QUICK GAME ENTRY"}</span>
        <h2>{editing?"Spiel & Stats bearbeiten":"Spiel direkt eintragen"}</h2>
      </div>
      <span className="pill">{game.away?.abbreviation} @ {game.home?.abbreviation}</span>
    </div>

    <div className="screenshotInline">
      <div>
        <b>Screenshot / Handyfoto</b>
        <p className="muted">Scoreboard oder Boxscore auswählen – erkannte Werte werden direkt in dieses Match übernommen.</p>
      </div>
      <label className="uploadButton">
        {scanBusy?"Analysiere…":"Screenshot(s) auswählen"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          capture="environment"
          disabled={scanBusy}
          onChange={e=>scanScreenshots(Array.from(e.target.files||[]))}
        />
      </label>
    </div>

    <p className="muted">
      Endstand und deine Statline hier direkt speichern. Danach werden Karrierewerte, Milestones und auf Wunsch die KI-Berichterstattung aktualisiert.
    </p>
    {msg&&<div className="notice inlineNotice">{msg}</div>}

    <form ref={formRef} onSubmit={submit}>
      <div className="grid2">
        <label>{game.away?.abbreviation} · Auswärts-Score
          <input name="awayScore" type="number" min="0" required defaultValue={existingResult?.away_score??""}/>
        </label>
        <label>{game.home?.abbreviation} · Heim-Score
          <input name="homeScore" type="number" min="0" required defaultValue={existingResult?.home_score??""}/>
        </label>
      </div>

      <label>Einsatzstatus
        <select name="appearanceStatus" defaultValue={existingStat?.appearance_status||"played"}>
          <option value="played">Gespielt</option>
          <option value="dnp_injury">DNP – verletzt</option>
          <option value="dnp_coach">DNP – Coach</option>
          <option value="suspended">Gesperrt</option>
          <option value="inactive">Inaktiv</option>
        </select>
      </label>

      <div className="statInputs">
        {statKeys.map(k=><label key={k}>
          <span>{labels[k]}</span>
          <input name={k} type="number" step={k==="minutes"?"0.1":"1"} defaultValue={existingStat?.[k]??0}/>
        </label>)}
      </div>

      <div className="checks">
        <label><input type="checkbox" name="started" defaultChecked={Boolean(existingStat?.started)}/> Starter</label>
        <label><input type="checkbox" name="fouledOut" defaultChecked={Boolean(existingStat?.fouled_out)}/> Ausgefoult</label>
        <label><input type="checkbox" name="ejected" defaultChecked={Boolean(existingStat?.ejected)}/> Ejected</label>
        <label><input type="checkbox" name="injured" defaultChecked={Boolean(existingStat?.injured)}/> Verletzt</label>
        <label><input type="checkbox" name="autoMedia" defaultChecked={!editing}/>{editing?"Neue KI-Berichte erzeugen":"KI-Medien automatisch"}</label>
      </div>

      <label>Verletzung / Status<textarea name="injuryNote" defaultValue={existingStat?.injury_note||""}/></label>
      <label>Story-Notizen<textarea name="storyNotes" defaultValue={existingStat?.story_notes||existingResult?.story_notes||""} placeholder="Clutch, Buzzer Beater, Streit, Poster Dunk, Coach-Reaktion…"/></label>
      <label>Andere auffällige Spieler / Boxscore-Notizen<textarea name="notables" placeholder={"Eine Zeile pro Spieler, z.B.\nStephen Curry | GSW | heißer Start"}/></label>

      <button disabled={busy}>{busy?"Speichere…":editing?"Änderungen speichern":"Spiel abschließen + Stats speichern"}</button>
    </form>
  </section>
}
