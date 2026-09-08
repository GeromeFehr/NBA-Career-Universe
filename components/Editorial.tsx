import Link from "next/link";
import type {ReactNode} from "react";

export function PageHeader({title,subtitle,actions,section}: {title:string; subtitle?:string; actions?:ReactNode; section?:string}) {
  return <header className="pageHeader">
    <div>{section && <p className="sectionName">{section}</p>}<h1>{title}</h1>{subtitle && <p className="pageIntro">{subtitle}</p>}</div>
    {actions && <div className="pageActions">{actions}</div>}
  </header>;
}
export function Section({title,children,action,id,className=""}: {title:string;children:ReactNode;action?:ReactNode;id?:string;className?:string}) {
  return <section id={id} className={"editorialSection "+className}><div className="sectionHead"><h2>{title}</h2>{action}</div>{children}</section>;
}
export function EmptyState({title,detail,href,action}: {title:string;detail?:string;href?:string;action?:string}) {
  return <div className="emptyState"><span className="emptyRule" aria-hidden="true"/><h3>{title}</h3>{detail&&<p>{detail}</p>}{href&&action&&<Link className="textLink" href={href}>{action} →</Link>}</div>;
}
export function MetricStrip({items,dark=false}: {items:{label:string;value:ReactNode;detail?:string}[];dark?:boolean}) {
  return <dl className={"metricStrip"+(dark?" dark":"")}>{items.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd>{item.detail&&<small>{item.detail}</small>}</div>)}</dl>;
}
export function Meter({label,value}: {label:string;value:number}) {
  const amount=Math.max(0,Math.min(100,Number(value)||0));
  return <div className="meter"><div><span>{label}</span><b>{amount}<small>/100</small></b></div><meter min="0" max="100" value={amount}>{amount}</meter></div>;
}
