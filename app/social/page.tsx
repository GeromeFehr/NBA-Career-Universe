import {pageContext} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import MediaCard from "@/components/MediaCard";
export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe);
  const {data}=await client.from("media_posts").select("*").eq("career_id",career.id).order("created_at",{ascending:false}).limit(300);
  const socialKinds=new Set(["social","fan","hater","meme","wildcard","expert","debate"]);
  const rows=(data||[]).filter((x:any)=>socialKinds.has(String(x.kind)));
  return <>
    <div className="sectionHead"><div><span className="eyebrow">SOCIAL FEED · {universe.name}</span><h1>{lang==="en"?"Timeline & Reactions":"Timeline & Reaktionen"}</h1></div></div>
    <p className="muted">{lang==="en"
      ?"After every game you'll see praise, fan reactions, expert opinions, skepticism, criticism and hater takes. They are fictional voices inside your MyNBA universe."
      :"Nach jedem Spiel erscheinen Lob, Fan-Reaktionen, Expertenmeinungen, Zweifel, Kritik und Hater-Takes. Es sind fiktive Stimmen innerhalb deiner MyNBA-Welt."}</p>
    <div className="mediaStack">{rows.map((p:any)=><MediaCard key={p.id} post={p}/>)}</div>
  </>;
}
