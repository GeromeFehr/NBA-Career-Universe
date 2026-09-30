import Link from "next/link";
export function SportArtwork({sport}:{sport:"nba"|"fc"}){return <svg className="sportArtwork" viewBox="0 0 600 420" fill="none" aria-hidden="true">{sport==="nba"?<g transform="translate(65 85) scale(5)" strokeWidth=".4" strokeLinejoin="round">
 <rect width="94" height="50"/>
 <path d="M47 0v50"/><circle cx="47" cy="25" r="6"/>
 <path d="M0 17h19v16H0M94 17H75v16h19"/>
 <path d="M19 19a6 6 0 0 1 0 12M75 19a6 6 0 0 0 0 12"/>
 <path d="M19 19a6 6 0 0 0 0 12M75 19a6 6 0 0 1 0 12" strokeDasharray=".6 .6"/>
 <path d="M0 3h14.2a23.75 23.75 0 0 1 0 44H0M94 3H79.8a23.75 23.75 0 0 0 0 44H94"/>
 <path d="M4 21h1.25a4 4 0 0 1 0 8H4M90 21h-1.25a4 4 0 0 0 0 8H90M4 22v6M90 22v6"/>
 <circle cx="5.25" cy="25" r=".75"/><circle cx="88.75" cy="25" r=".75"/>
 </g>:<><path d="M80 70h440v310H80zM80 225h440M180 70v68h240V70M180 380v-68h240v68"/><circle cx="300" cy="225" r="63"/><path d="M235 70v28h130V70M235 380v-28h130v28"/><circle className="sportBall" cx="425" cy="285" r="65"/><path d="m425 250 34 25-13 40h-42l-13-40zm-34 25-29-11m42 51-11 30m53-30 12 30m1-70 27-13m-61-12v-29"/></>}</svg>;}
export default function GameSelection({en=false,signedIn=false,nbaCount=0,fcCount=0,compact=false}:{en?:boolean;signedIn?:boolean;nbaCount?:number;fcCount?:number;compact?:boolean}){return <section className={compact?"gameSelection compact":"gameSelection"}>
 {!compact&&<div className="universeIntro"><span className="eyebrow">CAREER UNIVERSE / {en?"CHOOSE YOUR WORLD":"WÄHLE DEINE WELT"}</span><h1>{en?<>Your game.<br/><em>Your universe.</em></>:<>Dein Spiel.<br/><em>Dein Universum.</em></>}</h1><p>{en?"From your first tipoff to your biggest final. Keep your careers, results and stories together in one account.":"Vom ersten Tipoff bis zum großen Finale. Deine Karrieren, Ergebnisse und Geschichten – gemeinsam in einem Account."}</p></div>}
 <div className="gameEditions"><Link className="gameEdition nbaEdition" href={signedIn?"/universes?game=nba":"/login?game=nba"}><div className="editionIndex"><span>01 / BASKETBALL</span><span>NBA 2K ↗</span></div><SportArtwork sport="nba"/><div className="editionCopy"><span>MYNBA</span><h2>{en?"Own the court.":"Dein Court."}</h2><p>{en?"Your player. Your league. Stats, stories, contracts and co-op.":"Dein Spieler. Deine Liga. Stats, Geschichten, Verträge und Koop."}</p><strong>{signedIn?`${nbaCount} ${en?"careers":"Karrieren"} · ${en?"Open":"Öffnen"}`:en?"Enter the world":"Welt betreten"}<span>→</span></strong></div></Link>
 <Link className="gameEdition fcEdition" href={signedIn?"/universes?game=fc":"/login?game=fc"}><div className="editionIndex"><span>02 / FOOTBALL</span><span>EAFC ↗</span></div><SportArtwork sport="fc"/><div className="editionCopy"><span>{en?"CAREER MODE":"KARRIEREMODUS"}</span><h2>{en?"Write football history.":"Dein Fußball."}</h2><p>{en?"From the dressing room to the headline. Matches, tactics, transfers and trophies.":"Von der Kabine in die Schlagzeilen. Spiele, Taktik, Transfers und Trophäen."}</p><strong>{signedIn?`${fcCount} ${en?"careers":"Karrieren"} · ${en?"Open":"Öffnen"}`:en?"Enter the world":"Welt betreten"}<span>→</span></strong></div></Link></div>
 {!signedIn&&!compact&&<p className="gameAccount">{en?"One account for both games.":"Ein Account für beide Spiele."} <Link href="/register">{en?"Create account":"Konto erstellen"} →</Link></p>}
 </section>;}
