import Link from "next/link";
export function SportArtwork({sport}:{sport:"nba"|"fc"}){return <svg className={`sportArtwork${sport==="fc"?" footballArtwork":""}`} viewBox="0 0 600 420" fill="none" aria-hidden="true">{sport==="nba"?<g transform="translate(65 85) scale(5)" strokeWidth=".4" strokeLinejoin="round">
 <rect width="94" height="50"/>
 <path d="M47 0v50"/><circle cx="47" cy="25" r="6"/>
 <path d="M0 17h19v16H0M94 17H75v16h19"/>
 <path d="M19 19a6 6 0 0 1 0 12M75 19a6 6 0 0 0 0 12"/>
 <path d="M19 19a6 6 0 0 0 0 12M75 19a6 6 0 0 1 0 12" strokeDasharray=".6 .6"/>
 <path d="M0 3h14.2a23.75 23.75 0 0 1 0 44H0M94 3H79.8a23.75 23.75 0 0 0 0 44H94"/>
 <path d="M4 21h1.25a4 4 0 0 1 0 8H4M90 21h-1.25a4 4 0 0 0 0 8H90M4 22v6M90 22v6"/>
 <circle cx="5.25" cy="25" r=".75"/><circle cx="88.75" cy="25" r=".75"/>
 </g>:<g transform="translate(48 47) scale(4.8)" strokeWidth=".4" strokeLinejoin="round">
 {/* One SVG unit represents one metre: a 105 × 68 pitch, without stretching. */}
 <g stroke="none" fill="currentColor" fillOpacity=".08">{[0,21,42,63,84].map(x=><rect key={x} x={x} width="10.5" height="68"/>)}</g>
 <rect width="105" height="68"/>
 <path d="M52.5 0v68"/><circle cx="52.5" cy="34" r="9.15"/>
 <path d="M0 13.84h16.5v40.32H0M105 13.84H88.5v40.32H105"/>
 <path d="M0 24.84h5.5v18.32H0M105 24.84H99.5v18.32H105"/>
 <path d="M16.5 26.69a9.15 9.15 0 0 1 0 14.62M88.5 41.31a9.15 9.15 0 0 1 0-14.62"/>
 <g fill="currentColor" stroke="none"><circle cx="52.5" cy="34" r=".5"/><circle cx="11" cy="34" r=".5"/><circle cx="94" cy="34" r=".5"/></g>
 <path d="M0 1a1 1 0 0 0 1-1M104 0a1 1 0 0 0 1 1M105 67a1 1 0 0 0-1 1M1 68a1 1 0 0 0-1-1"/>
 <g strokeOpacity=".65"><path d="M0 30.34h-2v7.32H0M105 30.34h2v7.32h-2"/><path d="M-1 30.34v7.32M106 30.34v7.32M-2 32.17h2M-2 34h2M-2 35.83h2M105 32.17h2M105 34h2M105 35.83h2" strokeWidth=".15"/></g>
 </g>}</svg>;}
export default function GameSelection({en=false,signedIn=false,nbaCount=0,fcCount=0,compact=false}:{en?:boolean;signedIn?:boolean;nbaCount?:number;fcCount?:number;compact?:boolean}){return <section className={compact?"gameSelection compact":"gameSelection"}>
 {!compact&&<div className="universeIntro"><span className="eyebrow">CAREER UNIVERSE / {en?"CHOOSE YOUR WORLD":"WÄHLE DEINE WELT"}</span><h1>{en?<>Your game.<br/><em>Your universe.</em></>:<>Dein Spiel.<br/><em>Dein Universum.</em></>}</h1><p>{en?"From your first tipoff to your biggest final. Keep your careers, results and stories together in one account.":"Vom ersten Tipoff bis zum großen Finale. Deine Karrieren, Ergebnisse und Geschichten – gemeinsam in einem Account."}</p></div>}
 <div className="gameEditions"><Link className="gameEdition nbaEdition" href={signedIn?"/universes?game=nba":"/login?game=nba"}><div className="editionIndex"><span>01 / BASKETBALL</span><span>NBA 2K ↗</span></div><SportArtwork sport="nba"/><div className="editionCopy"><span>MYNBA</span><h2>{en?"Own the court.":"Dein Court."}</h2><p>{en?"Your player. Your league. Stats, stories, contracts and co-op.":"Dein Spieler. Deine Liga. Stats, Geschichten, Verträge und Koop."}</p><strong>{signedIn?`${nbaCount} ${en?"careers":"Karrieren"} · ${en?"Open":"Öffnen"}`:en?"Enter the world":"Welt betreten"}<span>→</span></strong></div></Link>
 <Link className="gameEdition fcEdition" href={signedIn?"/universes?game=fc":"/login?game=fc"}><div className="editionIndex"><span>02 / FOOTBALL</span><span>EAFC ↗</span></div><SportArtwork sport="fc"/><div className="editionCopy"><span>{en?"CAREER MODE":"KARRIEREMODUS"}</span><h2>{en?"Write football history.":"Dein Fußball."}</h2><p>{en?"From the dressing room to the headline. Matches, tactics, transfers and trophies.":"Von der Kabine in die Schlagzeilen. Spiele, Taktik, Transfers und Trophäen."}</p><strong>{signedIn?`${fcCount} ${en?"careers":"Karrieren"} · ${en?"Open":"Öffnen"}`:en?"Enter the world":"Welt betreten"}<span>→</span></strong></div></Link></div>
 {!compact&&<p className="gameAccount"><Link href="/fc/teams">{en?"Explore EAFC leagues & clubs":"EAFC-Ligen & Vereine entdecken"} →</Link>{!signedIn&&<> · {en?"One account for both games.":"Ein Account für beide Spiele."} <Link href="/register">{en?"Create account":"Konto erstellen"} →</Link></>}</p>}
 </section>;}
