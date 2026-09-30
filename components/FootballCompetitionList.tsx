import {competitionsForFootballLeague,footballCompetitionSources} from "@/lib/football-competitions";
export default function FootballCompetitionList({league,en=false}:{league:string;en?:boolean}){
 const cups=competitionsForFootballLeague(league,"cup"),international=competitionsForFootballLeague(league,"international");
 return <div className="fcCompetitionCatalog"><p>{en?"FC27 competitions for":"FC27-Wettbewerbe für"} <strong>{league}</strong></p><div className="grid2">
  <section><h3>{en?"Domestic cups":"Nationale Pokale"}</h3>{cups.length?<ul>{cups.map(name=><li key={name}>{name}</li>)}</ul>:<p className="finePrint">{en?"No domestic cup is listed for this league in the FC27 tournament catalog.":"Für diese Liga ist im FC27-Turnierkatalog kein nationaler Pokal aufgeführt."}</p>}</section>
  <section><h3>International</h3><ul>{international.map(name=><li key={name}>{name}</li>)}</ul></section>
 </div><p className="finePrint">{en?"Choose the match type first when entering a fixture. Competition names from your own save can also be entered.":"Wähle beim Spieleintrag zuerst die Spielart. Wettbewerbsnamen aus deinem eigenen Spielstand kannst du ebenfalls eintragen."} <a href={footballCompetitionSources[0]} target="_blank" rel="noreferrer">EA FC27 ↗</a> · <a href={footballCompetitionSources[1]} target="_blank" rel="noreferrer">{en?"FC27 tournament list":"FC27-Turnierliste"} ↗</a></p></div>;
}
