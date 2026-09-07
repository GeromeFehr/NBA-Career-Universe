import {pageContext} from "@/lib/universe";
import {langOf,t} from "@/lib/i18n";
import LanguageSwitch from "@/components/LanguageSwitch";
import AiUsageMeter from "@/components/AiUsageMeter";

export const dynamic="force-dynamic";
export default async function Page(){
 const {universe,user}=await pageContext();
 const lang=langOf(universe);
 return <>
  <div className="sectionHead"><div><span className="eyebrow">SYSTEM</span><h1>{t(lang,"setup")}</h1></div></div>
  <AiUsageMeter language={lang}/>
  <div className="grid2">
   <div className="card"><h2>{t(lang,"language")}</h2><p>{lang==="en"?"Choose the language for the whole universe. New AI content is generated in the selected language.":"Wähle die Sprache für das gesamte Universe. Neue KI-Inhalte werden in der gewählten Sprache erzeugt."}</p><LanguageSwitch universeId={universe.id} language={lang}/></div>
   <div className="card"><h2>{t(lang,"account")}</h2><p>{user.email}</p><p className="muted">{lang==="en"?"Supabase Auth · separate sessions and users.":"Supabase Auth · getrennte Sessions und Benutzer."}</p></div>
   <div className="card"><h2>{t(lang,"activeUniverse")}</h2><p>{universe.name} · {universe.visibility}</p><p className="muted">{lang==="en"?"Separate results, stats, storylines, trades and media.":"Eigene Ergebnisse, Stats, Storylines, Trades und Medien."}</p></div>
   <div className="card"><h2>{t(lang,"privacy")}</h2><p>Multi-Tenant + RLS</p><p className="muted">{lang==="en"?"Career data belongs to its owner. Public universes are read-only.":"Karriere-Daten sind dem jeweiligen Besitzer zugeordnet. Öffentliche Universen sind nur lesbar."}</p></div>
   <div className="card"><h2>{t(lang,"ai")}</h2><p>OpenAI Responses API</p><p className="muted">{lang==="en"?"AI sees context only from the selected career and follows this universe's language.":"Die KI sieht nur Kontext der ausgewählten Karriere und folgt der Sprache dieses Universe."}</p></div>
  </div>
 </>;
}
