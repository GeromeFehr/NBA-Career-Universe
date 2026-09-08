# Career Universe — product and architecture

## Direction

Career Universe is the player's season journal: editorial paper, black broadcast scoreboards, a condensed sports masthead, quiet team colours and an unmistakable player number. No gradient surfaces or ornamental dashboard cards. A small vocabulary carries the product: player identity, scoreboard, ruled section, article, timeline and form.

Home answers three questions immediately: where is my career, what is the next game, and which decisions are waiting? Schedule and game entry stay close together. News reads like a sports desk; Social reads like a conversation. Career contains the complete historical record. World contains the consequences. The agency manages simulated contracts and earnings.

## Preservation and correctness

- Preserve every existing route, career, result, stat snapshot, narrative and answer.
- Keep the shared schedule separate from universe-owned games and results.
- Historical stats always use their stored team, including corrections after a trade.
- Store core multi-table changes in database transactions. Generate optional narrative after the save; report partial failures truthfully.
- Rebuild deterministic derivatives without erasing interviews, choices or news.
- Distinguish award race rank from a confirmed award win.
- Paginate complete history and exports; the PostgREST row cap must not truncate careers.

## Language and content

German is the default. Universe language controls navigation, forms, dates, status labels, generated content and public shares. Preserve original text when changing language; display only the matching language. Machine keys remain stable. Basketball terminology and proper names remain untranslated.

All MyNBA articles, reporter voices, sponsorship offers and financial balances belong to the simulation. Real media and brand names are references, never claims of actual reporting, employment or endorsement.

## Reliability and performance

Request-scoped identity/context caching, a server-only typed database client, grouped queries and batch derivatives replace repeated calls. AI requests use compact canon, bounded outputs, explicit economy/high-detail scans, persisted deduplication and request limits. Secrets stay server-side. New tables have RLS and explicit grants.

## Verification

- `npm test`: seven focused regression tests for game validation, DNP, career-high counts, language-safe milestone generation and contract date/overlap rules.
- `npm run check` and `npm run build`: strict TypeScript and production compilation.
- `npm audit --audit-level=high`: dependency audit.
- `supabase/tests/career-workflows.sql`: eleven workflow checks in one rolled-back transaction. Covers ownership, isolated manual games, stale saves, trades, bilingual notes, salary drafts, signature retries, category exclusivity, pro rata payments, expiration and date rewind.
- Browser and visual QA explicitly skipped at the user's request. Responsive rules were reviewed against component markup; this is not a visual verification.

## Contract lifecycle

Jonas Keller is the fictional agent. Offers use real brand names and deterministic local calculations, with no paid model request. Sponsorship terms start at signature; salary terms are copied from the MyNBA save. Fees are 15% for sponsorships and 4% for salary. Completed calendar months pay automatically when the career date changes; partial months are prorated. The journal preserves every posted payment and filters totals by the selected career date. Repeating a signature or settlement cannot duplicate payments. Original contract identity and historical team remain recorded after a trade.

All new RPCs are security invoker and callable only by the server service role, with explicit owner validation. Financial tables are owner-readable via RLS. The Supabase advisor still reports the pre-existing disabled leaked-password check in Auth; internal server-only action/log tables intentionally have no client policies.


## Navigation consolidation

The primary navigation has five areas: Today, Games, Career, Media and Career World. Reports, Social and Press share one Media entry and local section links. Career contains the game log, career highs, chronology, trophies, award races and season archive. Award standings and trophies keep their original records and editing flows; old `/awards` and `/trophy-room` links redirect to their Career sections. Pregame is reached from the schedule. Agent contracts, trades, playoffs and management remain available in the menu.

Career game logs resolve the opponent from the appearance's historical `team_id` and the game's home/away teams, with logo and venue. The current career team is never used to reinterpret a past game.
