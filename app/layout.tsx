import "./fonts.css";
import "./globals.css";
import Nav from "@/components/Nav";
import {activeContext} from "@/lib/universe";
import {currentUser} from "@/lib/auth";
import {uiLanguage} from "@/lib/ui-language";
export const metadata={title:{default:"Career Universe",template:"%s · Career Universe"},description:"Dein persönliches MyNBA-Karrierejournal.",icons:{icon:"/favicon.svg"}};
export default async function RootLayout({children}:{children:React.ReactNode}) {
  const [context,user,language]=await Promise.all([activeContext(),currentUser(),uiLanguage()]);
  return <html lang={language}><body>
    <Nav language={language} signedIn={Boolean(user)} universeName={context?.universe.name} team={context?.career.current_team?.abbreviation}/>
    <main className="shell" id="main">{children}</main>
    <footer className="footer"><strong>CAREER / UNIVERSE</strong><span>{language==="en"?"A personal MyNBA world. Stories, voices and contracts are simulated.":"Eine persönliche MyNBA-Welt. Berichte, Stimmen und Verträge sind simuliert."}</span><span>{language==="en"?"Team marks © their respective owners.":"Teamzeichen © der jeweiligen Rechteinhaber."}</span></footer>
  </body></html>;
}
