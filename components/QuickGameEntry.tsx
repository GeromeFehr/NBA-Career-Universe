"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {optimizeImages} from "@/lib/image-optimize";

const statKeys=[
  "minutes","points","rebounds","assists","steals","blocks","turnovers","fouls",
  "technical_fouls","flagrant_fouls","fgm","fga","tpm","tpa","ftm","fta","plus_minus"
];

const labels:Record<string,string>={
  minutes:"MIN",points:"PTS",rebounds:"REB",assists:"AST",steals:"STL",blocks:"BLK",
  turnovers:"TO",fouls:"PF",technical_fouls:"TECH",flagrant_fouls:"FLG",
  fgm:"FGM",fga:"FGA",tpm:"3PM",tpa:"3PA",ftm:"FTM",fta:"FTA",plus_minus:"+/-"
};

function abbr(v:any){return String(v||"").trim().toUpperCase().replace(/[^A-Z]/g,"")}

export default function QuickGameEntry({
  game,
  existingStat,
  existingResult,
  language
}:{game:any;existingStat:any;existingResult:any;language:"de"|"en"}){
  const router=useRouter();
  const formRef=useRef<HTMLFormElement>(null);
  const [busy,setBusy]=useState(false);
  const [scanBusy,setScanBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const [confidence,setConfidence]=useState<Record<string,number>>({});
  const [lastScanPayload,setLastScanPayload]=useState<{images:string[];imageMeta:any[]}|null>(null);
  const [scanInfo,setScanInfo]=useState("");
  const editing=Boolean(existingStat||existingResult);
  const en=language==="en";
  const criticalConfidence=["home_score","away_score","points","rebounds","assists","fgm","fga"];
  const needsPrecision=Boolean(lastScanPayload)&&criticalConfidence.some(k=>Number(confidence[k]??0)<75);

  function setField(name:string,value:any){
    if(value==null||!formRef.current)return;
    const el=formRef.current.elements.namedItem(name) as HTMLInputElement|null;
    if(el)el.value=String(value);
  }

  async function requestScan(payload:{images:string[];imageMeta:any[]},precision:"low"|"high"){
    setScanBusy(true);setMsg("");
    try{
      const r=await fetch("/api/admin/scoreboard-scan",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({...payload,expectedGameId:game.id,precision})
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);

      const s=j.scan||{};
      setConfidence(s.field_confidence||{});
      const home=abbr(game.home?.abbreviation),away=abbr(game.away?.abbreviation);
      let homeScore=s.home_score,awayScore=s.away_score;

      if(!s.orientation_confident||homeScore==null||awayScore==null){
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
        `${en?"Screenshot recognized":"Screenshot erkannt"} · ${precision==="low"?(en?"economy mode":"Sparmodus"):(en?"high precision":"hohe Genauigkeit")} · Confidence ${s.confidence??0}%`+
        (s.player_found?(en?" · Player stat line imported":" · Spieler-Statline übernommen"):(en?" · Please review player stat line":" · Spieler-Statline bitte prüfen"))
      );
    }catch(err:any){
      setMsg(`${en?"Screenshot import error":"Fehler beim Screenshot-Import"}: ${err.message}`);
    }finally{
      setScanBusy(false);
    }
  }

  async function scanScreenshots(files:File[]){
    if(!files.length){setMsg(en?"Please select at least one image.":"Bitte mindestens ein Bild auswählen.");return}
    const allowed=files.every(f=>["image/jpeg","image/png","image/webp","image/gif"].includes(f.type));
    if(!allowed){setMsg(en?"Please use JPG, PNG, WEBP or GIF.":"Bitte JPG, PNG, WEBP oder GIF verwenden.");return}
    setScanBusy(true);setMsg("");
    try{
      const optimized=await optimizeImages(files,2);
      const payload={
        images:optimized.map(x=>x.dataUrl),
        imageMeta:optimized.map(x=>({
          originalBytes:x.originalBytes,optimizedBytes:x.optimizedBytes,width:x.width,height:x.height
        }))
      };
      setLastScanPayload(payload);
      const before=optimized.reduce((a,x)=>a+x.originalBytes,0);
      const after=optimized.reduce((a,x)=>a+x.optimizedBytes,0);
      setScanInfo(`${optimized.length} ${en?"image(s)":"Bild(er)"} · ${Math.round(before/1024)} KB → ${Math.round(after/1024)} KB`);
      await requestScan(payload,"low");
    }catch(err:any){
      setMsg(`${en?"Image optimization failed":"Bildoptimierung fehlgeschlagen"}: ${err.message}`);
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
      setMsg(editing?(en?"Game updated.":"Spiel aktualisiert."):(en?"Game saved.":"Spiel gespeichert."));
      router.refresh();
    }catch(err:any){
      setMsg(`${en?"Error":"Fehler"}: ${err.message}`);
    }finally{
      setBusy(false);
    }
  }

  return <section className="panel quickEntry" id="stats">
    <div className="sectionHead">
      <div>
        <span className="eyebrow">{editing?"GAME EDITOR":"QUICK GAME ENTRY"}</span>
        <h2>{editing?(en?"Edit game & stats":"Spiel & Stats bearbeiten"):(en?"Enter game directly":"Spiel direkt eintragen")}</h2>
      </div>
      <span className="pill">{game.away?.abbreviation} @ {game.home?.abbreviation}</span>
    </div>

    <div className="screenshotInline">
      <div>
        <b>{en?"Screenshot / phone photo":"Screenshot / Handyfoto"}</b>
        <p className="muted">{en?"Start with one image. It is resized and scanned in economy mode; add a second only if important values are missing.":"Starte möglichst mit einem Bild. Es wird verkleinert und im Sparmodus gelesen; ein zweites Bild nur bei fehlenden Werten."}</p>
      </div>
      <label className="uploadButton">
        {scanBusy?(en?"Analyzing…":"Analysiere…"):(en?"Choose 1–2 screenshot(s)":"1–2 Screenshot(s) auswählen")}
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
      {en?"Save the final score and your stat line here. Career stats, milestones and optional AI coverage are updated afterwards.":"Endstand und deine Statline hier direkt speichern. Danach werden Karrierewerte, Milestones und auf Wunsch die KI-Berichterstattung aktualisiert."}
    </p>
    {msg&&<div className="notice inlineNotice">{msg}</div>}
    {scanInfo&&<p className="muted scanSavings">⚡ {scanInfo}</p>}
    {Object.keys(confidence).length>0&&<div className="confidenceGrid">
      {Object.entries(confidence).filter(([,v])=>Number(v)>0).map(([k,v])=><span className={`confidenceChip ${Number(v)<70?"low":Number(v)<90?"mid":"high"}`} key={k}>
        <b>{k.replaceAll("_"," ")}</b><i>{v}%</i>
      </span>)}
    </div>}
    {needsPrecision&&<button
      type="button"
      className="secondaryButton precisionRetry"
      disabled={scanBusy}
      onClick={()=>requestScan(lastScanPayload,"high")}
    >{en?"Recheck missing/uncertain values with high precision":"Fehlende/unsichere Werte präzise nachprüfen"}</button>}

    <form ref={formRef} onSubmit={submit}>
      <div className="grid2">
        <label>{game.away?.abbreviation} · {en?"Away score":"Auswärts-Score"}
          <input name="awayScore" type="number" min="0" required defaultValue={existingResult?.away_score??""}/>
        </label>
        <label>{game.home?.abbreviation} · {en?"Home score":"Heim-Score"}
          <input name="homeScore" type="number" min="0" required defaultValue={existingResult?.home_score??""}/>
        </label>
      </div>

      <label>{en?"Appearance status":"Einsatzstatus"}
        <select name="appearanceStatus" defaultValue={existingStat?.appearance_status||"played"}>
          <option value="played">{en?"Played":"Gespielt"}</option>
          <option value="dnp_injury">{en?"DNP – injured":"DNP – verletzt"}</option>
          <option value="dnp_coach">{en?"DNP – coach decision":"DNP – Coach"}</option>
          <option value="suspended">{en?"Suspended":"Gesperrt"}</option>
          <option value="inactive">{en?"Inactive":"Inaktiv"}</option>
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
        <label><input type="checkbox" name="fouledOut" defaultChecked={Boolean(existingStat?.fouled_out)}/>{en?" Fouled out":" Ausgefoult"}</label>
        <label><input type="checkbox" name="ejected" defaultChecked={Boolean(existingStat?.ejected)}/> Ejected</label>
        <label><input type="checkbox" name="injured" defaultChecked={Boolean(existingStat?.injured)}/>{en?" Injured":" Verletzt"}</label>
        <label><input type="checkbox" name="autoMedia" defaultChecked={!editing}/>{editing?(en?"Generate new AI coverage":"Neue KI-Berichte erzeugen"):(en?"Generate AI media automatically":"KI-Medien automatisch")}</label>
      </div>

      <label>{en?"Injury / status":"Verletzung / Status"}<textarea name="injuryNote" defaultValue={existingStat?.injury_note||""}/></label>
      <label>{en?"What happened? / Story notes":"Was ist passiert? / Story-Notizen"}
        <textarea name="storyNotes" defaultValue={existingStat?.story_notes||existingResult?.story_notes||""}
          placeholder={en?"Example: 18 points in the fourth, blocked the star, got a tech after trash talk…":"Beispiel: 18 Punkte im 4. Viertel, Star geblockt, Tech nach Trash Talk…"}/>
      </label>
      <label>{en?"Other notable players / box-score notes":"Andere auffällige Spieler / Boxscore-Notizen"}<textarea name="notables" placeholder={"Eine Zeile pro Spieler, z.B.\nStephen Curry | GSW | heißer Start"}/></label>

      <button disabled={busy}>{busy?(en?"Saving…":"Speichere…"):editing?(en?"Save changes":"Änderungen speichern"):(en?"Complete game + save stats":"Spiel abschließen + Stats speichern")}</button>
    </form>
  </section>
}
