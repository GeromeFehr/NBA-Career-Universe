# Shared MyNBA careers

Two different accounts can connect their currently selected universes in `/coop`.
Both careers must use the same season and language when joining. One owner creates
an invitation; the other enters its code and consents to shared profiles, stats,
achievements and media. Codes expire after seven days, can be replaced, and are
consumed on acceptance. Only a SHA-256 digest is stored.

Owners continue to edit their own players. The dedicated server-rendered co-op
page verifies ownership and current membership before selecting the other
player's explicitly shared fields. It does not expose salaries, contracts,
private game notes, account details or invitation digests. Existing universe RLS
policies are unchanged. Disconnecting removes shared access without deleting
career records. The invitation must be sent by the user; the application sends
no messages to the other account.

The comparison uses one selected season for both careers, appearance counts and
per-appearance averages (DNP excluded). The shared media feed covers all seasons
and includes only the viewer's universe language. Career clocks remain separate:
if one player moves to the next season first, the page explains the difference
and continues to compare the same selected season. Games are entered manually
or using the existing screenshot import; this does not connect directly to 2K.

Shared games match by season, date, home team, away team and stage. This supports
separately created manual fixtures without assuming matching database IDs.
Ambiguous duplicates are not paired. The game page can prefill a partner's final
score. A database trigger rejects conflicting results and serializes writes for
the connected pair. Existing conflicts must be reconciled before connecting.

Once both game entries exist, either owner can propose a shared score correction.
Only the partner can approve it. Approval validates the original scores and
player points, updates both results in one transaction and records an event in
both career journals. Individual stat lines and already published articles retain
their original content. Before both entries exist, correct the first owner's
original entry or save the second entry with the established score.

No additional OpenAI request is introduced. Existing reports are shared directly.
When the partner has also recorded the same game, their compact stat line is
available as context to the existing media generation request.

Validation: `npm test`, `npm run check`, `npm run build`. Run
`supabase/tests/coop.sql` inside an explicit `BEGIN` / `ROLLBACK` transaction.
The database tests create three temporary accounts, exercise membership,
invitation expiry, ownership, score conflicts and corrections, then roll back.
