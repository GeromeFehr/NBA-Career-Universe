import Link from "next/link";

export type DashboardAction={
  id:string;
  kind:"press"|"trade"|"offer"|"medical"|"game"|"system";
  eyebrow:string;
  title:string;
  body?:string|null;
  href:string;
  cta:string;
  priority:number;
};

export default function ActionCenter({actions,language}:{actions:DashboardAction[];language:"de"|"en"}){
  if(!actions.length)return null;
  const en=language==="en";
  const sorted=[...actions].sort((a,b)=>b.priority-a.priority);
  const primary=sorted[0],secondary=sorted.slice(1,4);

  return <section className="actionCenter" aria-label={en?"Open actions":"Offene Aktionen"}>
    <div className="actionCenterHead">
      <div>
        <span className="eyebrow">{en?"ACTION CENTER":"ACTION CENTER"}</span>
        <h2>{en?"Needs your attention":"Braucht deine Entscheidung"}</h2>
      </div>
      <span className="actionCount">{sorted.length}</span>
    </div>

    <div className={secondary.length?"actionCenterGrid":"actionCenterGrid single"}>
      <Link href={primary.href} className={"actionPrimary action-"+primary.kind}>
        <span className="actionType">{primary.eyebrow}</span>
        <h3>{primary.title}</h3>
        {primary.body&&<p className="clamp2">{primary.body}</p>}
        <span className="actionCta">{primary.cta} <b>→</b></span>
      </Link>

      {secondary.length>0&&<div className="actionSecondaryList">
        {secondary.map(a=><Link href={a.href} className={"actionSecondary action-"+a.kind} key={a.id}>
          <div>
            <span className="actionType">{a.eyebrow}</span>
            <strong className="clamp1">{a.title}</strong>
          </div>
          <span aria-hidden="true">→</span>
        </Link>)}
      </div>}
    </div>
  </section>;
}
