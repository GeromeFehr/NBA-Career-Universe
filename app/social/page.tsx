import {pageContext} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import {mediaBucket} from "@/lib/media-kind";
import MediaCard from "@/components/MediaCard";
export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe);
  const {data}=await client.from("media_posts").select("*").eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false}).limit(400);
  const rows=(data||[]).filter((x:any)=>mediaBucket(x.kind)==="social");
  return <>
    <div className="sectionHead"><div><span className="eyebrow">SOCIAL FEED · {universe.name}</span><h1>{lang==="en"?"Timeline & Reactions":"Timeline & Reaktionen"}</h1></div></div>
    <p className="muted">{lang==="en"
      ?"After every game you'll see praise, fan reactions, skepticism, criticism and hater takes. They are fictional voices inside your MyNBA universe."
      :"Nach jedem Spiel erscheinen Lob, Fan-Reaktionen, Zweifel, Kritik und Hater-Takes. Es sind fiktive Stimmen innerhalb deiner MyNBA-Welt."}</p>
    {rows.length?<div className="mediaStack">{rows.map((p:any)=><MediaCard key={p.id} post={p}/>)}</div>:<div className="emptyState"><h3>{lang==="en"?"No social reactions yet":"Noch keine Social-Reaktionen"}</h3><p>{lang==="en"?"Complete a game to generate reactions.":"Schließe ein Spiel ab, um Reaktionen zu erzeugen."}</p></div>}
  </>;
}
