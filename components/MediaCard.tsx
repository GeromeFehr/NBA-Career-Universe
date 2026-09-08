import Link from "next/link";
import {mediaBucket,mediaKindLabel} from "@/lib/media-kind";
import {localDate} from "@/lib/format";
import {mediaSource} from "@/lib/media-sources";
export default function MediaCard({post,compact=false}:{post:any;compact?:boolean}) {
  const lang=post.language==="en"?"en":"de",en=lang==="en";
  const social=mediaBucket(post.kind)==="social",source=mediaSource(post.outlet);
  return <article className={"mediaCard "+(social?"socialPost":"newsArticle")+(compact?" compact":"")} lang={lang}>
    <div className="mediaMeta">{social?<span className="socialAvatar" aria-hidden="true">{String(post.author_name||"CU").replace("@","").slice(0,2).toUpperCase()}</span>:<span className="outletName">{source.name}</span>}<span>{social?post.author_name:mediaKindLabel(post.kind,lang)}</span><span className="simulationLabel">{en?"Simulation":"Simulation"}</span></div>
    <h3>{post.headline}</h3>
    <div className="articleBody"><p>{post.body}</p></div>
    <footer><span>{social?localDate(post.created_at,lang):(post.author_name|| (en?"Editorial desk":"Redaktion"))}</span><span>{en?"Resonance":"Resonanz"} {Number(post.virality)||0}/100</span>{post.game_id&&<Link href={"/game/"+post.game_id}>{en?"Game":"Spiel"} ↗</Link>}{source.url&&!social&&<a href={source.url} target="_blank" rel="noreferrer">{en?"Real outlet":"Echte Medienseite"} ↗</a>}</footer>
  </article>;
}
