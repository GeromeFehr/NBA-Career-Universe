import {pageContext} from "@/lib/universe";
import {langOf, t} from "@/lib/i18n";
import {label} from "@/lib/labels";
import LanguageSwitch from "@/components/LanguageSwitch";
import AiUsageMeter from "@/components/AiUsageMeter";
import WorldRebuildButton from "@/components/WorldRebuildButton";
import {PageHeader, Section} from "@/components/Editorial";

export const dynamic = "force-dynamic";
export default async function Page() {
  const {universe, user} = await pageContext();
  const language = langOf(universe), en = language === "en";
  return <>
    <PageHeader title={t(language, "setup")} subtitle={en ? "Language, account and the settings behind your career." : "Sprache, Konto und die Einstellungen deiner Karriere."}/>
    <AiUsageMeter language={language}/>
    <div className="grid2">
      <Section title={t(language, "language")}><p>{en ? "The selected language applies to your career and new stories. Existing texts remain stored in their original language." : "Die gewählte Sprache gilt für deine Karriere und neue Geschichten. Bestehende Texte bleiben in ihrer ursprünglichen Sprache gespeichert."}</p><LanguageSwitch universeId={universe.id} language={language}/></Section>
      <Section title={t(language, "account")}><p>{user.email}</p><p className="muted">{en ? "Your saves remain linked to this account." : "Deine Spielstände bleiben mit diesem Konto verknüpft."}</p></Section>
      <Section title={t(language, "activeUniverse")}><p>{universe.name} · {label(universe.visibility, language)}</p><p>{en ? "Each career keeps its own results, statistics, stories, contracts and decisions." : "Jede Karriere hat eigene Ergebnisse, Statistiken, Geschichten, Verträge und Entscheidungen."}</p><a className="textLink" href="/universes">{en ? "Manage careers" : "Karrieren verwalten"} →</a></Section>
      <Section title={en ? "Keep your career on record" : "Deine Karriere sichern"}><p>{en ? "Download your career, including contracts and payment history." : "Lade deine Karriere einschließlich der Verträge und des Zahlungsverlaufs herunter."}</p><a className="button" href="/api/admin/backup">{en ? "Download career backup" : "Karrieresicherung herunterladen"}</a></Section>
      <Section title={en ? "Recalculate career values" : "Karrierewerte neu berechnen"}><p>{en ? "Update calculated statistics and records after corrections. Stories, interviews and decisions remain saved." : "Aktualisiere berechnete Statistiken und Rekorde nach Korrekturen. Geschichten, Interviews und Entscheidungen bleiben gespeichert."}</p><WorldRebuildButton language={language}/></Section>
    </div>
  </>;
}
