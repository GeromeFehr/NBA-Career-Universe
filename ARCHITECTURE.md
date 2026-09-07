# Architekturentscheidungen

## Persistente Historie
`current_team_id` ist nur der aktuelle Zustand. Historische Zuordnung läuft über `team_stints` und den Snapshot `player_game_stats.team_id`.

## Story Memory
Die KI sieht nicht nur das aktuelle Spiel. Sie erhält aktive Story-Arcs, Verletzungen, Trade-Interesse, Game-Notables und die letzten Medienposts, damit Sprache und Winkel nicht ständig identisch werden.

## Keine erfundenen fremden Boxscores
Andere Spieler werden nur mit exakten Zahlen erwähnt, wenn sie in `game_notables` gepflegt wurden.

## 99 OVR Trade Fairness
Ohne echten 2K-Roster-/Pick-Datensatz werden keine namentlichen Gegenwerte erfunden. Die KI erzeugt Asset-Strukturen und Fairness-Scores, die anschließend im Spiel nachgebaut werden können.

## Schedule Resilience
Schedule Sync ist ein Adapter:
1. offizielle NBA-JSON
2. sekundärer JSON-Feed
3. manueller CSV-Fallback

Die DB ist deshalb unabhängig von einer einzelnen Datenquelle.

## Security
RLS ist auf allen Tabellen aktiv und es existieren bewusst keine öffentlichen Policies. Der Browser bekommt den Supabase-Service-Key nie zu sehen. Mutation APIs verlangen zusätzlich die private Session-Cookie.
