"use client";
import {useState} from "react";
import {draftStatus, type DraftStatus} from "@/lib/career-background";

export default function DraftFields({career = {}, language}: {career?: {draft_status?: string; draft_year?: number | null; draft_pick?: number | null; draft_round?: number | null}; language: "de" | "en"}) {
  const en = language === "en";
  const [status, setStatus] = useState<DraftStatus>(draftStatus(career));
  return <>
    <div className="grid2">
      <label>{en ? "NBA entry" : "Weg in die NBA"}<select name="draftStatus" value={status} onChange={e => setStatus(e.target.value as DraftStatus)}>
        <option value="unknown">{en ? "Not specified" : "Noch nicht angegeben"}</option>
        <option value="drafted">{en ? "Drafted" : "Gedraftet"}</option>
        <option value="undrafted">{en ? "Undrafted" : "Nicht gedraftet"}</option>
      </select></label>
      <label>{en ? "Draft class year" : "Draft-Jahrgang"}<input name="draftYear" type="number" min="1946" max="2200" defaultValue={career.draft_year ?? ""}/></label>
    </div>
    {status === "drafted" && <div className="grid2">
      <label>{en ? "Overall pick" : "Pick insgesamt"}<input name="draftPick" type="number" min="1" max="100" required defaultValue={career.draft_pick ?? ""}/></label>
      <label>{en ? "Draft round" : "Draft-Runde"}<select name="draftRound" defaultValue={career.draft_round ?? ""}>
        <option value="">{en ? "Not specified" : "Nicht angegeben"}</option><option value="1">1</option><option value="2">2</option>
      </select></label>
    </div>}
    <p className="muted">{en ? "Your draft background stays with your career. Rookie status follows your rookie season, independently of the draft year." : "Dein Draft-Hintergrund bleibt Teil der Karriere. Der Rookie-Status richtet sich nach deiner Rookie-Saison, unabhängig vom Draftjahr."}</p>
  </>;
}
