import {pageContext} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import InterviewPanel from "@/components/InterviewPanel";

export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe),en=lang==="en";
  const {data:rows}=await client.from("interviews")
    .select("*,game:game_id(*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*))")
    .eq("career_id",career.id).eq("language",lang)
    .order("created_at",{ascending:false});
  const open=(rows||[]).filter((x:any)=>x.status==="open").sort((a:any,b:any)=>Number(b.importance||0)-Number(a.importance||0));
  const past=(rows||[]).filter((x:any)=>x.status!=="open");

  return <>
    <div className="sectionHead"><div><span className="eyebrow">PRESS ROOM · {universe.name}</span><h1>{en?"Press Conferences":"Pressekonferenzen"}</h1></div></div>
    <p className="muted pageIntro">{en
      ?"Questions now react to the actual game: huge stat lines, defense, efficiency, turnovers, close finishes, rivalries, discipline, trade noise and media pressure."
      :"Die Fragen reagieren jetzt auf das tatsächliche Spiel: Monster-Statlines, Defense, Effizienz, Turnover, enge Spiele, Rivalries, Disziplin, Trade-Gerüchte und Mediendruck."}</p>

    {open.length
      ?<div className="pressStack">{open.map((i:any)=><InterviewPanel key={i.id} interview={i} language={lang}/>)}</div>
      :<div className="emptyState"><h3>{en?"No unanswered questions right now.":"Aktuell keine offene Frage."}</h3><p>{en?"The next notable game will create a new press conference.":"Nach dem nächsten relevanten Spiel entsteht automatisch eine neue Pressekonferenz."}</p></div>}

    <div className="sectionHead"><div><span className="eyebrow">ARCHIVE</span><h2>{en?"Interview History":"Interview-Historie"}</h2></div></div>
    <div className="timeline">{past.map((i:any)=><div className="timelineItem" key={i.id}>
      <small>{i.interview_date}{i.reporter_name?" · "+i.reporter_name:""}{i.outlet?" · "+i.outlet:""}</small>
      <h3>{i.question}</h3>
      {i.context&&<p className="muted">{i.context}</p>}
      <p><b>{en?"Answer":"Antwort"}:</b> {i.answer_text||"—"}</p>
    </div>)}</div>
  </>;
}
