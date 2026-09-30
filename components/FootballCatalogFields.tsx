"use client";
import {useId,useState} from "react";
import Link from "next/link";
import {footballClubs,footballLeagues,clubsForFootballLeague,findFootballLeague,findFootballClub,footballLeagueClubNames,footballLeagueLabel} from "@/lib/football-catalog";
import FootballClubBadge from "@/components/FootballClubBadge";

export function FootballLeagueOptions({en=false}:{en?:boolean}){
 return <>{(["men","women"] as const).map(gender=><optgroup key={gender} label={gender==="women"?(en?"Women's football":"Frauenfußball"):(en?"Men's football":"Männerfußball")}>{footballLeagues.filter(league=>league.gender===gender).map(league=><option value={league.name} key={league.id}>{footballLeagueLabel(league,en)} ({league.clubs.length})</option>)}</optgroup>)}</>;
}

export function FootballClubField({name,label,value="",league,en=false,required=true}:{name:string;label:string;value?:string;league?:string;en?:boolean;required?:boolean}){
 const id=useId(),[club,setClub]=useState(value),match=findFootballClub(club,league);
 const ordered=[...footballClubs,...clubsForFootballLeague(league||"")],unique=[...new Map(ordered.map(team=>[team.name,team])).values()];
 return <div className="fcClubField"><label>{label}<input name={name} value={club} onChange={event=>setClub(event.target.value)} list={id} maxLength={100} required={required} placeholder={en?"Search club or enter your own":"Verein suchen oder selbst eintragen"} autoComplete="off"/><datalist id={id}>{unique.map(team=><option key={team.id} value={team.name}>{team.country} · {team.gender==="women"?(en?"Women":"Frauen"):(en?"Men":"Männer")}</option>)}</datalist></label>{match&&<div className="fcClubPreview"><FootballClubBadge name={match.name} clubId={match.id}/><span>{match.name}<small>{match.country}</small></span></div>}</div>;
}

export function FootballCompetitionField({value,en=false}:{value:string;en?:boolean}){
 const id=useId();return <label>{en?"Competition":"Wettbewerb"}<input name="competition" defaultValue={value} list={id} required maxLength={100}/><datalist id={id}>{footballLeagues.map(league=><option key={league.id} value={league.name}/>)}{["UEFA Champions League","UEFA Europa League","UEFA Conference League","DFB-Pokal","FA Cup","Copa del Rey","Coppa Italia","Coupe de France","FIFA Club World Cup"].map(name=><option key={name} value={name}/>)}</datalist></label>;
}

export function FootballLeagueClubFields({league:initialLeague="Bundesliga",club:initialClub="",clubName="club_name",clubLabel,leagueLabel,en=false,includeClubs=false,initialClubs,showClub=true}:{league?:string;club?:string;clubName?:string;clubLabel?:string;leagueLabel?:string;en?:boolean;includeClubs?:boolean;initialClubs?:string[];showClub?:boolean}){
 const initial=findFootballLeague(initialLeague),[league,setLeague]=useState(initial?.name||initialLeague),[club,setClub]=useState(initialClub),[custom,setCustom]=useState(!initial);
 const [roster,setRoster]=useState((initialClubs||footballLeagueClubNames(initialLeague,initialClub||undefined)).join("\n"));
 const teams=clubsForFootballLeague(league),selected=findFootballClub(club,league);
 function changeLeague(value:string){setLeague(value);const names=footballLeagueClubNames(value,showClub?undefined:club);setRoster(names.join("\n"));if(showClub&&!names.includes(club))setClub("");}
 return <div className="fcCatalogFields">
  <div className={showClub?"grid2":""}><label>{leagueLabel||(en?"League":"Liga")}{custom?<input name="league" value={league} onChange={event=>setLeague(event.target.value)} required maxLength={100}/>:<select name="league" value={league} onChange={event=>changeLeague(event.target.value)} required><FootballLeagueOptions en={en}/></select>}</label>
  {showClub&&<label>{clubLabel||(en?"Club":"Verein")}{custom?<input name={clubName} value={club} onChange={event=>setClub(event.target.value)} required maxLength={100} placeholder={en?"Your club from the save":"Dein Verein aus dem Spielstand"}/>:<select name={clubName} value={club} onChange={event=>setClub(event.target.value)} required><option value="">{en?"Choose club":"Verein wählen"}</option>{club&&!teams.some(team=>team.name===club)&&<option value={club}>{club} · {en?"from your save":"aus deinem Spielstand"}</option>}{teams.map(team=><option key={team.id} value={team.name}>{team.name}</option>)}</select>}</label>}</div>
  <div className="fcCatalogTools">{showClub&&selected&&<div className="fcClubPreview"><FootballClubBadge name={selected.name} clubId={selected.id}/><span>{selected.name}<small>{selected.country} · {selected.gender==="women"?(en?"Women's football":"Frauenfußball"):(en?"Men's football":"Männerfußball")}</small></span></div>}<button type="button" className="secondaryButton" onClick={()=>{if(custom&&!findFootballLeague(league))changeLeague("Bundesliga");setCustom(!custom);}}>{custom?(en?"Choose from EAFC":"Aus EAFC auswählen"):(en?"Use own league / club":"Eigene Liga / Verein eintragen")}</button><Link href="/fc/teams">{en?"All leagues & clubs":"Alle Ligen & Vereine"} ↗</Link></div>
  {includeClubs&&<details className="formDisclosure"><summary>{en?"League clubs from your save":"Ligavereine aus deinem Spielstand"}</summary><p className="finePrint">{en?"The selected league's clubs are included. Adjust this list for promotions, relegations or a created club in your save. One club per line, including your club.":"Die Vereine der gewählten Liga sind bereits enthalten. Passe die Liste an Aufsteiger, Absteiger oder deinen erstellten Verein an. Ein Verein pro Zeile, einschließlich deines Vereins."}</p><label>{en?"Clubs":"Vereine"}<textarea name="clubs" rows={8} value={roster} onChange={event=>setRoster(event.target.value)}/></label>{custom&&<p className="finePrint">{en?"Add your own club to this list or clear it to start without a league roster.":"Ergänze deinen eigenen Verein in der Liste oder leere sie, um ohne Ligakatalog zu beginnen."}</p>}</details>}
 </div>;
}

export function FootballScheduleClubs({league,club,clubs,en=false}:{league:string;club:string;clubs:string[];en?:boolean}){
 const [value,setValue]=useState(clubs.join("\n")),catalog=footballLeagueClubNames(league,club);
 return <>{catalog.length>1&&<button type="button" className="secondaryButton" onClick={()=>setValue(catalog.join("\n"))}>{en?"Load all clubs from this league":"Alle Vereine dieser Liga laden"} ({catalog.length})</button>}<label>{en?"Clubs (one per line)":"Vereine (ein Verein pro Zeile)"}<textarea name="clubs" rows={10} value={value} onChange={event=>setValue(event.target.value)} required/></label></>;
}
