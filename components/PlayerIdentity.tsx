import Link from "next/link";
import type {CSSProperties} from "react";
import TeamBadge from "@/components/TeamBadge";
import {localDate} from "@/lib/format";
import type {AppLanguage} from "@/lib/i18n";
export default function PlayerIdentity({career,universe,language,children}: {career:any;universe:any;language:AppLanguage;children?:React.ReactNode}) {
  const en=language==="en";
  return <section className="playerIdentity" style={{"--team":career.current_team?.primary_color||"#25465b","--team-secondary":career.current_team?.secondary_color||"#dcb94a"} as CSSProperties}>
    <div className="playerFile">
      <div className="playerByline"><TeamBadge team={career.current_team} small/><span>{career.current_team?.city} {career.current_team?.name}</span><span>{career.position}</span></div>
      <h1>{career.player_name}</h1>
      <div className="playerDetails"><span>OVR <b>{career.overall}</b></span><span>Draft <b>{career.draft_year||"—"} / #{career.draft_pick||"—"}</b></span><span>{en?"Career date":"Karrieredatum"} <b>{localDate(career.universe_date,language)}</b></span></div>
      {children}
    </div>
    <div className="jerseyIndex"><span>{en?"Player file":"Spielerakte"}</span><strong>{career.jersey_number!=null?String(career.jersey_number).padStart(2,"0"):"—"}</strong><Link href="/career">{en?"Career record":"Karrierebilanz"} ↗</Link></div>
  </section>;
}
