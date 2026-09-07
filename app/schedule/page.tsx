import { pageContext, loadCareerSchedule } from "@/lib/universe";
import ScheduleExplorer from "@/components/ScheduleExplorer";

export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const [{data:teams},relevant]=await Promise.all([
    client.from("teams").select("*").eq("active",true).order("city"),
    loadCareerSchedule(client,career,universe)
  ]);

  const regularCount=relevant.filter((g:any)=>String(g.stage||"").toLowerCase().includes("regular")).length;
  const postseasonCount=relevant.length-regularCount;

  return <>
    <div className="sectionHead">
      <div><span className="eyebrow">MY TEAM · {universe.name}</span><h1>Karriere-Spielplan</h1></div>
      <div className="scheduleCount"><strong>{regularCount}/82</strong><span>Regular Season{postseasonCount>0?` · +${postseasonCount} Postseason/Custom`:" · 2 Flexspiele ggf. noch TBD"}</span></div>
    </div>
    <p className="muted">
      Angezeigt werden nur Spiele deiner Karriere: bereits gespielte Partien bleiben in der Historie,
      nach einem Trade verschwinden alte zukünftige Teamspiele und es erscheinen nur noch die Partien des neuen Teams.
      Manuell angelegte Playoff- und Custom-Spiele gehören ausschließlich zu diesem Universe.
    </p>
    <ScheduleExplorer games={relevant} teams={teams||[]} universeDate={career.universe_date||""}/>
  </>;
}
