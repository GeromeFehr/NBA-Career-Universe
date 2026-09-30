import Link from "next/link";
import {PageHeader} from "@/components/Editorial";
import FootballCatalog from "@/components/FootballCatalog";
import {uiLanguage} from "@/lib/ui-language";

export const metadata={title:"EAFC · Ligen & Vereine"};
export default async function Page(){const en=(await uiLanguage())==="en";return <div className="footballWorld"><PageHeader title={en?"The world of football":"Die Fußballwelt"} subtitle={en?"Every league. Every club. Your next career starts here.":"Alle Ligen. Alle Vereine. Hier beginnt deine nächste Karriere."} actions={<Link className="button" href="/universes?game=fc#create">{en?"Start EAFC career":"EAFC-Karriere starten"} →</Link>}/><FootballCatalog en={en}/></div>;}
