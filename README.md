# NBA Career Universe v1.0

Eine vollwertige Begleit-Webapp für eine eigene MyNBA-Karriere. Der Kern ist nicht nur ein Stat-Tracker, sondern eine **persistente Story-Welt**.

## Was bereits drin ist

- alle 30 NBA-Teams inklusive Teamfarben
- Mehrsaison-Datenmodell
- kompletter Liga-Spielplan mit Team-/Monats-/Statusfiltern
- automatische Schedule-Synchronisierung mit Quellen-Fallback
- deine Rookie-Karriere als `G. Fehr`, 99 OVR, SG/SF, Draft #6
- dein erstes gespeichertes Spiel: **50 PTS / 21 REB / 6 AST / 1 STL / 11 BLK**, 18/33 FG, 3/9 3PT, 11/12 FT, +36 in 28 Minuten beim 128:92 gegen die Lakers
- Team-Stints: alte Statistiken bleiben nach Trades erhalten
- Game Center für Scores + komplette Statline
- Fouled out / technische Fouls / Flagrant Fouls / Ejection / Verletzung / DNP / Suspension
- Eingabefeld für andere auffällige Spieler und Spielsituationen
- automatische Milestones (50 Punkte, 20 Rebounds, 10 Blocks, Triple-Double, 5x5, Career Highs)
- Karriere-Timeline und langfristige Story-Arcs
- KI-Newsroom über OpenAI Responses API
- 8 unterschiedliche Perspektiven pro Spiel statt eines einzelnen Standardartikels
- eigener Social Feed mit Fans, Kritikern, Hype und Meme-/Culture-Posts
- Daily-Pulse-Generator zwischen Spielen
- Trade-Interesse und generierte Angebote
- Fairness-Logik für einen 99-OVR-Spieler: ohne echte Roster-Daten werden keine erfundenen Spielernamen verwendet, sondern realistische Asset-Pakete beschrieben
- Trade-Annahme oder manueller Teamwechsel
- Injury-Arcs
- Award-Race-Snapshots
- Teamseiten, Spielseiten und Game Log
- JSON-Komplettbackup
- passwortgeschützter Control Room
- Netlify-Konfiguration + GitHub CI

## Architektur

- **Frontend / Backend:** Next.js + TypeScript
- **DB:** Supabase Postgres
- **KI:** OpenAI Responses API
- **Hosting:** Netlify (oder Vercel)
- **Schedule:** NBA CDN → konfigurierter Fixture-Fallback → manueller CSV-Import

Die OpenAI- und Supabase-Service-Keys bleiben ausschließlich serverseitig.

## 1. Lokal starten

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 2. Supabase einrichten

Neues Supabase-Projekt erstellen und im SQL Editor nacheinander ausführen:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_seed_mycareer.sql`

Danach in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://DEINPROJEKT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_PASSWORD=...
SESSION_TOKEN=eine-sehr-lange-zufaellige-zeichenfolge
```

## 3. KI aktivieren

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
```

`gpt-5.6-luna` ist für viele kurze Medienposts kostengünstig. Für maximal anspruchsvolle Storylines kann das Modell in der Environment Variable gewechselt werden.

Ohne API-Key läuft ein lokaler Fallback, aber die echte Variation entsteht mit der KI.

## 4. Vollständigen 2026/27-Spielplan laden

Im Control Room auf **„Alle Teams synchronisieren“** klicken.

Die App versucht:
1. NBA CDN Schedule JSON
2. FixtureDownload JSON Feed
3. falls beide scheitern: `scripts/manual-schedule-template.csv`

CLI-Alternative:

```bash
node --env-file=.env.local scripts/sync-schedule.mjs
```

Hinweis: Für 2026/27 sind initial nur 80 der 82 Regular-Season-Gegner pro Team fest terminiert; zwei Spiele hängen vom NBA Cup ab. Nach Festlegung genügt ein erneuter Sync.

## 5. Normaler Workflow nach einem 2K-Spiel

1. `/admin`
2. Spiel auswählen
3. Score + deine Werte eintragen
4. Fouls / Verletzung / Ejection / DNP etc. ergänzen
5. andere auffällige Spieler oder Spielsituationen als Notables eintragen
6. speichern

Danach passiert automatisch:

- Game wird finalisiert
- Statline wird dauerhaft dem damaligen Team zugeordnet
- Milestones werden erkannt
- Karriere-Timeline wird ergänzt
- Universe Date wird weitergesetzt
- 8 neue Medien-/Social-Beiträge werden generiert

## 6. Trades

Im Control Room **Trade-Markt aktualisieren**.

Die KI erzeugt Team-Interesse und mehrere Angebote. Bei 99 OVR fordert die Prompt-Logik bewusst Franchise-Level-Gegenwert. Da die App nicht einfach aktuelle 2K-Roster erfindet, beschreibt sie ohne zusätzliche Roster-Daten Pakete generisch.

Ein angenommenes Angebot:

- beendet den aktuellen `team_stint`
- legt einen neuen Stint an
- aktualisiert `current_team_id`
- erzeugt ein Karriere-Event
- markiert andere Angebote als zurückgezogen
- lässt **alle alten Stats unverändert**

## 7. Netlify

Repository zu GitHub pushen und in Netlify **Import from Git** wählen.

Environment Variables aus `.env.example` in Netlify setzen. Keine Secrets ins Repository committen.

## Datenbank-Kern

`career_profiles`
→ `team_stints`
→ `games`
→ `player_game_stats`
→ `game_notables`
→ `career_events`
→ `story_arcs`
→ `injuries`
→ `trade_interest`
→ `trade_offers`
→ `media_posts`
→ `award_snapshots`
→ `milestones`

Die zentrale Designentscheidung ist `player_game_stats.team_id`: dadurch bleibt jedes historische Spiel dem Team zugeordnet, bei dem du es tatsächlich gespielt hast.

## Wichtige Seiten

- `/` — Universe Dashboard
- `/schedule` — kompletter NBA-Spielplan
- `/career` — Stats, Stints, Timeline, Game Log
- `/media` — längere Berichte
- `/social` — Social Feed
- `/trades` — Rumors & Angebote
- `/awards` — Award-Race und Records
- `/game/[id]` — einzelne Spielakte
- `/team/[abbr]` — Teamseite
- `/admin` — Control Room
- `/settings` — Architekturstatus

## Nächster GitHub-Schritt

Dieses Paket ist als eigenständiges Repository gedacht. Lege auf GitHub ein leeres Repo z. B. `NBA-Career-Universe` an. Danach kann ChatGPT über die verbundene GitHub-Integration die Dateien direkt dorthin schreiben und kommende Änderungen versioniert weiterentwickeln.
