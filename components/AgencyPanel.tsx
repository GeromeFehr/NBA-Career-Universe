"use client";

import {useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {money, addYears, contractState, offerConflict, type CareerContract} from "@/lib/agency-display";
import {localDate} from "@/lib/format";
import {label} from "@/lib/labels";
import StatusMessage from "@/components/StatusMessage";
import {Section, EmptyState} from "@/components/Editorial";

type Props = {contracts: CareerContract[]; careerDate: string; language: "de" | "en"};

export default function AgencyPanel({contracts, careerDate, language}: Props) {
  const router = useRouter(), en = language === "en", locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [processed, setProcessed] = useState<string[]>([]);

  async function run(body: Record<string, unknown>, success: string) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setMessage(""); setFailed(false);
    try {
      const res = await fetch("/api/admin/agency", {
        method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error);
      if (typeof body.contractId === "string") setProcessed(ids => [...ids, body.contractId as string]);
      setMessage(body.action === "negotiate" && data.offers === 0
        ? (en ? "No new offers today. Review your existing offers or continue your career before checking again."
          : "Heute gibt es keine neuen Angebote. Prüfe die vorliegenden Angebote oder spiele deine Karriere weiter.")
        : success);
      router.refresh();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  const offers = contracts.filter(x => contractState(x, careerDate) === "offered");
  const signed = contracts.filter(x => Boolean(x.signed_at));
  const archive = contracts.filter(x => !x.signed_at && contractState(x, careerDate) !== "offered");
  const category = (value: string) => ({
    salary: en ? "Player salary" : "Spielergehalt", footwear: en ? "Footwear" : "Schuhe",
    nutrition: en ? "Sports nutrition" : "Sporternährung", audio: "Audio", watches: en ? "Watches" : "Uhren",
  }[value] || value);

  function contract(x: CareerContract, offer = false) {
    const conflict = offer ? offerConflict(x, contracts, careerDate) : undefined;
    const handled = processed.includes(x.id);
    const start = offer && x.kind === "sponsorship" ? careerDate : x.start_date;
    const end = offer && x.kind === "sponsorship" ? addYears(careerDate, 2) : x.end_date;
    return <article className="contract" key={x.id}>
      <div className="contractHeading">
        <div><span>{category(x.category)}</span><h3>{x.brand}</h3></div>
        <div className="contractAmount"><strong>{money(x.annual_value, language)}</strong><small>{en ? "per year, gross" : "pro Jahr, brutto"}</small></div>
      </div>
      <dl className="contractTerms">
        <div><dt>{en ? "Term (end excluded)" : "Laufzeit (Endtag nicht enthalten)"}</dt><dd>{localDate(start, language)} – {localDate(end, language)}</dd></div>
        <div><dt>{en ? "Signing bonus" : "Unterschriftsbonus"}</dt><dd>{money(x.signing_bonus, language)}</dd></div>
        <div><dt>{en ? "Agent fee" : "Beraterprovision"}</dt><dd>{x.agent_fee_pct} %</dd></div>
        <div><dt>{en ? "Monthly after agent fee" : "Monatlich nach Provision"}</dt><dd>{money(x.annual_value / 12 * (1 - x.agent_fee_pct / 100), language)}</dd></div>
      </dl>
      <p className="contractObligations">{x.kind === "salary"
        ? (en ? "Your salary contract follows your player when traded. Completed months since the contract start are included."
          : "Dein Gehaltsvertrag folgt deinem Spieler bei einem Trade. Abgeschlossene Monate seit Vertragsbeginn werden berücksichtigt.")
        : (en ? "Exclusive category · 4 appearances and 6 social posts per year. Two years from signature."
          : "Exklusive Kategorie · 4 Auftritte und 6 Social-Beiträge pro Jahr. Zwei Jahre ab Unterschrift.")}</p>
      {offer ? <div className="contractDecision">
        <p className="muted">{en ? "Offer valid through" : "Angebot gültig bis"} {localDate(x.expires_on, language)}</p>
        {conflict && <StatusMessage tone="warning">{en
          ? `An overlapping contract with ${conflict.brand} already covers this category.`
          : `Ein Vertrag mit ${conflict.brand} belegt diese Kategorie bereits im selben Zeitraum.`}</StatusMessage>}
        <div className="buttonRow">
          <button disabled={busy || handled || Boolean(conflict)} onClick={() => run({action: "accept", contractId: x.id}, en ? "Contract signed. Your signing bonus and any payments due are on record." : "Vertrag unterschrieben. Unterschriftsbonus und fällige Zahlungen sind verbucht.")}>{en ? "Sign contract" : "Vertrag unterschreiben"}</button>
          <button className="secondaryButton" disabled={busy || handled} onClick={() => run({action: "decline", contractId: x.id}, en ? "Offer declined." : "Angebot abgelehnt.")}>{en ? "Decline" : "Ablehnen"}</button>
        </div>
      </div> : <p className="contractStatus">{label(contractState(x, careerDate), language)}</p>}
    </article>;
  }

  return <>
    {message && <StatusMessage tone={failed ? "error" : "success"}>{message}</StatusMessage>}
    <Section title={en ? "On your agent’s desk" : "Auf dem Tisch deines Beraters"} action={
      <button disabled={busy} onClick={() => run({action: "negotiate"}, en ? "Your agent’s offers are ready. New discussions become available on the next career date." : "Die Angebote liegen vor. Neue Gespräche sind am nächsten Karrieredatum möglich.")}>{en ? "Find sponsorships" : "Sponsoren anfragen"}</button>
    }>
      {offers.length ? offers.map(x => contract(x, true)) : <EmptyState title={en ? "Room for your next deal" : "Platz für deinen nächsten Deal"} detail={en ? "Your agent uses your profile and reputation to find simulated offers in available categories." : "Dein Berater sucht anhand deines Profils und deines Ansehens nach simulierten Angeboten in freien Kategorien."}/>}
    </Section>
    <Section title={en ? "Signed contracts" : "Deine unterschriebenen Verträge"} action={
      <button className="secondaryButton" disabled={busy} onClick={() => run({action: "settle"}, en ? "All payments due at your career date have been booked." : "Alle bis zum Karrieredatum fälligen Zahlungen sind gebucht.")}>{en ? "Book due payments" : "Fällige Zahlungen buchen"}</button>
    }>
      <p className="muted">{en ? "Payments are booked automatically when your career date advances. Completed calendar months are paid; partial months are prorated. All amounts are before taxes." : "Zahlungen werden automatisch gebucht, wenn dein Karrieredatum fortschreitet. Abgeschlossene Kalendermonate werden ausgezahlt, Teilmonate anteilig. Alle Beträge verstehen sich vor Steuern."}</p>
      {signed.length ? signed.map(x => contract(x)) : <p className="muted">{en ? "No signed contract yet." : "Noch kein unterschriebener Vertrag."}</p>}
    </Section>
    <details className="formDisclosure">
      <summary>{en ? "Add your MyNBA player contract" : "Deinen MyNBA-Spielervertrag eintragen"}</summary>
      <p>{en ? "Copy the annual salary from your save. Review and sign the offer above. You can adjust an unsigned offer by submitting this form again." : "Übernimm das Jahresgehalt aus deinem Spielstand. Prüfe und unterschreibe das Angebot anschließend oben. Ein noch nicht unterschriebenes Angebot kannst du durch erneutes Absenden anpassen."}</p>
      <form onSubmit={e => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run({action: "salary", annualValue: f.get("annualValue"), signingBonus: f.get("signingBonus"), startDate: f.get("startDate"), endDate: f.get("endDate")}, en ? "Contract ready for your signature." : "Der Vertrag liegt zur Unterschrift bereit.");
      }}>
        <fieldset disabled={busy}>
          <legend className="srOnly">{en ? "Player contract" : "Spielervertrag"}</legend>
          <div className="grid2">
            <label>{en ? "Annual salary (USD)" : "Jahresgehalt (USD)"}<input name="annualValue" type="number" min="1" max="1000000000" step="0.01" required/></label>
            <label>{en ? "Signing bonus (USD)" : "Unterschriftsbonus (USD)"}<input name="signingBonus" type="number" min="0" max="1000000000" step="0.01" defaultValue="0" required/></label>
            <label>{en ? "Start" : "Beginn"}<input name="startDate" type="date" defaultValue={careerDate} required/></label>
            <label>{en ? "End (exclusive)" : "Ende (ausschließlich)"}<input name="endDate" type="date" defaultValue={addYears(careerDate, 1)} required/></label>
          </div>
          <p>{en ? "Agent fee: 4%. Simulation values; no real payments." : "Beraterprovision: 4 %. Simulationswerte; es fließt kein echtes Geld."}</p>
          <button disabled={busy}>{en ? "Prepare contract" : "Vertrag vorbereiten"}</button>
        </fieldset>
      </form>
    </details>
    {archive.length > 0 && <details className="formDisclosure"><summary>{en ? "Past offers" : "Frühere Angebote"} ({archive.length})</summary>{archive.map(x => contract(x))}</details>}
  </>;
}
