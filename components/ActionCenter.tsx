import Link from "next/link";
export type DashboardAction={id:string;kind:"press"|"trade"|"offer"|"medical"|"game"|"system";eyebrow:string;title:string;body?:string|null;href:string;cta:string;priority:number};
export default function ActionCenter({actions,language}:{actions:DashboardAction[];language:"de"|"en"}) {
  if(!actions.length)return null;
  return <section className="actionCenter"><div className="sectionHead"><h2>{language==="en"?"Your next move":"Du bist am Zug"}</h2><span>{actions.length} {language==="en"?"open":"offen"}</span></div>
    <div className="actionList">{[...actions].sort((a,b)=>b.priority-a.priority).map((a,i)=><Link href={a.href} key={a.id} className={"actionRow action-"+a.kind}><span className="actionNumber">{String(i+1).padStart(2,"0")}</span><div><span className="actionType">{a.eyebrow}</span><h3>{a.title}</h3>{a.body&&<p>{a.body}</p>}<span className="actionCta">{a.cta} →</span></div></Link>)}</div>
  </section>;
}
