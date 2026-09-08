import Link from "next/link";
import TeamBadge from "@/components/TeamBadge";
import CompetitionBadge from "@/components/CompetitionBadge";
import {localDate} from "@/lib/format";
import {stageLabel} from "@/lib/labels";
import type {AppLanguage} from "@/lib/i18n";
export default function Scoreboard({game,language,compact=false}: {game:any;language:AppLanguage;compact?:boolean}) {
  const en=language==="en",done=game.status==="completed";
  return <div className={"scoreboard"+(compact?" compact":"")}>
    <div className="scoreboardMeta"><span>{localDate(game.game_day,language)}</span><CompetitionBadge stage={game.stage} small/><span>{done?(en?"Final":"Endstand"):stageLabel(game.stage,language)}</span></div>
    <div className="scoreboardTeams">
      <div className="scoreboardTeam"><TeamBadge team={game.away}/><strong>{game.away?.abbreviation||"—"}</strong><span>{game.away?.city} {game.away?.name}</span></div>
      <div className="scoreboardScore">{done?<><strong>{game.away_score??"—"}</strong><span>:</span><strong>{game.home_score??"—"}</strong></>:<span className="versus">VS</span>}</div>
      <div className="scoreboardTeam"><TeamBadge team={game.home}/><strong>{game.home?.abbreviation||"—"}</strong><span>{game.home?.city} {game.home?.name}</span></div>
    </div>
    {compact&&<Link className="scoreboardLink" href={"/game/"+game.id+(done?"":"#stats")}>{done?(en?"Game report":"Zum Spielbericht"):(en?"Open game":"Spiel öffnen")} →</Link>}
  </div>;
}
