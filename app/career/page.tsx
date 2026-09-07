import {db} from "@/lib/db"; import {summarizeStats} from "@/lib/stats"; import StatCard from "@/components/StatCard"; import TeamBadge from "@/components/TeamBadge";
export const dynamic="force-dynamic";
export default async function Page(){const client=db();const {data:c}=await client.from("career_profiles").select("*,current_team:teams(*)").limit(1).single();if(!c)return <div className="card">Keine Karriere gefunden.</div>;
 const [{data:s},{data:stints},{data:events},{data:injuries},{data:milestones}]=await Promise.all([
  client.from("player_game_stats").select("*,team:teams(*)").eq("career_id",c.id).order("created_at"),
  client.from("team_stints").select("*,teams(*)").eq("career_id",c.id).order("start_date"),
  client.from("career_events").select("*").eq("career_id",c.id).order("event_date",{ascending:false}),
  client.from("injuries").select("*").eq("career_id",c.id).order("start_date",{ascending:false}),
  client.from("milestones").select("*").eq("career_id",c.id).order("achieved_at",{ascending:false})
 ]);const x=summarizeStats(s||[]);
 return <><section className="hero"><span className="eyebrow">CAREER FILE</span><h1>{c.player_name}</h1><p>{c.position} · OVR {c.overall} · Draft {c.draft_year} #{c.draft_pick}</p><div className="heroBar">{(stints||[]).map((t:any)=><div key={t.id}><span>{t.start_date} – {t.end_date||"heute"}</span><strong><TeamBadge team={t.teams} small/> {t.teams?.abbreviation}</strong></div>)}</div></section>
 <div className="sectionHead"><h2>Karrierewerte</h2></div><div className="statGrid"><StatCard label="Games" value={x.games}/><StatCard label="PPG" value={x.ppg.toFixed(1)}/><StatCard label="RPG" value={x.rpg.toFixed(1)}/><StatCard label="APG" value={x.apg.toFixed(1)}/><StatCard label="SPG" value={x.spg.toFixed(1)}/><StatCard label="BPG" value={x.bpg.toFixed(1)}/><StatCard label="High PTS" value={x.careerHighPoints}/><StatCard label="High BLK" value={x.careerHighBlocks}/></div>
 <div className="dashboardGrid"><section><div className="sectionHead"><h2>Timeline</h2></div><div className="timeline">{(events||[]).map((e:any)=><div className="timelineItem" key={e.id}><small>{e.event_date} · {e.event_type}</small><h3>{e.title||e.event_type}</h3><p>{e.description}</p></div>)}</div></section>
 <aside><div className="sectionHead"><h2>Injuries</h2></div>{(injuries||[]).map((i:any)=><div className="card" key={i.id}><b>{i.injury}</b><p>{i.start_date} · {i.severity}</p><span className="pill">{i.status}</span></div>)}<div className="sectionHead"><h2>Milestones</h2></div>{(milestones||[]).map((m:any)=><div className="card" key={m.id}><b>{m.title}</b><p className="muted">{m.description}</p></div>)}</aside></div>
 <div className="sectionHead"><h2>Game Log</h2></div><div className="tableWrap"><table><thead><tr><th>Team</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>FG</th><th>Status</th></tr></thead><tbody>{(s||[]).map((g:any)=><tr key={g.id}><td>{g.team?.abbreviation}</td><td>{g.points}</td><td>{g.rebounds}</td><td>{g.assists}</td><td>{g.steals}</td><td>{g.blocks}</td><td>{g.turnovers}</td><td>{g.fgm}/{g.fga}</td><td>{g.appearance_status}</td></tr>)}</tbody></table></div></>
}
