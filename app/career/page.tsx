import {pageContext} from "@/lib/universe";
import {summarizeStats} from "@/lib/stats";
import {langOf,t} from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import TeamBadge from "@/components/TeamBadge";

export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe),en=lang==="en";
  const [{data:s},{data:stints},{data:events},{data:injuries},{data:milestones}]=await Promise.all([
    client.from("player_game_stats").select("*,team:teams(*)").eq("career_id",career.id).order("created_at"),
    client.from("team_stints").select("*,teams(*)").eq("career_id",career.id).order("start_date"),
    client.from("career_events").select("*").eq("career_id",career.id).eq("language",lang).order("event_date",{ascending:false}),
    client.from("injuries").select("*").eq("career_id",career.id).order("start_date",{ascending:false}),
    client.from("milestones").select("*").eq("career_id",career.id).eq("language",lang).order("achieved_at",{ascending:false})
  ]);
  const x=summarizeStats(s||[]);
  const today=en?"today":"heute";

  return <>
    <section className="hero">
      <span className="eyebrow">{universe.name} · CAREER FILE</span>
      <h1>{career.player_name}</h1>
      <p>{career.position} · OVR {career.overall} · Draft {career.draft_year||"—"} #{career.draft_pick||"—"}</p>
      <div className="heroBar">{(stints||[]).map((st:any)=><div key={st.id}>
        <span>{st.start_date} – {st.end_date||today}</span>
        <strong><TeamBadge team={st.teams} small/> {st.teams?.abbreviation}</strong>
      </div>)}</div>
    </section>

    <section className="dashboardSection">
      <div className="sectionHead dashboardSectionHead"><div><span className="eyebrow">CAREER TOTALS</span><h2>{t(lang,"careerValues")}</h2></div></div>
      <div className="statGrid">
        <StatCard label="Games" value={x.games}/><StatCard label="PPG" value={x.ppg.toFixed(1)}/><StatCard label="RPG" value={x.rpg.toFixed(1)}/>
        <StatCard label="APG" value={x.apg.toFixed(1)}/><StatCard label="SPG" value={x.spg.toFixed(1)}/><StatCard label="BPG" value={x.bpg.toFixed(1)}/>
        <StatCard label="High PTS" value={x.careerHighPoints}/><StatCard label="High BLK" value={x.careerHighBlocks}/>
      </div>
    </section>

    <div className="dashboardGrid dashboardWorkspace">
      <section className="dashboardMain">
        <div className="sectionHead dashboardSectionHead"><div><span className="eyebrow">CAREER HISTORY</span><h2>{t(lang,"timeline")}</h2></div></div>
        <div className="panel timelinePanel">
          {(events||[]).length?<div className="timeline">{(events||[]).map((e:any)=><div className="timelineItem" key={e.id}>
            <small>{e.event_date} · {e.event_type}</small>
            <h3>{e.title||e.event_type}</h3>
            <p>{e.description}</p>
          </div>)}</div>:<div className="emptyState compact">{en?"No career events yet.":"Noch keine Karriere-Events."}</div>}
        </div>
      </section>

      <aside className="dashboardRail">
        <section className="railSection" id="injuries">
          <div className="railHeading"><h2>{t(lang,"injuries")}</h2></div>
          <div className="railPanel railList">
            {(injuries||[]).length?(injuries||[]).map((i:any)=><div className="railListItem" key={i.id}>
              <div><span className="eyebrow">{i.start_date} · {i.severity}</span><strong>{i.injury}</strong><p>{i.status}</p></div>
            </div>):<p className="muted railEmpty">{en?"No injuries recorded.":"Keine Verletzungen eingetragen."}</p>}
          </div>
        </section>

        <section className="railSection">
          <div className="railHeading"><h2>{t(lang,"milestones")}</h2></div>
          <div className="railPanel railList">
            {(milestones||[]).length?(milestones||[]).slice(0,8).map((m:any)=><div className="railListItem milestoneItem" key={m.id}>
              <div><strong className="clamp1">{m.title}</strong><p className="clamp2">{m.description}</p></div>
            </div>):<p className="muted railEmpty">{en?"No milestones yet.":"Noch keine Milestones."}</p>}
          </div>
        </section>
      </aside>
    </div>

    <div className="sectionHead"><div><span className="eyebrow">BOX SCORES</span><h2>{t(lang,"gameLog")}</h2></div></div>
    <div className="tableWrap"><table>
      <thead><tr><th>Team</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>FG</th><th>Status</th></tr></thead>
      <tbody>{(s||[]).map((g:any)=><tr key={g.id}><td>{g.team?.abbreviation}</td><td>{g.points}</td><td>{g.rebounds}</td><td>{g.assists}</td><td>{g.steals}</td><td>{g.blocks}</td><td>{g.turnovers}</td><td>{g.fgm}/{g.fga}</td><td>{g.appearance_status}</td></tr>)}</tbody>
    </table></div>
  </>;
}
