import assert from "node:assert/strict";
import test from "node:test";
import {careerStage, draftStatus, draftLabel, stageLabel, parseDraftInput, coverageFitsBackground} from "../lib/career-background";

const rookie = {id: "rookie", start_date: "2026-10-20", label: "2026-27"};
const second = {id: "second", start_date: "2027-10-19", label: "2027-28"};

test("rookie status follows season identity, including historical coverage after a transition", () => {
  assert.equal(careerStage(rookie, rookie).is_rookie, true);
  assert.deepEqual(careerStage(rookie, second), {is_rookie: false, career_season: 2, stage: "second_year"});
  // Reopening the old game still resolves its own season, not the active season.
  assert.equal(careerStage(rookie, rookie).career_season, 1);
  assert.equal(careerStage(rookie, {...second, start_date: "2030-10-01"}).career_season, 5);
  assert.equal(careerStage(rookie, {...second, start_date: "2025-10-01"}).stage, "before_debut");
  assert.equal(careerStage(null, second).is_rookie, null);
  assert.equal(careerStage(rookie, null).is_rookie, null);
});

test("undrafted origin is explicit and persists beyond rookie season; missing data stays unknown", () => {
  const background = parseDraftInput({draftStatus: "undrafted", draftYear: 2024, draftPick: 2, draftRound: 1});
  assert.deepEqual(background, {draft_status: "undrafted", draft_year: 2024, draft_pick: null, draft_round: null});
  assert.equal(draftStatus(background), "undrafted");
  assert.equal(draftStatus({draft_pick: null}), "unknown");
  assert.equal(draftStatus({draft_pick: 2}), "drafted");
  assert.equal(draftLabel(background, "de"), "Nicht gedraftet 2024");
  assert.equal(draftLabel(background, "en"), "Undrafted 2024");
  // A delayed debut does not turn a first-year player into a veteran.
  assert.equal(careerStage(rookie, rookie).is_rookie, true);
  assert.equal(stageLabel(careerStage(rookie, second), "de"), "2. NBA-Saison");
});

test("draft forms keep second-round picks and validate numbers and unknown status", () => {
  const drafted = parseDraftInput({draftStatus: "drafted", draftYear: "2026", draftRound: "2", draftPick: "42"});
  assert.equal(drafted.draft_round, 2);
  assert.equal(draftLabel(drafted, "en"), "Draft 2026 · Pick 42 · Round 2");
  assert.equal(parseDraftInput({draftStatus: "unknown", draftPick: 2}).draft_pick, null);
  assert.throws(() => parseDraftInput({draftStatus: "drafted", draftPick: ""}));
  for (const draftPick of [0, -1, 101, 2.5, Infinity]) assert.throws(() => parseDraftInput({draftStatus: "drafted", draftPick}));
  assert.throws(() => parseDraftInput({draftStatus: "drafted", draftPick: 2, draftRound: 3}));
  assert.throws(() => parseDraftInput({draftStatus: "invented"}));
});

test("new AI coverage cannot reintroduce rookie status from old headlines", () => {
  const items = [{headline: "Der Rookie dominiert erneut", body: "53 Punkte."}];
  assert.equal(coverageFitsBackground(items, {is_rookie: true}), true);
  assert.equal(coverageFitsBackground(items, {is_rookie: false}), false);
  assert.equal(coverageFitsBackground(items, {is_rookie: null}), false);
  assert.equal(coverageFitsBackground([{headline: "An undrafted success", body: "His second NBA season."}], {is_rookie: false}), true);
});
