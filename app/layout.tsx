import {cookies,headers} from "next/headers";
import {readTheme,THEME_COOKIE} from "@/lib/theme";
import "./fonts.css";
import "./globals.css";
import "./football.css";
import Nav from "@/components/Nav";
import {selectedCareer} from "@/lib/career-selection";
import {activeFootball} from "@/lib/football-data";
import {activeContext} from "@/lib/universe";
import {currentUser} from "@/lib/auth";
import {uiLanguage} from "@/lib/ui-language";
export const dynamic="force-dynamic";
export const metadata={title:{default:"Career Universe",template:"%s · Career Universe"},description:"Deine NBA 2K- und EA FC 27-Karrieren. Spiele, Medien, Transfers und Koop in einem Account.",icons:{icon:"/favicon.svg"}};
export default async function RootLayout({children}:{children:React.ReactNode}) {
  const [context,football,nba,user,language]=await Promise.all([selectedCareer(),activeFootball(),activeContext(),currentUser(),uiLanguage()]);
  const theme=readTheme((await cookies()).get(THEME_COOKIE)?.value);
  const share=Boolean((await headers()).get("x-cu-share"));
  return <html lang={language} data-theme={theme}><body>
    <Nav initialTheme={theme} language={language} signedIn={!share&&Boolean(user)} game={context?.universe.game} mode={football?.profile.mode} universeName={share?undefined:context?.universe.name} team={share?undefined:football?.profile.club_code||nba?.career.current_team?.abbreviation}/>
    <main className="shell" id="main">{children}</main>
    <footer className="footer"><strong>CAREER / UNIVERSE</strong><span>{language==="en"?"NBA 2K & EA FC 27. Your careers, one universe. Stories and voices are simulated.":"NBA 2K & EA FC 27. Deine Karrieren, ein Universum. Berichte und Stimmen sind simuliert."}</span><span>{language==="en"?"Team marks © their respective owners.":"Teamzeichen © der jeweiligen Rechteinhaber."}</span></footer>
  </body></html>;
}
