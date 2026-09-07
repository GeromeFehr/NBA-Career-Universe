import {pageContext} from "@/lib/universe";
import {langOf,t} from "@/lib/i18n";
import {mediaBucket} from "@/lib/media-kind";
import MediaCard from "@/components/MediaCard";
export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe);
  const {data}=await client.from("media_posts").select("*").eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false}).limit(300);
  const rows=(data||[]).filter((x:any)=>mediaBucket(x.kind)==="news");
  return <>
    <div className="sectionHead"><div><span className="eyebrow">NEWSROOM · {universe.name}</span><h1>{t(lang,"mediaReports")}</h1></div></div>
    <p className="muted">{lang==="en"?"Articles, expert analysis, TV takes and league discussion.":"Artikel, Expertenanalysen, TV-Takes und Liga-Diskussionen."}</p>
    {rows.length?<div className="mediaStack">{rows.map((p:any)=><MediaCard key={p.id} post={p}/>)}</div>:<div className="emptyState"><h3>{lang==="en"?"No news yet":"Noch keine News"}</h3><p>{lang==="en"?"Complete a game or run the newsroom to generate coverage.":"Schließe ein Spiel ab oder starte den Newsroom, um Berichterstattung zu erzeugen."}</p></div>}
  </>;
}
