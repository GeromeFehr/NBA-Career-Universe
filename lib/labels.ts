import type {AppLanguage} from "@/lib/i18n";

const labels: Record<string, [string, string]> = {
  upcoming:["Beginnt demnächst","Starts soon"],
  expired:["Abgelaufen","Expired"], corrected:["Eintrag korrigiert","Entry corrected"], recovered:["Genesen","Recovered"], offered:["Angeboten","Offered"],
  active:["Aktiv","Active"], inactive:["Inaktiv","Inactive"], completed:["Abgeschlossen","Completed"],
  scheduled:["Angesetzt","Scheduled"], cancelled:["Abgesagt","Cancelled"], postponed:["Verschoben","Postponed"],
  pending:["Offen","Pending"], accepted:["Angenommen","Accepted"], declined:["Abgelehnt","Declined"],
  withdrawn:["Zurückgezogen","Withdrawn"], resolved:["Abgeschlossen","Resolved"], open:["Offen","Open"],
  answered:["Beantwortet","Answered"], skipped:["Übersprungen","Skipped"], failed:["Nicht erreicht","Not reached"],
  private:["Privat","Private"], public:["Öffentlich","Public"], unknown:["Noch offen","Unknown"],
  played:["Gespielt","Played"], dnp_injury:["DNP · verletzt","DNP · injury"], dnp_coach:["DNP · Trainerentscheidung","DNP · coach decision"],
  suspended:["Gesperrt","Suspended"], ejected:["Platzverweis","Ejected"], fouled_out:["Ausgefoult","Fouled out"],
  injured:["Verletzt","Injured"], "day-to-day":["Von Tag zu Tag","Day to day"], minor:["Leicht","Minor"], moderate:["Mittel","Moderate"], major:["Schwer","Major"],
  career:["Karriere","Career"], season:["Saison","Season"], playoffs:["Playoffs","Playoffs"],
  hype:["Aufmerksamkeit","Hype"], adversity:["Rückschlag","Adversity"], performance:["Leistung","Performance"],
  draft:["Draft-Hintergrund","Draft background"], development:["Entwicklung","Development"], rookie_hype:["Rookie im Fokus","Rookie watch"], defense:["Defense","Defense"], pressure:["Druck","Pressure"],
  criticism:["Kritik","Criticism"], discipline:["Disziplin","Discipline"], efficiency:["Efficiency","Efficiency"],
  rivalry:["Rivalität","Rivalry"], trade:["Trade","Trade"], generic:["Zum Spiel","Game review"],
  game:["Spiel","Game"], debut:["Debüt","Debut"], injury:["Verletzung","Injury"], injury_return:["Rückkehr","Return"],
  season_transition:["Saisonwechsel","New season"], locker_room:["Kabine","Locker room"], coach:["Trainer","Coach"],
  contract:["Vertrag","Contract"], suspension:["Sperre","Suspension"], milestone:["Meilenstein","Milestone"], other:["Sonstiges","Other"],
  current_team:["Eigene Fans","Team fans"], opponent_fans:["Gegnerische Fans","Opponent fans"], nba_overall:["Ligaweit","League-wide"],
  neutral:["Neutral","Neutral"], critical:["Kritisch","Critical"], skeptical:["Skeptisch","Skeptical"],
  supportive:["Unterstützend","Supportive"], analytical:["Analytisch","Analytical"], balanced:["Abwägend","Balanced"],
  "reluctantly impressed":["Widerwillig beeindruckt","Reluctantly impressed"],
  "Team-first":["Das Team zuerst","Team first"], "Film Room":["Videoanalyse","Film room"],
  player_response:["Spielerreaktion","Player response"], rumor:["Gerücht","Rumor"],
  low:["Gering","Low"], medium:["Mittel","Medium"], high:["Hoch","High"],
};
export function label(value: unknown, lang: AppLanguage): string {
  const key = String(value ?? "");
  return labels[key]?.[lang === "en" ? 1 : 0] ?? key;
}
export function stageLabel(value: unknown, lang: AppLanguage): string {
  const key=String(value || "Regular Season");
  const map: Record<string,[string,string]> = {
    "Regular Season":["Hauptrunde","Regular season"], "Regular":["Hauptrunde","Regular season"],
    "Playoffs - Round 1":["Playoffs · 1. Runde","Playoffs · First round"],
    "Conference Semifinals":["Conference-Halbfinale","Conference semifinals"],
    "Conference Finals":["Conference-Finale","Conference finals"], "Custom":["Eigenes Spiel","Custom game"],
  };
  return map[key]?.[lang === "en" ? 1 : 0] ?? key;
}
/** Never insert original prose from a different language into a universe. */
export function prose(row: any, key: string, lang: AppLanguage, fallback = "") {
  if(row?.localized_notes?.[lang] && Object.hasOwn(row.localized_notes[lang],key))return String(row.localized_notes[lang][key]??fallback);
  return (row?.notes_language ?? row?.language ?? "de") === lang ? String(row?.[key] ?? fallback) : fallback;
}
