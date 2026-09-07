import AdminConsole from "@/components/AdminConsole";
import { pageContext } from "@/lib/universe";

export const dynamic="force-dynamic";

export default async function Page(){
  const {universe}=await pageContext();
  return <>
    <div className="sectionHead">
      <div><span className="eyebrow">CONTROL ROOM · {universe.name}</span><h1>Career Control Room</h1></div>
      <a className="buttonLink" href="/universes">Universe wechseln</a>
    </div>
    <AdminConsole/>
  </>;
}
