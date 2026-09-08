"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import ThemeToggle from "@/components/ThemeToggle";
import type {Theme} from "@/lib/theme";
import type {AppLanguage} from "@/lib/i18n";

export default function Nav({language="de",signedIn=false,universeName,team,initialTheme="light"}: {initialTheme?:Theme;language?:AppLanguage;signedIn?:boolean;universeName?:string;team?:string}) {
  const en=language==="en",path=usePathname();
  const [open,setOpen]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const toggle=useRef<HTMLButtonElement>(null);
  useEffect(()=>{setOpen(false);dialog.current?.close()},[path]);
  useEffect(()=>{
    const el=dialog.current;
    if(open&&!el?.open)el?.showModal();
    if(!open&&el?.open)el.close();
    if(open){const previous=document.body.style.overflow;document.body.style.overflow="hidden";return ()=>{document.body.style.overflow=previous};}
  },[open]);
  const primary=[["/",en?"Today":"Heute"],["/schedule",en?"Games":"Spiele"],["/career",en?"Career":"Karriere"],["/media",en?"Media":"Medien"],["/world",en?"Career world":"Karrierewelt"]];
  const groups=[
    [en?"On the court":"Auf dem Court",[["/",en?"Today":"Heute"],["/schedule",en?"Schedule":"Spielplan"],["/playoffs","Playoffs"]]],
    [en?"Your career":"Deine Karriere",[["/career",en?"Player file":"Spielerakte"],["/agency",en?"Agent & contracts":"Berater & Verträge"]]],
    [en?"Around the league":"Rund um die Liga",[["/world",en?"Career world":"Karrierewelt"],["/media",en?"Media & press":"Medien & Presse"],["/trades","Trades"]]],
    [en?"Manage":"Verwalten",[["/admin",en?"Control room":"Verwaltung"],["/universes",en?"My careers":"Meine Karrieren"],["/settings",en?"Settings":"Einstellungen"]]],
  ] as [string,string[][]][];
  const active=(href:string)=>path===href || (href==="/schedule"&&(path.startsWith("/game/")||path==="/pregame"||path==="/playoffs")) || (href==="/media"&&(path==="/social"||path==="/interviews"));
  return <>
    <a className="skipLink" href="#main">{en?"Skip to content":"Zum Inhalt"}</a>
    <header className="masthead">
      <div className="mastheadTop"><Link href={signedIn?"/universes":"/login"} className="edition">{universeName||"MyNBA"}{team&&<span> · {team}</span>}</Link><span>{en?"Your career journal":"Dein Karrierejournal"}</span></div>
      <div className="mastheadMain"><Link className="brand" href={signedIn?"/":"/login"} aria-label="Career Universe"><span>CAREER</span><span className="brandSlash">/</span><span>UNIVERSE</span></Link>
        <div className="mastheadActions"><ThemeToggle initialTheme={initialTheme} language={language}/>{signedIn?<button ref={toggle} className="menuToggle" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}><span className="menuGlyph" aria-hidden="true">☰</span>{en?"Menu":"Menü"}</button>:<Link className="textLink" href={"/login?lang="+language}>{en?"Sign in":"Anmelden"} →</Link>}</div>
      </div>
      {signedIn&&<nav className="primaryNav" aria-label={en?"Main navigation":"Hauptnavigation"}>{primary.map(([href,title])=><Link href={href} key={href} aria-current={active(href)?"page":undefined}>{title}</Link>)}<Link className="navEntry" href="/admin#game-entry">{en?"Enter game":"Spiel eintragen"}<span aria-hidden="true"> +</span></Link></nav>}
    </header>
    <dialog ref={dialog} className="navigationDialog" onCancel={()=>setOpen(false)} onClose={()=>{setOpen(false);toggle.current?.focus()}} onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}} aria-label={en?"All sections":"Alle Bereiche"}>
      <div className="menuHead"><strong>CAREER / UNIVERSE</strong><button className="closeButton" onClick={()=>setOpen(false)} aria-label={en?"Close menu":"Menü schließen"}>×</button></div>
      <div className="menuGroups">{groups.map(([title,links])=><nav key={title} aria-label={title}><h2>{title}</h2>{links.map(([href,text])=><Link href={href} key={href} aria-current={active(href)?"page":undefined} onClick={()=>setOpen(false)}>{text}</Link>)}</nav>)}</div>
    </dialog>
  </>;
}
