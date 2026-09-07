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
  const lang=langOf(universe);

  return <header className="topbar">
    <Link className="brand" href="/"><span className="brandDot"/>CAREER//UNIVERSE</Link>
    <nav className="navlinks">
      {user?<>
        <Link href="/">{t(lang,"feed")}</Link>
        <Link href="/schedule">{t(lang,"schedule")}</Link>
        <Link href="/career">{t(lang,"career")}</Link>
        <Link href="/media">{t(lang,"news")}</Link>
        <Link href="/social">{t(lang,"social")}</Link>
        <Link href="/trades">{t(lang,"trades")}</Link>
        <Link href="/awards">{t(lang,"awards")}</Link>
        <Link href="/admin">{t(lang,"control")}</Link>
        <Link href="/settings">{t(lang,"settings")}</Link>
        <Link href="/universes">{t(lang,"universes")}</Link>
      </>:<>
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
      </>}
    </nav>
    {universe&&<LanguageSwitch universeId={universe.id} language={lang}/>}
  </header>
}
