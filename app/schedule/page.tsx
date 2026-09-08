import Link from "next/link";
import {pageContext,loadCareerSchedule} from "@/lib/universe";
import {langOf,t} from "@/lib/i18n";
import ScheduleExplorer from "@/components/ScheduleExplorer";

export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe);
  const [{data:teams},relevant]=await Promise.all([
    client.from("teams").select("*").eq("active",true).order("city"),
    loadCareerSchedule(client,career,universe)
  ]);
  const regularCount=relevant.filter((g:any)=>String(g.stage||"").toLowerCase().includes("regular")).length;
  const postseasonCount=relevant.length-regularCount;

  return <>
    <div className="sectionHead">
      <div><span className="eyebrow">MY TEAM · {universe.name}</span><h1>{t(lang,"careerSchedule")}</h1></div>
      <div className="scheduleCount"><strong>{regularCount}/82</strong><span>{t(lang,"regularSeason")}{postseasonCount>0?` · +${postseasonCount} Postseason/Custom`:lang==="en"?" · flex games may still be TBD":" · Flexspiele ggf. noch TBD"}</span></div>
    </div>
    <p className="muted">{lang==="en"
      ?"Only games from your career are shown. Played games remain in history; after a trade, future games from the old team disappear and only the new team's games remain. Manual playoff and custom games belong only to this universe."
      :"Angezeigt werden nur Spiele deiner Karriere: bereits gespielte Partien bleiben in der Historie, nach einem Trade verschwinden alte zukünftige Teamspiele und es erscheinen nur noch die Partien des neuen Teams. Manuell angelegte Playoff- und Custom-Spiele gehören ausschließlich zu diesem Universe."}</p>
    <p><Link className="textLink" href="/pregame">{lang==="en"?"Prepare for the next game":"Das nächste Spiel vorbereiten"} →</Link></p>
    <ScheduleExplorer games={relevant} teams={teams||[]} universeDate={career.universe_date||""} language={lang}/>
  </>;
}
