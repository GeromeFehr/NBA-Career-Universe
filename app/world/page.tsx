import {pageContext} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import {calculateTrends} from "@/lib/world-engine";
import WorldRebuildButton from "@/components/WorldRebuildButton";
import TeamBadge from "@/components/TeamBadge";

export const dynamic="force-dynamic";

function metric(label:string,value:number){
  return <div className="statCard"><span>{label}</span><strong>{value}</strong><div className="progress"><i style={{width:String(value)+"%"}}/></div></div>
}
function arrow(d:string){return d==="up"?"↑":d==="down"?"↓":"→"}

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe),en=lang==="en";
  const [{data:rep},{data:rivalries},{data:personas},{data:arcs},{data:goals},{data:records},{data:fans},{data:legacy},{data:grades},{data:recaps},trends]=await Promise.all([
    client.from("universe_reputation").select("*").eq("career_id",career.id).maybeSingle(),
    client.from("rivalries").select("*,team:opponent_team_id(*)").eq("career_id",career.id).order("heat",{ascending:false}),
    client.from("persona_memories").select("*").eq("career_id",career.id).eq("language",lang).order("updated_at",{ascending:false}),
    client.from("story_arcs").select("*").eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false}),
    client.from("season_goals").select("*").eq("career_id",career.id).eq("season_id",universe.current_season_id).eq("language",lang).order("code"),
    client.from("career_records").select("*").eq("career_id",career.id).eq("language",lang).order("scope").order("category"),
    client.from("fanbase_metrics").select("*,team:team_id(*)").eq("career_id",career.id).order("approval",{ascending:false}),
    client.from("legacy_scores").select("*").eq("career_id",career.id).maybeSingle(),
    client.from("postgame_grades").select("*").eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false}).limit(5),
    client.from("season_recaps").select("*,season:season_id(*)").eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false}),
    calculateTrends(career.id,lang)
  ]);
  const r=rep||{league_reputation:50,star_power:50,media_hype:50,fan_approval:50,expert_respect:50,hater_heat:35,cultural_impact:35};
  const trendRows:any[]=[
    ["PPG",trends.points],["RPG",trends.rebounds],["APG",trends.assists],["SPG",trends.steals],["BPG",trends.blocks],["TO",trends.turnovers]
  ];

  return <>
    <div className="sectionHead"><div><span className="eyebrow">UNIVERSE OS · {universe.name}</span><h1>{en?"Career World":"Karriere-Welt"}</h1></div><WorldRebuildButton language={lang}/></div>
    <p className="muted">{en
      ?"This is the living layer around your MyNBA save: reputation, rivalries, expert memory, fan mood, goals, records and long-running narratives."
      :"Das ist die lebendige Ebene rund um deinen MyNBA-Save: Reputation, Rivalries, Experten-Gedächtnis, Fan-Stimmung, Ziele, Rekorde und langfristige Narrative."}</p>

    <div className="sectionHead"><h2>{en?"League Reputation":"Liga-Reputation"}</h2><strong className="legacyScore">Legacy {legacy?.score??0}/100</strong></div>
    <div className="statGrid">
      {metric(en?"League Reputation":"Liga-Reputation",r.league_reputation)}
      {metric("Star Power",r.star_power)}
      {metric(en?"Media Hype":"Medien-Hype",r.media_hype)}
      {metric(en?"Fan Approval":"Fan-Zustimmung",r.fan_approval)}
      {metric(en?"Expert Respect":"Experten-Respekt",r.expert_respect)}
      {metric("Hater Heat",r.hater_heat)}
      {metric("Cultural Impact",r.cultural_impact)}
    </div>

    <div className="sectionHead"><h2>{en?"Last 5 / Trend":"Letzte 5 / Trend"}</h2></div>
    <div className="statGrid">{trendRows.map(([label,v])=><div className="statCard" key={label}><span>{label}</span><strong>{Number(v.last5).toFixed(1)} {arrow(v.direction)}</strong><small>{en?"Previous 5":"Vorherige 5"}: {Number(v.previous5).toFixed(1)}</small></div>)}</div>

    <div className="dashboardGrid">
      <section>
        <div className="sectionHead"><h2>Rivalries</h2></div>
        {(rivalries||[]).map((x:any)=><div className="card rivalryCard" key={x.id}>
          <div className="inline"><TeamBadge team={x.team}/><div><h3>{x.team?.city} {x.team?.name}</h3><small>{x.meetings} {en?"meetings":"Duelle"} · {x.wins}-{x.losses}</small></div></div>
          <div className="heatLine"><span>Heat {x.heat}/100</span><div className="progress"><i style={{width:String(x.heat)+"%"}}/></div></div><p>{x.reason}</p>
        </div>)}
        {!rivalries?.length&&<div className="card muted">{en?"No rivalry has formed yet.":"Noch keine Rivalry entstanden."}</div>}

        <div className="sectionHead"><h2>{en?"Active & Resolved Story Arcs":"Aktive & abgeschlossene Story-Arcs"}</h2></div>
        {(arcs||[]).map((a:any)=><div className="card" key={a.id}><span className="pill">{a.status} · {a.category}</span><h3>{a.title}</h3><p>{a.summary}</p><div className="progress"><i style={{width:String(a.intensity)+"%"}}/></div></div>)}
      </section>

      <aside>
        <div className="sectionHead"><h2>{en?"Season Goals":"Saisonziele"}</h2></div>
        {(goals||[]).map((g:any)=><div className="card goalCard" key={g.id}><span className={"pill "+(g.status==="completed"?"goalDone":"")}>{g.status}</span><h3>{g.title}</h3><p><b>{Number(g.progress).toFixed(g.code==="PPG_25"?1:0)}</b> / {Number(g.target)}</p><div className="progress"><i style={{width:String(Math.min(100,Number(g.progress)/Math.max(1,Number(g.target))*100))+"%"}}/></div></div>)}

        <div className="sectionHead"><h2>Fanbase</h2></div>
        {(fans||[]).map((f:any)=><div className="card" key={f.id}><b>{f.segment.replaceAll("_"," ")} {f.team?"· "+f.team.abbreviation:""}</b><p>{en?"Approval":"Zustimmung"} {f.approval}/100 · Heat {f.heat}/100</p></div>)}
      </aside>
    </div>

    <div className="sectionHead"><h2>{en?"Recurring Experts & Social Personalities":"Wiederkehrende Experten & Social-Persönlichkeiten"}</h2></div>
    <div className="offerGrid">{(personas||[]).map((p:any)=><div className={"card personaCard stance-"+p.stance} key={p.id}><span className="eyebrow">{p.role}</span><h3>{p.persona_name}</h3><span className="pill">{p.stance} · {p.sentiment>0?"+":""}{p.sentiment}</span><p>{p.memory}</p></div>)}</div>

    <div className="sectionHead"><h2>{en?"Record Book":"Rekordbuch"}</h2></div>
    <div className="tableWrap"><table><thead><tr><th>{en?"Scope":"Bereich"}</th><th>{en?"Record":"Rekord"}</th><th>{en?"Value":"Wert"}</th></tr></thead><tbody>{(records||[]).map((x:any)=><tr key={x.id}><td>{x.scope}</td><td>{x.label}</td><td><b>{x.value}</b></td></tr>)}</tbody></table></div>

    <div className="sectionHead"><h2>{en?"Recent Postgame Grades":"Letzte Postgame-Noten"}</h2></div>
    <div className="offerGrid">{(grades||[]).map((g:any)=><div className="card gradeCard" key={g.id}><strong className="gradeLetter">{g.overall_grade}</strong><p>{g.summary}</p><small>SC {g.scoring} · PL {g.playmaking} · DEF {g.defense} · EFF {g.efficiency} · DISC {g.discipline}</small></div>)}</div>

    {(recaps||[]).length>0&&<><div className="sectionHead"><h2>{en?"Season Recaps":"Saison-Rückblicke"}</h2></div>{recaps.map((x:any)=><div className="card" key={x.id}><span className="eyebrow">{x.season?.label}</span><h2>{x.title}</h2><p>{x.summary}</p></div>)}</>}
  </>;
}
