import {basketballTerms} from "@/lib/basketball-terms";
import Link from "next/link";
import TeamBadge from "@/components/TeamBadge";
import {gameOpponent} from "@/lib/game-opponent";
import {localDate} from "@/lib/format";
import type {AppLanguage} from "@/lib/i18n";
import type {Database} from "@/lib/database.types";

type Team = Database["public"]["Tables"]["teams"]["Row"];
type Grade = Database["public"]["Tables"]["postgame_grades"]["Row"] & {
  game: {game_day: string; home_team_id: string | null; away_team_id: string | null; home: Team | null; away: Team | null} | null;
};

export default function PostgameGradeCard({grade, teamId, language}: {grade: Grade; teamId?: string; language: AppLanguage}) {
  const en = language === "en", opponent = gameOpponent(teamId, grade.game);
  return <article className="card gradeCard">
    <Link className="gradeMatchup" href={`/game/${grade.game_id}`}>
      {opponent?.team ? <><TeamBadge team={opponent.team} small/><span>
        <strong>{en ? "vs." : "Gegen"} {opponent.team.abbreviation}</strong>
        <small>{localDate(grade.game?.game_day || "", language)} · {opponent.home ? (en ? "Home" : "Heim") : (en ? "Away" : "Auswärts")}</small>
      </span></> : <span>
        <strong>{grade.game ? `${grade.game.away?.abbreviation || "—"} @ ${grade.game.home?.abbreviation || "—"}` : (en ? "Game report" : "Spielbericht")}</strong>
        <small>{localDate(grade.game?.game_day || "", language)}</small>
      </span>}
    </Link>
    <strong className="gradeLetter">{grade.overall_grade}</strong>
    <p className="muted">{basketballTerms(grade.summary)}</p>
    <small>SC {grade.scoring} · PL {grade.playmaking} · DEF {grade.defense} · EFF {grade.efficiency} · DISC {grade.discipline}</small>
  </article>;
}
