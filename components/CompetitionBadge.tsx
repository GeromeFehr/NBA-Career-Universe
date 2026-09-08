"use client";
import {useState} from "react";
import {competitionKey} from "@/lib/logo-sources";
export default function CompetitionBadge({stage,small=false}:{stage?:string;small?:boolean}) {
  const [failed,setFailed]=useState(false);const key=competitionKey(stage);
  return <span className={"competitionBadge"+(small?" small":"")} title={stage||"NBA"}>
    {!failed&&["NBA","FINALS"].includes(key)?<img src={"/logos/competitions/"+key+(key==="FINALS"?".png":".svg")} width="64" height="36" alt={stage||"NBA"} onError={()=>setFailed(true)}/>:<b>{key==="PLAYOFFS"?"Playoffs":key==="FINALS"?"Finals":key==="ALLSTAR"?"All-Star":key}</b>}
  </span>;
}
