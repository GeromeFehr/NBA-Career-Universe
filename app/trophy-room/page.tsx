import {pageContext} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import TrophyForm from "@/components/TrophyForm";
import CareerMarks from "@/components/CareerMarks";
import {summarizeCareerMarks} from "@/lib/stats";

export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe),en=lang==="en";
  const [{data:trophies},{data:records},{data:recaps},{data:legacy},{data:seasons},{data:awards},{data:stats}]=await Promise.all([
    client.from("trophies").select("*,season:season_id(*)").eq("career_id",career.id).eq("language",lang).order("awarded_on",{ascending:false}),
    client.from("career_records").select("*").eq("career_id",career.id).eq("language",lang).eq("scope","career").order("category"),
    client.from("season_recaps").select("*,season:season_id(*)").eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false}),
    client.from("legacy_scores").select("*").eq("career_id",career.id).maybeSingle(),
    client.from("seasons").select("*").order("start_date"),
    client.from("award_snapshots").select("*,season:season_id(*)").eq("career_id",career.id).eq("language",lang).eq("rank",1).order("as_of_date",{ascending:false}),
    client.from("player_game_stats").select("*").eq("career_id",career.id)
  ]);
  const marks=summarizeCareerMarks(stats||[]);

  return <>
    <section className="hero trophyHero">
      <span className="eyebrow">LEGACY VAULT · {universe.name}</span>
      <h1>Trophy Room</h1>
      <p>{en?"Championships, awards, records and the long-term case for the Hall of Fame.":"Championships, Awards, Rekorde und dein langfristiger Hall-of-Fame-Case."}</p>
      <div className="legacyBig"><strong>{legacy?.score??0}</strong><span>/100 Legacy Score</span></div>
    </section>

    <div className="sectionHead"><h2>{en?"Trophies & Achievements":"Trophäen & Erfolge"}</h2></div>
    <div className="trophyGrid">{(trophies||[]).map((x:any)=><div className="trophyCard" key={x.id}>
      <div className="trophyIcon">🏆</div><span className="eyebrow">{x.season?.label||x.awarded_on}</span><h2>{x.title}</h2><p>{x.detail}</p>
    </div>)}</div>
    {!trophies?.length&&<div className="card muted">{en?"The cabinet is still empty. Add achievements as your MyNBA career progresses.":"Die Vitrine ist noch leer. Trage Erfolge ein, sobald deine MyNBA-Karriere sie erreicht."}</div>}

    <TrophyForm seasons={seasons||[]} currentSeasonId={universe.current_season_id} careerDate={career.universe_date} language={lang}/>

    <div className="sectionHead"><h2>{en?"Award Wins":"Gewonnene Awards"}</h2></div>
    <div className="offerGrid">{(awards||[]).map((a:any)=><div className="card" key={a.id}><span className="eyebrow">{a.season?.label}</span><h3>{a.award}</h3><p>{a.note}</p></div>)}</div>

    <div className="sectionHead"><h2>{en?"Career Highs & Big Games":"Career Highs & Big Games"}</h2></div>
    <CareerMarks marks={marks} language={lang}/>

    <div className="sectionHead"><h2>{en?"Season Archive":"Saisonarchiv"}</h2></div>
    {(recaps||[]).map((r:any)=><div className="card" key={r.id}><span className="eyebrow">{r.season?.label}</span><h2>{r.title}</h2><p>{r.summary}</p><small>Legacy snapshot: {r.legacy_delta}/100</small></div>)}
  </>;
}
