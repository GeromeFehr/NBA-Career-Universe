import {pageContext, fetchPaged} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import {checked} from "@/lib/data";
import {localDate} from "@/lib/format";
import {Section, EmptyState} from "@/components/Editorial";
import TrophyForm from "@/components/TrophyForm";

export default async function CareerHonors() {
  const {client, career, universe} = await pageContext();
  const language = langOf(universe), en = language === "en";
  const [awards, trophies, recaps, legacy, seasons] = await Promise.all([
    fetchPaged((from, to) => client.from("award_snapshots").select("*").eq("career_id", career.id)
      .eq("season_id", universe.current_season_id!).eq("language", language)
      .order("as_of_date", {ascending: false}).order("id").range(from, to)),
    fetchPaged((from, to) => client.from("trophies").select("*,season:season_id(*)").eq("career_id", career.id)
      .eq("language", language).order("awarded_on", {ascending: false}).order("id").range(from, to)),
    fetchPaged((from, to) => client.from("season_recaps").select("*,season:season_id(*)").eq("career_id", career.id)
      .eq("language", language).order("created_at", {ascending: false}).order("id").range(from, to)),
    client.from("legacy_scores").select("*").eq("career_id", career.id).maybeSingle().then(checked),
    client.from("seasons").select("*").order("start_date").then(checked),
  ]);
  const latest = new Map<string, (typeof awards)[number]>();
  for (const award of awards) if (!latest.has(award.award)) latest.set(award.award, award);

  return <>
    <Section id="honors" title={en ? "Trophies & achievements" : "Trophäen & Erfolge"}
      action={<span>{en ? "Legacy score" : "Karrierestellenwert"}: <strong>{legacy?.score ?? 0}/100</strong></span>}>
      {trophies.length ? <div className="trophyGrid">{trophies.map(trophy => <article className="trophyCard" key={trophy.id}>
        <div className="trophyIcon" aria-hidden="true">★</div>
        <small>{trophy.season?.label || localDate(trophy.awarded_on, language)}</small>
        <h3>{trophy.title}</h3><p>{trophy.detail}</p>
        {trophy.source === "award_tracker" && <p className="finePrint">{en ? "Historical race entry. Confirm an actual win separately." : "Früherer Ranglisteneintrag. Einen tatsächlichen Titel bitte gesondert bestätigen."}</p>}
      </article>)}</div> : <EmptyState title={en ? "Your first trophy is ahead" : "Deine erste Trophäe liegt noch vor dir"}
        detail={en ? "Record achievements when you earn them in MyNBA." : "Trage Erfolge ein, sobald du sie in MyNBA erreicht hast."}/>}
      <details className="formDisclosure"><summary>{en ? "Add an achievement" : "Erfolg hinzufügen"}</summary>
        <TrophyForm seasons={seasons || []} currentSeasonId={universe.current_season_id} careerDate={career.universe_date} language={language}/>
      </details>
    </Section>
    <Section id="award-races" title={en ? "Award races" : "Im Rennen um die Awards"}>
      <p className="muted">{en ? "Current season standings. A race position is not a confirmed title." : "Die Zwischenstände der aktuellen Saison. Ein Ranglistenplatz ist noch kein gewonnener Titel."}</p>
      {latest.size ? <div className="offerGrid">{Array.from(latest.values()).map(award => <article className="card" key={award.id}>
        <small>{localDate(award.as_of_date, language)}</small><h3>{award.award} · #{award.rank}</h3><p>{award.note}</p>
      </article>)}</div> : <p className="muted">{en ? "No award standings recorded yet." : "Noch keine Award-Zwischenstände verzeichnet."}</p>}
    </Section>
    <Section id="season-archive" title={en ? "Season archive" : "Saisonarchiv"}>
      {recaps.length ? recaps.map(recap => <article className="card" key={recap.id}>
        <small>{recap.season?.label}</small><h3>{recap.title}</h3><p>{recap.summary}</p>
        <small>{en ? "Legacy snapshot" : "Historischer Karrierestellenwert"}: {recap.legacy_delta}/100</small>
      </article>) : <p className="muted">{en ? "Completed seasons will appear here." : "Abgeschlossene Saisons erscheinen hier."}</p>}
    </Section>
  </>;
}
