import "./globals.css";
import Nav from "@/components/Nav";
export const metadata={title:"NBA Career Universe",description:"Persistent MyNBA career storyline world"};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="de"><body><Nav/><main className="shell">{children}</main><footer className="footer">Private MyNBA simulation companion · schedule data is synced from configured public sources.</footer></body></html>
}
