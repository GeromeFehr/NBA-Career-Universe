import {footballMediaCountry,outletsForFootballCountry} from "@/lib/football-outlets";
export default function FootballMediaSourceList({league,en=false}:{league:string;en?:boolean}){
 const country=footballMediaCountry("",league),outlets=outletsForFootballCountry(country);
 return <div className="fcCompetitionCatalog"><p>{en?"Media profiles for":"Medienprofile für"} <strong>{country}</strong></p><ul>{outlets.map(outlet=><li key={outlet.name}><a href={outlet.url} target="_blank" rel="noreferrer">{outlet.name} ↗</a>{outlet.broadcast&&` · ${en?"TV analysis":"TV-Analyse"}`}</li>)}</ul><p className="finePrint">{en?"These outlet profiles are used for simulated career reports, supplemented by international media, fictional supporters and social posts.":"Diese Portalprofile dienen simulierten Karriereberichten. Dazu kommen internationale Medien, fiktive Fanstimmen und Social-Posts."}</p></div>;
}
