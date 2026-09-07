"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import TeamBadge from "@/components/TeamBadge";
import CompetitionBadge from "@/components/CompetitionBadge";

export default function ScheduleExplorer({games,teams,universeDate}:{games:any[];teams:any[];universeDate:string}){
  const [team,setTeam]=useState("ALL"),[status,setStatus]=useState("ALL"),[month,setMonth]=useState("ALL"),[q,setQ]=useState("");
  const months=useMemo(()=>Array.from(new Set(games.map(g=>g.game_day?.slice(0,7)).filter(Boolean))).sort(),[games]);
  const filtered=useMemo(()=>games.filter(g=>{
    const ab=[g.home?.abbreviation,g.away?.abbreviation];
    const names=`${g.home?.city||""} ${g.home?.name||""} ${g.away?.city||""} ${g.away?.name||""}`.toLowerCase();
    return (team==="ALL"||ab.includes(team))&&(status==="ALL"||g.status===status)&&(month==="ALL"||g.game_day?.startsWith(month))&&(!q||names.includes(q.toLowerCase())||ab.join(" ").toLowerCase().includes(q.toLowerCase()));
  }),[games,team,status,month,q]);
  return <section>
    <div className="filterbar">
      <select value={team} onChange={e=>setTeam(e.target.value)}><option value="ALL">Alle Teams</option>{teams.map(t=><option key={t.id}>{t.abbreviation}</option>)}</select>
      <select value={month} onChange={e=>setMonth(e.target.value)}><option value="ALL">Alle Monate</option>{months.map(m=><option key={m}>{m}</option>)}</select>
      <select value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">Alle Status</option><option value="scheduled">Geplant</option><option value="completed">Final</option></select>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Team suchen…"/>
    </div>
    <div className="scheduleList">
      {filtered.map(g=><Link href={g.status==="completed"?`/game/${g.id}`:`/game/${g.id}#stats`} key={g.id} className={`scheduleRow ${g.game_day===universeDate?"todayRow":""}`}>
        <div><b>{g.game_day}</b><small>{new Date(g.game_date).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Berlin"})}</small></div>
        <div className="matchup"><TeamBadge team={g.away} small/><strong>{g.away?.city} {g.away?.name}</strong><span>@</span><TeamBadge team={g.home} small/><strong>{g.home?.city} {g.home?.name}</strong></div>
        <div className="score">{g.status==="completed"?`${g.away_score} : ${g.home_score}`:<span className="scheduleAction">Stats →</span>}</div>
        <div className="competitionCell"><CompetitionBadge stage={g.stage} small/><span className="pill">{g.stage||"Regular"}</span></div>
      </Link>)}
      {!filtered.length&&<div className="empty">Keine Spiele für diesen Filter.</div>}
    </div>
  </section>
}
