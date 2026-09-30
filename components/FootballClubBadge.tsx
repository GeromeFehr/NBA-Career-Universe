"use client";
import {useState,type CSSProperties} from "react";
import {findFootballClub} from "@/lib/football-catalog";

export default function FootballClubBadge({name,color="#28684b",code,league,clubId}:{name:string;color?:string;code?:string;league?:string;clubId?:string}){
 const club=findFootballClub(clubId||name,league),[failed,setFailed]=useState<string|null>(null);
 const badge=club?.badge,show=badge&&failed!==badge;
 const initials=code||name.split(/\s+/).filter(word=>!/^fc$|^sc$|^sv$|^cf$/i.test(word)).map(word=>word[0]).join("").slice(0,3).toUpperCase()||"FC";
 return <span className={`clubMark${show?" clubMarkImage":""}`} style={{"--club":color} as CSSProperties} aria-label={name}>{show?<img src={badge} alt="" width={52} height={60} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(badge)}/>:initials}</span>;
}
