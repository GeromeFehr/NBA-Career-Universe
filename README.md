# NBA Career Universe v2

Eine Multi-User-Begleit-Webapp für eigene MyNBA-Karrieren. Jeder Account kann mehrere vollständig getrennte Universen verwalten.

## Was v2 neu macht

- Supabase Auth mit E-Mail + Passwort
- mehrere Benutzer gleichzeitig
- mehrere Karrieren pro Account
- eigener Universe-Hub unter `/universes`
- gemeinsamer NBA-Spielplan, aber getrennte MyNBA-Ergebnisse
- eigene Stats, Trades, Verletzungen, Storylines, Medien und Awards pro Universe
- Public/Private-Schalter pro Universe
- öffentliche Read-only-Karriereseite unter `/share/<slug>`
- Row Level Security für Multi-Tenant-Daten
- bestehende v1-Karriere wird als Legacy-Universe übernommen
- bestehende G.-Fehr-Daten und das erste Spiel bleiben erhalten

## Architektur

- Next.js 15 + TypeScript
- React 19
- Supabase Postgres + Supabase Auth
- `@supabase/ssr` für Cookie-basierte Sessions
- OpenAI Responses API
- Netlify
- gemeinsamer Schedule in `games`
- Universe-spezifische Ergebnisse in `universe_games`

## Supabase-Migrationen

Bei einem bestehenden v1-Projekt nacheinander bzw. zusätzlich ausführen:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_seed_mycareer.sql`
3. **`supabase/migrations/003_multi_user_universes.sql`**

Wenn 001 und 002 schon gelaufen sind, nur 003 ausführen.

Die v2-Migration:
- erstellt `universes`
- erstellt `universe_games`
- ordnet jede alte Karriere einem Legacy-Universe zu
- kopiert bereits vorhandene MyNBA-Spielstände in `universe_games`
- ergänzt RLS-Policies
- trennt öffentliche Schedule-Daten von privaten Karriere-Daten

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna

ADMIN_PASSWORD=...
```

`ADMIN_PASSWORD` wird in v2 nur noch einmal gebraucht, um die alte Single-User-Karriere sicher dem ersten Account zuzuordnen.

`SESSION_TOKEN` wird für den normalen v2-Betrieb nicht mehr benötigt.

### Supabase Publishable Key

Im Supabase-Projekt unter **Connect / API Keys** den Publishable Key nehmen und in Netlify als

```
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

eintragen.

Der Server-Secret-Key bleibt weiterhin ausschließlich in

```
SUPABASE_SERVICE_ROLE_KEY
```

und darf niemals ins Repository.

## Erster Start nach dem Upgrade

1. Migration 003 im Supabase SQL Editor ausführen.
2. Publishable Key in Netlify ergänzen.
3. Neu deployen.
4. `/register` öffnen und einen Account erstellen.
5. Falls Supabase E-Mail-Bestätigung aktiviert hat: Bestätigungs-Mail öffnen.
6. Einloggen.
7. `/universes` öffnen.
8. Die vorhandene Legacy-Karriere mit dem bisherigen `ADMIN_PASSWORD` übernehmen.
9. Danach kann derselbe Account weitere Universen erstellen.

## Multi-User-Datenmodell

```
auth.users
  -> universes
      -> career_profiles
          -> team_stints
          -> player_game_stats
          -> game_notables
          -> injuries
          -> career_events
          -> story_arcs
          -> trade_interest
          -> trade_offers
          -> media_posts
          -> award_snapshots
          -> milestones
          -> relationships

games
  -> gemeinsamer NBA-Spielplan

universes + games
  -> universe_games
     MyNBA-Ergebnis innerhalb genau einer Karriere-Welt
```

Dadurch kann dasselbe reale Schedule-Spiel in beliebig vielen MyNBA-Universen komplett andere Ergebnisse haben.

Beispiel:

```
Universe A: GSW 128 - 92 LAL
Universe B: GSW 101 - 107 LAL
Universe C: GSW 115 - 112 LAL
```

Alle drei greifen auf dasselbe Schedule-Spiel zu, überschreiben sich aber nicht.

## Seiten

- `/login`
- `/register`
- `/universes` – Karriere-Hub
- `/` – aktives Universe
- `/schedule`
- `/career`
- `/media`
- `/social`
- `/trades`
- `/awards`
- `/admin`
- `/game/[id]`
- `/team/[abbr]`
- `/share/[slug]` – öffentliche Read-only-Seite

## Sicherheit

Die App verwendet zwei Ebenen:

1. Serverseitige Ownership-Prüfung für alle mutierenden API-Routen.
2. Supabase Row Level Security für benutzerbezogene Tabellen.

Der Service-Key bleibt ausschließlich serverseitig. Browser und Benutzer erhalten ihn nie.

## Deployment

Netlify bleibt mit dem GitHub-Repo verbunden. Jeder Push auf `main` erzeugt automatisch einen neuen Deploy.

Build:

```bash
npm install
npm run check
npm run build
```
