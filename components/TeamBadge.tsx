"use client";
import {useState,type CSSProperties} from "react";
export default function TeamBadge({team,small=false}:{team:any;small?:boolean}) {
  const [failed,setFailed]=useState(false);
  const code=String(team?.abbreviation||"—");
  const hasLogo=/^[A-Z]{3}$/.test(code);
  return <span className={"teamBadge"+(small?" small":"")} style={{"--team":team?.primary_color||"#334155"} as CSSProperties} title={[team?.city,team?.name].filter(Boolean).join(" ")}>
    {hasLogo&&!failed?<img src={"/logos/teams/"+code+".svg"} width={small?36:64} height={small?36:64} alt={code} loading="lazy" onError={()=>setFailed(true)}/>:<b>{code}</b>}
  </span>;
}
