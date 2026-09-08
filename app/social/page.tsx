import Link from "next/link";
import {pageContext} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import {PageHeader,EmptyState} from "@/components/Editorial";
import MediaCard from "@/components/MediaCard";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}){
 const {client,career,universe}=await pageContext();const lang=langOf(universe),en=lang==="en";const query=await searchParams;const page=Math.max(1,Math.min(10000,Number(query.page)||1));
 const {data,error,count}=await client.from("media_posts").select("*",{count:"exact"}).eq("career_id",career.id).eq("language",lang).in("kind",["social", "fan", "hater", "meme"]).order("created_at",{ascending:false}).order("id").range((page-1)*24,page*24-1);if(error)throw error;
 return <><PageHeader title={en?"The league is talking.":"Die Liga redet."} subtitle={en?"Praise, doubt, rivals and fans. Fictional voices around your career.":"Lob, Zweifel, Rivalen und Fans. Fiktive Stimmen zu deiner Karriere."}/><div className="socialPage"><div className="mediaStack">{data?.length?data.map(p=><MediaCard key={p.id} post={p}/>):<EmptyState title={en?"Nothing published here yet":"Hier ist noch nichts erschienen"} detail={en?"Save a game with media coverage enabled or publish the daily report.":"Speichere ein Spiel mit Berichterstattung oder veröffentliche den Tagesbericht."} href="/admin#media" action={en?"Open newsroom":"Zur Redaktion"}/>}</div></div><nav className="pagination" aria-label={en?"Archive pages":"Archivseiten"}>{page>1&&<Link href={"/social?page="+(page-1)}>← {en?"Newer":"Neuere"}</Link>}<span>{en?"Page":"Seite"} {page}</span>{page*24<(count||0)&&<Link href={"/social?page="+(page+1)}>{en?"Older":"Ältere"} →</Link>}</nav></>;
}
