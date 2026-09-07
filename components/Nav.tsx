import Link from "next/link";
import { currentUser } from "@/lib/auth";

export default async function Nav(){
  const user=await currentUser();
  return <header className="topbar">
    <Link className="brand" href="/"><span className="brandDot"/>CAREER//UNIVERSE</Link>
    <nav className="navlinks">
      {user?<><Link href="/">Feed</Link><Link href="/schedule">Spielplan</Link><Link href="/career">Karriere</Link>
      <Link href="/media">News</Link><Link href="/social">Social</Link><Link href="/trades">Trades</Link>
      <Link href="/awards">Awards</Link><Link href="/admin">Control Room</Link><Link href="/universes">Universen</Link></>
      :<><Link href="/login">Login</Link><Link href="/register">Registrieren</Link></>}
    </nav>
  </header>
}
