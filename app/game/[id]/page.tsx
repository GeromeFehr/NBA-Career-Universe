import {pageContext} from "@/lib/universe";
import TeamBadge from "@/components/TeamBadge";
import MediaCard from "@/components/MediaCard";
import QuickGameEntry from "@/components/QuickGameEntry";
import CompetitionBadge from "@/components/CompetitionBadge";
import {pct} from "@/lib/format";
import {langOf} from "@/lib/i18n";
import {ensurePregameCoverage} from "@/lib/world-engine";

export const dynamic="force-dynamic";

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe),en=lang==="en";

  const {data:g}=await client
    .from("games")
    .select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)")
    .eq("id",id).single();

  if(!g)return <div>{en?"Game not found.":"Spiel nicht gefunden."}</div>;
  if(g.universe_id&&g.universe_id!==universe.id)return <div className="card">{en?"This game belongs to another universe.":"Dieses Spiel gehört zu einem anderen Universe."}</div>;

  const [{data:ug},{data:s},{data:n},{data:m},{data:stint},{data:grade},{data:storedPregame}]=await Promise.all([
    client.from("universe_games").select("*").eq("universe_id",universe.id).eq("game_id",id).maybeSingle(),
    client.from("player_game_stats").select("*,team:teams(*)").eq("career_id",career.id).eq("game_id",id).maybeSingle(),
    client.from("game_notables").select("*").eq("career_id",career.id).eq("game_id",id),
    client.from("media_posts").select("*").eq("career_id",career.id).eq("game_id",id).eq("language",lang).order("created_at",{ascending:false}),
    client.from("team_stints").select("*").eq("career_id",career.id).lte("start_date",g.game_day).or("end_date.is.null,end_date.gte."+g.game_day).order("start_date",{ascending:false}).limit(1).maybeSingle(),
    client.from("postgame_grades").select("*").eq("career_id",career.id).eq("game_id",id).eq("language",lang).maybeSingle(),
    client.from("pregame_coverage").select("*").eq("career_id",career.id).eq("game_id",id).eq("language",lang).maybeSingle()
  ]);

  const status=ug?.status||"scheduled";
  const awayScore=ug?.away_score??null;
  const homeScore=ug?.home_score??null;
  const teamId=stint?.team_id||career.current_team_id;
  const canEnter=teamId===g.home_team_id||teamId===g.away_team_id;
  const pregame=storedPregame|| (canEnter&&status!=="completed"?await ensurePregameCoverage(career,universe,g,lang):null);
  const winner=status==="completed"
    ?(Number(homeScore)>Number(awayScore)?g.home?.abbreviation:Number(awayScore)>Number(homeScore)?g.away?.abbreviation:null)
    :null;

  return <>
    <section className="card gameOverview">
      <div className="gameMeta gameMetaLogo"><CompetitionBadge stage={g.stage} small/><span>{g.game_day} · {g.stage} · {g.venue||"Arena TBA"} · {universe.name}</span></div>
      <div className="gameHero">
        <div className="gameTeam"><TeamBadge team={g.away}/><h2>{g.away?.city}<br/>{g.away?.name}</h2></div>
        <div className="gameScore">{status==="completed"?String(awayScore)+" : "+String(homeScore):"VS"}</div>
        <div className="gameTeam"><h2>{g.home?.city}<br/>{g.home?.name}</h2><TeamBadge team={g.home}/></div>
      </div>
      {canEnter&&status!=="completed"&&<a className="buttonLink gameEntryCta" href="#stats">{en?"Enter stats for this game ↓":"Stats für dieses Spiel eintragen ↓"}</a>}
    </section>

    {pregame&&<section className="panel pregameInline">
      <span className="eyebrow">MATCHUP WATCH</span>
      <h2>{pregame.headline}</h2><p>{pregame.body}</p>
      <div className="card keyQuestion"><span className="eyebrow">{en?"KEY QUESTION":"SCHLÜSSELFRAGE"}</span><h3>{pregame.key_question}</h3></div>
      <div className="expertPickGrid">{(pregame.expert_picks||[]).map((p:any)=><div className="expertPick" key={p.name}>
        <b>{p.name}</b><strong>{p.pick}</strong><small>{p.reason}</small>
        {winner&&<span className={p.pick===winner?"pickRight":"pickWrong"}>{p.pick===winner?"✓":"✕"}</span>}
      </div>)}</div>
    </section>}

    {s&&<>
      <div className="sectionHead"><h2>{s.team?.abbreviation} · {s.appearance_status}</h2></div>
      <div className="boxline">
        {[["MIN",s.minutes],["PTS",s.points],["REB",s.rebounds],["AST",s.assists],["STL",s.steals],["BLK",s.blocks],["TO",s.turnovers],["F",s.fouls],["FG",String(s.fgm)+"/"+String(s.fga)],["3PT",String(s.tpm)+"/"+String(s.tpa)],["FT",String(s.ftm)+"/"+String(s.fta)],["+/-",s.plus_minus]].map(([k,v])=><div key={String(k)}><strong>{v}</strong><span>{k}</span></div>)}
      </div>
      <div className="card"><b>FG {pct(s.fgm,s.fga)}</b><p>{s.story_notes}</p>{s.injury_note&&<p>Injury: {s.injury_note}</p>}</div>
    </>}

    {grade&&<section className="panel gradePanel">
      <div className="gradeHero"><strong>{grade.overall_grade}</strong><div><span className="eyebrow">{en?"POSTGAME GRADE":"POSTGAME-NOTE"}</span><h2>{en?"Performance Report":"Leistungsbericht"}</h2><p>{grade.summary}</p></div></div>
      <div className="gradeBars">
        {[["Scoring",grade.scoring],["Playmaking",grade.playmaking],["Defense",grade.defense],[en?"Efficiency":"Effizienz",grade.efficiency],[en?"Discipline":"Disziplin",grade.discipline]].map(([k,v]:any)=><div key={k}><span>{k}<b>{v}/100</b></span><div className="progress"><i style={{width:String(v)+"%"}}/></div></div>)}
      </div>
    </section>}

    {canEnter
      ? <QuickGameEntry game={g} existingStat={s} existingResult={ug} existingNotables={n||[]} language={lang}/>
      : <div className="card muted">{en?"This game is outside your team stint for this date and cannot be entered as a career game.":"Dieses Spiel gehört nicht zu deinem Team-Stint an diesem Datum und kann deshalb nicht als Karriere-Spiel eingetragen werden."}</div>
    }

    {(n||[]).length>0&&<><div className="sectionHead"><h2>{en?"Other Notables":"Andere Notables"}</h2></div>{n?.map((x:any)=><div className="card" key={x.id}><b>{x.player_name} · {x.team_abbreviation}</b><p>{x.note}</p></div>)}</>}

    <div className="sectionHead"><h2>Coverage</h2></div>
    <div className="mediaStack">{m?.map((x:any)=><MediaCard post={x} key={x.id}/>)}</div>
  </>;
}
