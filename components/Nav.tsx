import Link from "next/link";
import {cookies} from "next/headers";
import {currentUser} from "@/lib/auth";
import {db} from "@/lib/db";
import {langOf,t} from "@/lib/i18n";
import LanguageSwitch from "@/components/LanguageSwitch";

export default async function Nav(){
  const user=await currentUser();
  let universe:any=null;
  if(user){
    const store=await cookies();
    const universeId=store.get("nba_universe")?.value;
    if(universeId){
      const {data}=await db().from("universes").select("id,owner_id,language").eq("id",universeId).maybeSingle();
      if(data?.owner_id===user.id)universe=data;
    }
  }
  const lang=langOf(universe),en=lang==="en";

  return <header className="topbar">
    <Link className="brand" href="/" aria-label="Career Universe Home"><span className="brandDot"/>CAREER//UNIVERSE</Link>

    <nav className="navlinks" aria-label={en?"Main navigation":"Hauptnavigation"}>
      {user?<>
        <Link href="/">{t(lang,"feed")}</Link>
        <Link href="/schedule">{t(lang,"schedule")}</Link>
        <Link href="/career">{t(lang,"career")}</Link>
        <Link href="/world">{t(lang,"world")}</Link>
        <Link href="/media">{t(lang,"news")}</Link>
        <Link href="/social">{t(lang,"social")}</Link>
        <Link href="/trades">{t(lang,"trades")}</Link>

        <details className="navMore">
          <summary>{en?"More":"Mehr"} <span>⌄</span></summary>
          <div className="navMenu">
            <Link href="/pregame">{t(lang,"pregame")}</Link>
            <Link href="/playoffs">{t(lang,"playoffs")}</Link>
            <Link href="/trophy-room">{t(lang,"trophyRoom")}</Link>
            <Link href="/interviews">{t(lang,"interviews")}</Link>
            <Link href="/awards">{t(lang,"awards")}</Link>
            <span className="navDivider"/>
            <Link href="/admin">{t(lang,"control")}</Link>
            <Link href="/settings">{t(lang,"settings")}</Link>
            <Link href="/universes">{t(lang,"universes")}</Link>
          </div>
        </details>
      </>:<>
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
      </>}
    </nav>

    {universe&&<div className="navLanguage"><LanguageSwitch universeId={universe.id} language={lang}/></div>}
  </header>;
}
