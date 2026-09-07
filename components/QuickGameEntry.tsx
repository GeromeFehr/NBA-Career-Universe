"use client";
import {useState} from "react";
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

export default function QuickGameEntry({
  game,
  existingStat,
  existingResult
}:{game:any;existingStat:any;existingResult:any}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const editing=Boolean(existingStat||existingResult);

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
    <p className="muted">
      Endstand und deine Statline hier direkt speichern. Danach werden Karrierewerte, Milestones und auf Wunsch die KI-Berichterstattung aktualisiert.
    </p>
    {msg&&<div className="notice inlineNotice">{msg}</div>}
    <form onSubmit={submit}>
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
          <input
            name={k}
            type="number"
            step={k==="minutes"?"0.1":"1"}
            defaultValue={existingStat?.[k]??0}
          />
        </label>)}
      </div>

      <div className="checks">
        <label><input type="checkbox" name="started" defaultChecked={Boolean(existingStat?.started)}/> Starter</label>
        <label><input type="checkbox" name="fouledOut" defaultChecked={Boolean(existingStat?.fouled_out)}/> Ausgefoult</label>
        <label><input type="checkbox" name="ejected" defaultChecked={Boolean(existingStat?.ejected)}/> Ejected</label>
        <label><input type="checkbox" name="injured" defaultChecked={Boolean(existingStat?.injured)}/> Verletzt</label>
        <label>
          <input type="checkbox" name="autoMedia" defaultChecked={!editing}/>
          {editing?"Neue KI-Berichte erzeugen":"KI-Medien automatisch"}
        </label>
      </div>

      <label>Verletzung / Status
        <textarea name="injuryNote" defaultValue={existingStat?.injury_note||""}/>
      </label>
      <label>Story-Notizen
        <textarea name="storyNotes" defaultValue={existingStat?.story_notes||existingResult?.story_notes||""} placeholder="Clutch, Buzzer Beater, Streit, Poster Dunk, Coach-Reaktion…"/>
      </label>
      <label>Andere auffällige Spieler / Boxscore-Notizen
        <textarea name="notables" placeholder={"Eine Zeile pro Spieler, z.B.\nStephen Curry | GSW | heißer Start"}/>
      </label>

      <button disabled={busy}>{busy?"Speichere…":editing?"Änderungen speichern":"Spiel abschließen + Stats speichern"}</button>
    </form>
  </section>
}
