import "./globals.css";
import Nav from "@/components/Nav";
export const metadata={title:"NBA Career Universe",description:"Multi-user persistent MyNBA career storyline world"};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="de"><body><Nav/><main className="shell">{children}</main><footer className="footer">MyNBA career universe · getrennte Accounts, getrennte Welten, gemeinsamer NBA-Spielplan.</footer></body></html>
}
