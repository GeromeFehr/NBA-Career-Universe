import "./globals.css";
import Nav from "@/components/Nav";
export const metadata={title:"NBA Career Universe",description:"Multi-user persistent MyNBA career storyline world"};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="de"><body><Nav/><main className="shell">{children}</main><footer className="footer">MyNBA career universe · getrennte Accounts, getrennte Welten, gemeinsamer NBA-Spielplan. · <a href="https://www.sportslogos.net/teams/list_by_year/62026/2026-NBA-Logos-By-Year/" target="_blank" rel="noreferrer">Logo-Quelle: SportsLogos.Net</a></footer></body></html>
}
