import AdminConsole from "@/components/AdminConsole";
import {pageContext} from "@/lib/universe";
import {langOf} from "@/lib/i18n";

export const dynamic="force-dynamic";

export default async function Page(){
  const {universe}=await pageContext();
  const lang=langOf(universe);
  return <>
    <div className="sectionHead">
      <div><span className="eyebrow">CONTROL ROOM · {universe.name}</span><h1>Career Control Room</h1></div>
      <a className="buttonLink" href="/universes">{lang==="en"?"Switch universe":"Universe wechseln"}</a>
    </div>
    <AdminConsole language={lang}/>
  </>;
}
