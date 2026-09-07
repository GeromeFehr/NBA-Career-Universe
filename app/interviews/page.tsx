import {pageContext} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import InterviewPanel from "@/components/InterviewPanel";

export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe),en=lang==="en";
  const {data:rows}=await client.from("interviews")
    .select("*,game:game_id(*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*))")
    .eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false});
  const open=(rows||[]).filter((x:any)=>x.status==="open");
  const past=(rows||[]).filter((x:any)=>x.status!=="open");

  return <>
    <div className="sectionHead"><div><span className="eyebrow">PRESS ROOM · {universe.name}</span><h1>{en?"Press Conferences":"Pressekonferenzen"}</h1></div></div>
    <p className="muted">{en?"Your answers change hype, fan approval, expert respect and hater heat.":"Deine Antworten verändern Hype, Fan-Zustimmung, Experten-Respekt und Hater-Heat."}</p>
    {open.length?open.map((i:any)=><InterviewPanel key={i.id} interview={i} language={lang}/>):<div className="card muted">{en?"No unanswered questions right now.":"Aktuell keine offene Frage."}</div>}
    <div className="sectionHead"><h2>{en?"Interview History":"Interview-Historie"}</h2></div>
    <div className="timeline">{past.map((i:any)=><div className="timelineItem" key={i.id}><small>{i.interview_date}</small><h3>{i.question}</h3><p><b>{en?"Answer":"Antwort"}:</b> {i.answer_text||"—"}</p></div>)}</div>
  </>;
}
