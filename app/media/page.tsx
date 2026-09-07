import {pageContext} from "@/lib/universe";
import {langOf,t} from "@/lib/i18n";
import MediaCard from "@/components/MediaCard";
export const dynamic="force-dynamic";

export default async function Page(){
  const {client,career,universe}=await pageContext();
  const lang=langOf(universe);
  const {data}=await client.from("media_posts").select("*").eq("career_id",career.id).order("created_at",{ascending:false}).limit(200);
  const mediaKinds=new Set(["analysis","recap","article","beat","expert","debate","rumor"]);
  return <>
    <div className="sectionHead"><div><span className="eyebrow">NEWSROOM · {universe.name}</span><h1>{t(lang,"mediaReports")}</h1></div></div>
    <p className="muted">{lang==="en"?"Articles, expert analysis, TV takes and league discussion.":"Artikel, Expertenanalysen, TV-Takes und Liga-Diskussionen."}</p>
    <div className="mediaStack">{(data||[]).filter((x:any)=>mediaKinds.has(String(x.kind))).map((p:any)=><MediaCard key={p.id} post={p}/>)}</div>
  </>;
}
