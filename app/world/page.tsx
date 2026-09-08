import {checked} from "@/lib/data";
import PostgameGradeCard from "@/components/PostgameGradeCard";
import {label,prose} from "@/lib/labels";
import {pageContext} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import {calculateTrends} from "@/lib/world-engine";
import WorldRebuildButton from "@/components/WorldRebuildButton";
import TeamBadge from "@/components/TeamBadge";

export const dynamic="force-dynamic";

function metric(label:string,value:number){
  return <div className="statCard"><span>{label}</span><strong>{value}</strong><div className="progress"><i style={{width:String(value)+"%"}}/></div></div>;
}
function arrow(d:string){return d==="up"?"↑":d==="down"?"↓":"→"}

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe),en=lang==="en";
  const [{data:rep},{data:rivalries},{data:personas},{data:arcs},{data:goals},{data:records},{data:fans},{data:legacy},grades,{data:recaps},trends]=await Promise.all([
    client.from("universe_reputation").select("*").eq("career_id",career.id).maybeSingle(),
    client.from("rivalries").select("*,team:opponent_team_id(*)").eq("career_id",career.id).order("heat",{ascending:false}),
    client.from("persona_memories").select("*").eq("career_id",career.id).eq("language",lang).order("updated_at",{ascending:false}),
    client.from("story_arcs").select("*").eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false}),
    client.from("season_goals").select("*").eq("career_id",career.id).eq("season_id",universe.current_season_id||"").eq("language",lang).order("code"),
    client.from("career_records").select("*").eq("career_id",career.id).eq("language",lang).order("scope").order("category"),
    client.from("fanbase_metrics").select("*,team:team_id(*)").eq("career_id",career.id).order("approval",{ascending:false}),
    client.from("legacy_scores").select("*").eq("career_id",career.id).maybeSingle(),
    client.from("postgame_grades").select("*,game:games(game_day,home_team_id,away_team_id,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*))").eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false}).limit(5).then(checked),
    client.from("season_recaps").select("*,season:season_id(*)").eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false}),
    calculateTrends(career.id,lang)
  ]);
  const gradeStats=grades?.length?checked(await client.from("player_game_stats").select("game_id,team_id").eq("career_id",career.id).in("game_id",grades.map(g=>g.game_id))):[];
  const gradeTeams=new Map((gradeStats||[]).map(s=>[s.game_id,s.team_id]));
  const r=rep||{league_reputation:50,star_power:50,media_hype:50,fan_approval:50,expert_respect:50,hater_heat:35,cultural_impact:35};
  const trendRows:any[]=[
    ["PPG",trends.points],["RPG",trends.rebounds],["APG",trends.assists],["SPG",trends.steals],["BPG",trends.blocks],["TO",trends.turnovers]
  ];

  return <>
    <div className="sectionHead">
      <div><h1>{en?"Career World":"Karriere-Welt"}</h1></div>
      <WorldRebuildButton language={lang}/>
    </div>
    <p className="muted pageIntro">{en
      ?"The living layer around your MyNBA save: reputation, rivalries, expert memory, fan mood, goals, records and long-running narratives."
      :"Was die Liga über deinen Spieler denkt: Ansehen, Rivalitäten, Stimmen, Fans, Saisonziele und Rekorde."}</p>

    <section className="dashboardSection">
      <div className="sectionHead dashboardSectionHead"><div><h2>{en?"League Reputation":"Liga-Reputation"}</h2></div><strong className="legacyScore">Legacy {legacy?.score??0}/100</strong></div>
      <div className="statGrid">
        {metric(en?"League Reputation":"Liga-Reputation",r.league_reputation)}
        {metric(en?"Star power":"Strahlkraft",r.star_power)}
        {metric(en?"Media Hype":"Medien-Hype",r.media_hype)}
        {metric(en?"Fan Approval":"Fan-Zustimmung",r.fan_approval)}
        {metric(en?"Expert Respect":"Experten-Respekt",r.expert_respect)}
        {metric(en?"Critic intensity":"Kritikintensität",r.hater_heat)}
        {metric(en?"Cultural impact":"Kultureller Einfluss",r.cultural_impact)}
      </div>
    </section>

    <section className="dashboardSection">
      <div className="sectionHead dashboardSectionHead"><div><h2>{en?"Last 5 / Trend":"Letzte 5 / Trend"}</h2></div></div>
      <div className="statGrid">{trendRows.map(([label,v])=><div className="statCard" key={label}>
        <span>{label}</span><strong>{Number(v.last5).toFixed(1)} {arrow(v.direction)}</strong><small>{en?"Previous 5":"Vorherige 5"}: {Number(v.previous5).toFixed(1)}</small>
      </div>)}</div>
    </section>

    <div className="dashboardGrid dashboardWorkspace">
      <section className="dashboardMain">
        <div className="sectionHead dashboardSectionHead"><div><h2>{en?"Rivalries":"Rivalitäten"}</h2></div></div>
        <div className="mediaStack">
          {(rivalries||[]).length?(rivalries||[]).map((x:any)=><div className="panel rivalryCard" key={x.id}>
            <div className="rivalryTop"><TeamBadge team={x.team}/><div><strong>{x.team?.city} {x.team?.name}</strong><small>{x.meetings} {en?"meetings":"Duelle"} · {x.wins}-{x.losses}</small></div><b>{x.heat}</b></div>
            <div className="heatMeter"><i style={{width:String(x.heat)+"%"}}/></div>
            <p className="muted">{prose(x,"reason",lang)}</p>
          </div>):<div className="emptyState compact">{en?"No rivalry has formed yet.":"Noch keine Rivalry entstanden."}</div>}
        </div>

        <div className="sectionHead"><div><h2>{en?"Story Arcs":"Story-Arcs"}</h2></div></div>
        <div className="mediaStack">{(arcs||[]).length?(arcs||[]).map((a:any)=><div className="panel" key={a.id}>
          <div className="panelHead"><div><span className="pill">{label(a.status,lang)} · {label(a.category,lang)}</span><h3>{a.title}</h3></div><strong className="arcIntensity">{a.intensity}</strong></div>
          <p className="muted">{a.summary}</p><div className="progress"><i style={{width:String(a.intensity)+"%"}}/></div>
        </div>):<div className="emptyState compact">{en?"No story arcs yet.":"Noch keine Story-Arcs."}</div>}</div>
      </section>

      <aside className="dashboardRail">
        <section className="railSection">
          <div className="railHeading"><h2>{en?"Season Goals":"Saisonziele"}</h2></div>
          <div className="railPanel railList">
            {(goals||[]).length?(goals||[]).map((g:any)=><div className="railListItem" key={g.id}>
              <div><span className={"pill "+(g.status==="completed"?"goalDone":"")}>{label(g.status,lang)}</span><strong className="clamp2">{g.title}</strong><p>{Number(g.progress).toFixed(g.code==="PPG_25"?1:0)} / {Number(g.target)}</p><div className="progress"><i style={{width:String(Math.min(100,Number(g.progress)/Math.max(1,Number(g.target))*100))+"%"}}/></div></div>
            </div>):<p className="muted railEmpty">{en?"No season goals yet.":"Noch keine Saisonziele."}</p>}
          </div>
        </section>

        <section className="railSection">
          <div className="railHeading"><h2>{en?"The fans":"Die Fans"}</h2></div>
          <div className="railPanel railList">
            {(fans||[]).length?(fans||[]).map((f:any)=><div className="railListItem" key={f.id}>
              <div><strong>{label(f.segment,lang)} {f.team?"· "+f.team.abbreviation:""}</strong><p>{en?"Approval":"Zustimmung"} {f.approval}/100 · {en?"Intensity":"Intensität"} {f.heat}/100</p></div>
            </div>):<p className="muted railEmpty">{en?"No fan metrics yet.":"Noch keine Fan-Metriken."}</p>}
          </div>
        </section>
      </aside>
    </div>

    <div className="sectionHead"><div><h2>{en?"Recurring Experts & Social Personalities":"Wiederkehrende Experten & Social-Persönlichkeiten"}</h2></div></div>
    <div className="offerGrid">{(personas||[]).map((p:any)=><div className={"card personaCard stance-"+p.stance} key={p.id}><span className="eyebrow">{p.role}</span><h3>{p.persona_name}</h3><span className="pill">{label(p.stance,lang)} · {p.sentiment>0?"+":""}{p.sentiment}</span><p className="muted">{p.memory}</p></div>)}</div>

    <div className="sectionHead"><div><h2>{en?"Record Book":"Rekordbuch"}</h2></div></div>
    <div className="tableWrap"><table><thead><tr><th>{en?"Scope":"Bereich"}</th><th>{en?"Record":"Rekord"}</th><th>{en?"Value":"Wert"}</th></tr></thead><tbody>{(records||[]).map((x:any)=><tr key={x.id}><td>{label(x.scope,lang)}</td><td>{x.label}</td><td><b>{x.value}</b></td></tr>)}</tbody></table></div>

    <div className="sectionHead"><div><h2>{en?"Recent Postgame Grades":"Letzte Postgame-Noten"}</h2></div></div>
    <div className="offerGrid">{(grades||[]).map(grade=><PostgameGradeCard key={grade.id} grade={grade} teamId={gradeTeams.get(grade.game_id)} language={lang}/>)}</div>

    {(recaps||[]).length>0&&<><div className="sectionHead"><div><h2>{en?"Season Recaps":"Saison-Rückblicke"}</h2></div></div><div className="mediaStack">{(recaps||[]).map((x:any)=><div className="panel" key={x.id}><span className="eyebrow">{x.season?.label}</span><h2>{x.title}</h2><p className="muted">{x.summary}</p></div>)}</div></>}
  </>;
}
