import Link from "next/link";
export default function Nav(){
  return <header className="topbar">
    <Link className="brand" href="/"><span className="brandDot"/>CAREER//UNIVERSE</Link>
    <nav className="navlinks">
      <Link href="/">Feed</Link><Link href="/schedule">Spielplan</Link><Link href="/career">Karriere</Link>
      <Link href="/media">News</Link><Link href="/social">Social</Link><Link href="/trades">Trades</Link>
      <Link href="/awards">Awards</Link><Link href="/admin">Control Room</Link>
    </nav>
  </header>
}
