"use client";
import {useState} from "react";
import type {RecordHighlight} from "@/lib/record-highlights";
import type {AppLanguage} from "@/lib/i18n";

export default function RecordSpotlight({items,language}:{items:RecordHighlight[];language:AppLanguage}){
 const [page,setPage]=useState(0),en=language==="en",pages=Math.ceil(items.length/3),active=pages?page%pages:0;
 if(!items.length)return <p className="muted">{en?"The record book is ready for your first appearance.":"Das Rekordbuch wartet auf deinen ersten Einsatz."}</p>;
 return <div className="recordSpotlight">
  <p className="muted">{en?"Entire career · appearances only":"Gesamte Karriere · nur tatsächliche Einsätze"}</p>
  <div aria-live="polite" aria-atomic="true">{items.slice(active*3,active*3+3).map(item=><article className="railStory" key={item.id}>
   <small>{item.kind==="count"?(en?"Number of games":"Anzahl Spiele"):"Career High"}</small>
   <h3>{item.title}</h3><p className="recordSpotlightValue"><strong>{item.value}</strong> {item.unit}</p>
  </article>)}</div>
  {pages>1&&<div className="recordSpotlightControls"><button type="button" className="secondaryButton" onClick={()=>setPage((active+pages-1)%pages)} aria-label={en?"Previous statistics":"Vorherige Werte"}>←</button><span>{active+1} / {pages}</span><button type="button" className="secondaryButton" onClick={()=>setPage((active+1)%pages)}>{en?"More stats":"Weitere Werte"} →</button></div>}
 </div>;
}
