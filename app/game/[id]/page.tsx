import {pageContext} from "@/lib/universe";
import TeamBadge from "@/components/TeamBadge";
import MediaCard from "@/components/MediaCard";
import QuickGameEntry from "@/components/QuickGameEntry";
import CompetitionBadge from "@/components/CompetitionBadge";
import {pct} from "@/lib/format";
import {langOf} from "@/lib/i18n";

export const dynamic="force-dynamic";

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe);

  const {data:g}=await client
    .from("games")
    .select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)")
    .eq("id",id)
    .single();

  if(!g)return <div>{lang==="en"?"Game not found.":"Spiel nicht gefunden."}</div>;
  if(g.universe_id&&g.universe_id!==universe.id)return <div className="card">{lang==="en"?"This game belongs to another universe.":"Dieses Spiel gehört zu einem anderen Universe."}</div>;

  const [{data:ug},{data:s},{data:n},{data:m},{data:stint}]=await Promise.all([
    client.from("universe_games").select("*").eq("universe_id",universe.id).eq("game_id",id).maybeSingle(),
    client.from("player_game_stats").select("*,team:teams(*)").eq("career_id",career.id).eq("game_id",id).maybeSingle(),
    client.from("game_notables").select("*").eq("career_id",career.id).eq("game_id",id),
    client.from("media_posts").select("*").eq("career_id",career.id).eq("game_id",id).order("created_at",{ascending:false}),
    client.from("team_stints").select("*")
      .eq("career_id",career.id)
      .lte("start_date",g.game_day)
      .or(`end_date.is.null,end_date.gte.${g.game_day}`)
      .order("start_date",{ascending:false})
      .limit(1)
      .maybeSingle()
  ]);

  const status=ug?.status||"scheduled";
  const awayScore=ug?.away_score??null;
  const homeScore=ug?.home_score??null;
  const teamId=stint?.team_id||career.current_team_id;
  const canEnter=teamId===g.home_team_id||teamId===g.away_team_id;

  return <>
    <section className="card gameOverview">
      <div className="gameMeta gameMetaLogo"><CompetitionBadge stage={g.stage} small/><span>{g.game_day} · {g.stage} · {g.venue||"Arena TBA"} · {universe.name}</span></div>
      <div className="gameHero">
        <div className="gameTeam"><TeamBadge team={g.away}/><h2>{g.away?.city}<br/>{g.away?.name}</h2></div>
        <div className="gameScore">{status==="completed"?`${awayScore} : ${homeScore}`:"VS"}</div>
        <div className="gameTeam"><h2>{g.home?.city}<br/>{g.home?.name}</h2><TeamBadge team={g.home}/></div>
      </div>
      {canEnter&&status!=="completed"&&<a className="buttonLink gameEntryCta" href="#stats">{lang==="en"?"Enter stats for this game ↓":"Stats für dieses Spiel eintragen ↓"}</a>}
    </section>

    {s&&<>
      <div className="sectionHead"><h2>{s.team?.abbreviation} · {s.appearance_status}</h2></div>
      <div className="boxline">
        {[["MIN",s.minutes],["PTS",s.points],["REB",s.rebounds],["AST",s.assists],["STL",s.steals],["BLK",s.blocks],["TO",s.turnovers],["F",s.fouls],["FG",`${s.fgm}/${s.fga}`],["3PT",`${s.tpm}/${s.tpa}`],["FT",`${s.ftm}/${s.fta}`],["+/-",s.plus_minus]].map(([k,v])=><div key={String(k)}><strong>{v}</strong><span>{k}</span></div>)}
      </div>
      <div className="card">
        <b>FG {pct(s.fgm,s.fga)}</b>
        <p>{s.story_notes}</p>
        {s.injury_note&&<p>Injury: {s.injury_note}</p>}
      </div>
    </>}

    {canEnter
      ? <QuickGameEntry game={g} existingStat={s} existingResult={ug} language={lang}/>
      : <div className="card muted">{lang==="en"?"This game is outside your team stint for this date and cannot be entered as a career game.":"Dieses Spiel gehört nicht zu deinem Team-Stint an diesem Datum und kann deshalb nicht als Karriere-Spiel eingetragen werden."}</div>
    }

    {(n||[]).length>0&&<>
      <div className="sectionHead"><h2>{lang==="en"?"Other Notables":"Andere Notables"}</h2></div>
      {n?.map((x:any)=><div className="card" key={x.id}><b>{x.player_name} · {x.team_abbreviation}</b><p>{x.note}</p></div>)}
    </>}

    <div className="sectionHead"><h2>Coverage</h2></div>
    <div className="mediaStack">{m?.map((x:any)=><MediaCard post={x} key={x.id}/>)}</div>
  </>;
}
