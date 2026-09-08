import Link from "next/link";
import AdminConsole from "@/components/AdminConsole";
import {controlData} from "@/lib/control";
import {langOf} from "@/lib/i18n";
import {PageHeader} from "@/components/Editorial";
export const dynamic="force-dynamic";
export default async function Page(){const data=await controlData(),lang=langOf(data.universe),en=lang==="en";return <><PageHeader title={en?"Behind the scenes":"Hinter den Kulissen"} subtitle={en?"Manage the facts of your career. The world builds on what you record here.":"Verwalte die Fakten deiner Karriere. Was du hier festhältst, prägt deine Welt."} actions={<Link href="/universes">{en?"Switch career":"Karriere wechseln"} →</Link>}/><AdminConsole language={lang} initialData={data}/></>;}
