"use client";
import {useId,useState} from "react";
import Link from "next/link";
import {footballClubs,footballLeagues,clubsForFootballLeague,findFootballLeague,findFootballClub,footballLeagueClubNames,footballLeagueLabel} from "@/lib/football-catalog";
import FootballClubBadge from "@/components/FootballClubBadge";
import {FCLabel} from "@/components/FootballFieldErrors";
import {competitionsForFootballLeague,footballStages,type FootballStage} from "@/lib/football-competitions";

export function FootballLeagueOptions({en=false}:{en?:boolean}){
 return <>{(["men","women"] as const).map(gender=><optgroup key={gender} label={gender==="women"?(en?"Women's football":"Frauenfußball"):(en?"Men's football":"Männerfußball")}>{footballLeagues.filter(league=>league.gender===gender).map(league=><option value={league.name} key={league.id}>{footballLeagueLabel(league,en)} ({league.clubs.length})</option>)}</optgroup>)}</>;
}

export function FootballClubField({name,label,value="",league,en=false,required=true}:{name:string;label:string;value?:string;league?:string;en?:boolean;required?:boolean}){
 const id=useId(),[club,setClub]=useState(value),match=findFootballClub(club,league);
 const ordered=[...footballClubs,...clubsForFootballLeague(league||"")],unique=[...new Map(ordered.map(team=>[team.name,team])).values()];
 return <div className="fcClubField"><FCLabel name={name} label={label}><input name={name} value={club} onChange={event=>setClub(event.target.value)} list={id} maxLength={100} required={required} placeholder={en?"Search club or enter your own":"Verein suchen oder selbst eintragen"} autoComplete="off"/><datalist id={id}>{unique.map(team=><option key={team.id} value={team.name}>{team.country} · {team.gender==="women"?(en?"Women":"Frauen"):(en?"Men":"Männer")}</option>)}</datalist></FCLabel>{match&&<div className="fcClubPreview"><FootballClubBadge name={match.name} clubId={match.id}/><span>{match.name}<small>{match.country}</small></span></div>}</div>;
}

export function FootballCompetitionFields({league,value,stage:initialStage="league",en=false}:{league:string;value:string;stage?:FootballStage;en?:boolean}){
 const [stage,setStage]=useState<FootballStage>(footballStages.includes(initialStage)?initialStage:"league"),[competition,setCompetition]=useState(value),[custom,setCustom]=useState(!competitionsForFootballLeague(league,initialStage).length);
 const options=competitionsForFootballLeague(league,stage),existing=competition&&!options.includes(competition),labels:Record<FootballStage,string>={league:en?"League":"Liga",cup:en?"Cup":"Pokal",international:"International",friendly:en?"Friendly":"Testspiel",playoff:"Playoff"};
 function changeStage(next:FootballStage){setStage(next);const choices=competitionsForFootballLeague(league,next);setCompetition(choices[0]||"");setCustom(!choices.length);}
 return <>
  <FCLabel name="stage" label={en?"Match type":"Spielart"}><select name="stage" value={stage} onChange={event=>changeStage(event.target.value as FootballStage)}>{footballStages.map(type=><option key={type} value={type}>{labels[type]}</option>)}</select></FCLabel>
  <FCLabel name="competition" label={en?"Competition":"Wettbewerb"}>
   <select name={custom?undefined:"competition"} value={custom?"__custom":competition} onChange={event=>{if(event.target.value==="__custom"){setCustom(true);setCompetition("");}else{setCompetition(event.target.value);setCustom(false);}}} required={!custom}>
    {existing&&!custom&&<option value={competition}>{competition} · {en?"from your save":"aus deinem Spielstand"}</option>}
    {options.map(name=><option key={name} value={name}>{name}</option>)}
    <option value="__custom">{en?"Enter competition from my save":"Wettbewerb aus meinem Spielstand eintragen"}</option>
   </select>
   {custom&&<input name="competition" value={competition} onChange={event=>setCompetition(event.target.value)} required maxLength={100} placeholder={en?"Competition name in your FC27 save":"Wettbewerbsname aus deinem FC27-Spielstand"}/>}
   {stage==="cup"&&!options.length&&<small className="finePrint">{en?"No domestic cup is listed for this league in the FC27 tournament catalog. Enter one if it exists in your save.":"Für diese Liga ist im FC27-Turnierkatalog kein nationaler Pokal aufgeführt. Falls dein Spielstand einen enthält, trage ihn hier ein."}</small>}
  </FCLabel>
 </>;
}

export function FootballLeagueClubFields({league:initialLeague="Bundesliga",club:initialClub="",clubName="club_name",clubLabel,leagueLabel,en=false,includeClubs=false,initialClubs,showClub=true}:{league?:string;club?:string;clubName?:string;clubLabel?:string;leagueLabel?:string;en?:boolean;includeClubs?:boolean;initialClubs?:string[];showClub?:boolean}){
 const initial=findFootballLeague(initialLeague),[league,setLeague]=useState(initial?.name||initialLeague),[club,setClub]=useState(initialClub),[custom,setCustom]=useState(!initial);
 const [roster,setRoster]=useState((initialClubs||footballLeagueClubNames(initialLeague,initialClub||undefined)).join("\n"));
 const teams=clubsForFootballLeague(league),selected=findFootballClub(club,league);
 function changeLeague(value:string){setLeague(value);const names=footballLeagueClubNames(value,showClub?undefined:club);setRoster(names.join("\n"));if(showClub&&!names.includes(club))setClub("");}
 return <div className="fcCatalogFields">
  <div className={showClub?"grid2":""}><FCLabel name="league" label={leagueLabel||(en?"League":"Liga")}>{custom?<input name="league" value={league} onChange={event=>setLeague(event.target.value)} required maxLength={100}/>:<select name="league" value={league} onChange={event=>changeLeague(event.target.value)} required><FootballLeagueOptions en={en}/></select>}</FCLabel>
  {showClub&&<FCLabel name={clubName} label={clubLabel||(en?"Club":"Verein")}>{custom?<input name={clubName} value={club} onChange={event=>setClub(event.target.value)} required maxLength={100} placeholder={en?"Your club from the save":"Dein Verein aus dem Spielstand"}/>:<select name={clubName} value={club} onChange={event=>setClub(event.target.value)} required><option value="">{en?"Choose club":"Verein wählen"}</option>{club&&!teams.some(team=>team.name===club)&&<option value={club}>{club} · {en?"from your save":"aus deinem Spielstand"}</option>}{teams.map(team=><option key={team.id} value={team.name}>{team.name}</option>)}</select>}</FCLabel>}</div>
  <div className="fcCatalogTools">{showClub&&selected&&<div className="fcClubPreview"><FootballClubBadge name={selected.name} clubId={selected.id}/><span>{selected.name}<small>{selected.country} · {selected.gender==="women"?(en?"Women's football":"Frauenfußball"):(en?"Men's football":"Männerfußball")}</small></span></div>}<button type="button" className="secondaryButton" onClick={()=>{if(custom&&!findFootballLeague(league))changeLeague("Bundesliga");setCustom(!custom);}}>{custom?(en?"Choose from EAFC":"Aus EAFC auswählen"):(en?"Use own league / club":"Eigene Liga / Verein eintragen")}</button><Link href="/fc/teams">{en?"All leagues & clubs":"Alle Ligen & Vereine"} ↗</Link></div>
  {includeClubs&&<details className="formDisclosure"><summary>{en?"League clubs from your save":"Ligavereine aus deinem Spielstand"}</summary><p className="finePrint">{en?"The selected league's clubs are included. Adjust this list for promotions, relegations or a created club in your save. One club per line, including your club.":"Die Vereine der gewählten Liga sind bereits enthalten. Passe die Liste an Aufsteiger, Absteiger oder deinen erstellten Verein an. Ein Verein pro Zeile, einschließlich deines Vereins."}</p><FCLabel name="clubs" label={en?"Clubs":"Vereine"}><textarea name="clubs" rows={8} value={roster} onChange={event=>setRoster(event.target.value)}/></FCLabel>{custom&&<p className="finePrint">{en?"Add your own club to this list or clear it to start without a league roster.":"Ergänze deinen eigenen Verein in der Liste oder leere sie, um ohne Ligakatalog zu beginnen."}</p>}</details>}
 </div>;
}

export function FootballScheduleClubs({league,club,clubs,en=false}:{league:string;club:string;clubs:string[];en?:boolean}){
 const [value,setValue]=useState(clubs.join("\n")),catalog=footballLeagueClubNames(league,club);
 return <>{catalog.length>1&&<button type="button" className="secondaryButton" onClick={()=>setValue(catalog.join("\n"))}>{en?"Load all clubs from this league":"Alle Vereine dieser Liga laden"} ({catalog.length})</button>}<FCLabel name="clubs" label={en?"Clubs (one per line)":"Vereine (ein Verein pro Zeile)"}><textarea name="clubs" rows={10} value={value} onChange={event=>setValue(event.target.value)} required/></FCLabel></>;
}
