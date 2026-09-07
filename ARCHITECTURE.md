# Architekturentscheidungen · v2

## Multi-Tenant-Kern

Supabase Auth liefert die Benutzeridentität. Ein Benutzer kann mehrere `universes` besitzen.

```
auth.users
  -> universes
      -> career_profiles
          -> career-specific data
```

Die aktive Welt wird zusätzlich in einem HttpOnly-Cookie `nba_universe` gespeichert. Jeder mutierende Server-Endpunkt prüft trotzdem nochmals, ob das Universe wirklich dem angemeldeten Benutzer gehört.

## Shared Schedule vs. MyNBA-Ergebnisse

`games` enthält ausschließlich den gemeinsamen NBA-Spielplan: Datum, Matchup, Arena, Broadcast und Schedule-Metadaten.

`universe_games` enthält das Ergebnis innerhalb genau eines MyNBA-Universums.

Dadurch kann dasselbe Schedule-Spiel parallel unterschiedliche Resultate haben, ohne dass Benutzer einander überschreiben.

## Persistente Karriere-Historie

`career_profiles.current_team_id` ist nur der aktuelle Zustand.

Historische Teamzuordnung läuft über:
- `team_stints`
- den Snapshot `player_game_stats.team_id`

Ein Trade verändert deshalb keine alten Statlines.

## Story Memory

Die KI erhält nur Kontext der aktiven Karriere:
- aktuelle Statline
- Universe-Ergebnis
- aktive Story-Arcs
- Verletzungen
- Trade-Interesse
- Game-Notables
- letzte Medienposts
- Karrierehistorie

Dadurch bleiben verschiedene Benutzer und Universen auch in der KI-Berichterstattung voneinander getrennt.

## Keine erfundenen fremden Boxscores

Andere Spieler werden nur mit exakten Zahlen erwähnt, wenn diese ausdrücklich in `game_notables` gepflegt wurden.

## 99 OVR Trade Fairness

Ohne echten 2K-Roster-/Pick-Datensatz erfindet die Trade Engine keine konkreten Spielernamen oder Pick-Jahre. Stattdessen beschreibt sie Asset-Strukturen und Fairness-Scores, die anschließend in MyNBA nachgebaut werden können.

## Schedule Resilience

Schedule Sync ist ein Adapter:
1. offizielle NBA-JSON
2. sekundärer Fixture-Feed
3. manueller CSV-Fallback

Synchronisierung überschreibt keine Universe-Ergebnisse.

## Auth & Security

Die App verwendet mehrere Schutzschichten:

1. Supabase Auth für Benutzer-Sessions.
2. HttpOnly-Cookies für die Session und das aktive Universe.
3. Server-Side Ownership Checks vor allen mutierenden Aktionen.
4. Supabase Row Level Security für benutzerbezogene Tabellen.
5. Lesepolicies für gemeinsame Referenzdaten wie Teams, Saisons und Schedule.
6. Öffentliche Universen sind nur lesbar; Änderungen bleiben ausschließlich dem Besitzer vorbehalten.
7. Der Supabase-Service-Key und der OpenAI-Key bleiben serverseitig und werden niemals an den Browser ausgeliefert.

## Legacy-Migration

Die v1-Single-User-Karriere wird durch Migration 003 in ein unbeanspruchtes Legacy-Universe verschoben. Ein registrierter Benutzer kann dieses einmalig mit dem bisherigen `ADMIN_PASSWORD` übernehmen.

Nach erfolgreicher Übernahme ist der normale Betrieb vollständig accountbasiert.
