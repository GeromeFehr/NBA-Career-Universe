import assert from "node:assert/strict";
import test from "node:test";
import {parseGameInput, statKeys, validDate} from "../lib/game-input";
import {summarizeCareerMarks, summarizeStats} from "../lib/stats";
import {addYears, contractState, offerConflict, type CareerContract} from "../lib/agency-display";
import {milestoneRows} from "../lib/milestone-logic";

const gameId = "00000000-0000-0000-0000-000000000001";
const stats = {...Object.fromEntries(statKeys.map(key => [key, 0])), minutes: 38, points: 53, fgm: 20, fga: 30, tpm: 5, tpa: 10, ftm: 8, fta: 9, rebounds: 12, assists: 10};
const input = {gameId, homeScore: 120, awayScore: 100, stats};

test("53 points counts as one 50+ game, separate from career high; DNP excluded", () => {
  const rows = [{...stats, appearance_status: "played"}, {...stats, appearance_status: "dnp_injury", points: 90}];
  const marks = summarizeCareerMarks(rows);
  assert.equal(marks.careerHighPoints, 53);
  assert.equal(marks.games50Plus, 1);
  assert.equal(marks.games60Plus, 0);
  assert.equal(marks.tripleDoubles, 1);
  assert.equal(summarizeStats(rows).ppg, 53);
});

test("game input accepts a high stat line and rejects contradictory shooting", () => {
  assert.equal(parseGameInput(input).stat.points, 53);
  assert.throws(() => parseGameInput({...input, stats: {...stats, points: 54}}), /POINTS_MISMATCH/);
  assert.throws(() => parseGameInput({...input, stats: {...stats, fga: 19}}), /INVALID_SHOOTING/);
  assert.throws(() => parseGameInput({...input, homeScore: 100}), /INVALID_SCORE/);
  assert.throws(() => parseGameInput({...input, stats: {...stats, rebounds: -1}}), /INVALID_VALUES/);
});

test("non-appearance states zero performance while keeping injury/ejection context", () => {
  for (const appearanceStatus of ["dnp_injury", "dnp_coach", "suspended", "inactive"]) {
    const parsed = parseGameInput({...input, appearanceStatus, ejected: true, started: true});
    for (const key of statKeys) assert.equal(parsed.stat[key], 0);
    assert.equal(parsed.stat.started, false);
    assert.equal(parsed.stat.ejected, true);
    assert.equal(parsed.stat.injured, appearanceStatus === "dnp_injury");
  }
});

test("invalid dates and oversized text are rejected before writes", () => {
  assert.throws(() => validDate("2026-02-30"), /INVALID_DATE/);
  assert.throws(() => parseGameInput({...input, storyNotes: "a".repeat(12001)}), /TEXT_TOO_LONG/);
  assert.equal(parseGameInput({...input, storyNotes: "a".repeat(12000)}).stat.story_notes?.length, 12000);
});

const contract: CareerContract = {
  id: "a", kind: "sponsorship", category: "footwear", brand: "Nike", status: "active",
  annual_value: 100000, signing_bonus: 10000, agent_fee_pct: 15, start_date: "2026-01-01",
  end_date: "2028-01-01", expires_on: "2026-01-15", signed_at: "2026-01-01T00:00:00Z", terms: {},
};

test("contract display derives active, upcoming and expired states from career time", () => {
  assert.equal(contractState(contract, "2025-12-31"), "upcoming");
  assert.equal(contractState(contract, "2026-06-01"), "active");
  assert.equal(contractState(contract, "2028-01-01"), "expired");
  assert.equal(contractState({...contract, signed_at: null, status: "offered"}, "2026-02-01"), "expired");
  assert.equal(contractState({...contract, signed_at: null, status: "declined"}, "2026-02-01"), "declined");
});

test("sponsorship conflicts use signature date; leap-year duration matches Postgres", () => {
  assert.equal(addYears("2024-02-29", 2), "2026-02-28");
  const offer = {...contract, id: "b", signed_at: null, status: "offered"};
  assert.equal(offerConflict(offer, [contract], "2027-12-31")?.id, "a");
  assert.equal(offerConflict(offer, [contract], "2028-01-01"), undefined);
  assert.equal(offerConflict({...offer, category: "audio"}, [contract], "2027-12-31"), undefined);
});

test("milestone rebuild sorts historical games and excludes non-appearances", () => {
  const rows = [
    {...stats, appearance_status: "played", points: 53, game_id: "later", games: {game_date: "2026-02-01"}},
    {...stats, appearance_status: "played", points: 30, game_id: "first", games: {game_date: "2026-01-01"}},
    {...stats, appearance_status: "inactive", points: 100, game_id: "dnp", games: {game_date: "2026-03-01"}},
  ];
  const result = milestoneRows(rows, "de");
  assert.deepEqual(result.filter(x => x.code === "CAREER_HIGH_PTS").map(x => x.game_id), ["first", "later"]);
  assert.equal(result.filter(x => x.code === "PTS_50").length, 1);
  assert.equal(result.some(x => x.game_id === "dnp"), false);
});


test("career game log resolves home and away opponents using the historical team", async () => {
  const {gameOpponent} = await import("../lib/game-opponent");
  const game = {home_team_id: "gsw", away_team_id: "lal", home: {id: "gsw", abbreviation: "GSW"}, away: {id: "lal", abbreviation: "LAL"}};
  assert.deepEqual(gameOpponent("gsw", game), {team: game.away, home: true});
  assert.deepEqual(gameOpponent("lal", game), {team: game.home, home: false});
  // A later move to another team must not change the opponent stored in an older game.
  const historicalStat = {team_id: "gsw"};
  assert.equal(gameOpponent(historicalStat.team_id, game)?.team?.abbreviation, "LAL");
  assert.equal(gameOpponent("bos", game), null);
  assert.equal(gameOpponent(null, game), null);
  assert.equal(gameOpponent("gsw", null), null);
});
