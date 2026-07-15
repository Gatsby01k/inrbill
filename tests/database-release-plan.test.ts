import test from "node:test";
import assert from "node:assert/strict";
import {
  BASELINE_MIGRATION,
  BASELINE_TABLES,
  NETWORK_MIGRATION,
  NETWORK_TABLES,
  databaseReleasePlan,
} from "../scripts/database-release-plan.mjs";

test("fresh databases deploy both migrations", () => {
  assert.equal(databaseReleasePlan([], []).action, "fresh-deploy");
});

test("an existing legacy database resolves the baseline before deploy", () => {
  assert.equal(databaseReleasePlan(BASELINE_TABLES, []).action, "resolve-baseline-then-deploy");
});

test("partial schemas always block automated migration", () => {
  assert.equal(databaseReleasePlan(BASELINE_TABLES.slice(0, 2), []).action, "blocked-partial-baseline");
  assert.equal(databaseReleasePlan([...BASELINE_TABLES, NETWORK_TABLES[0]], [BASELINE_MIGRATION]).action, "blocked-partial-network");
});

test("a fully tracked network schema is already up to date", () => {
  assert.equal(
    databaseReleasePlan([...BASELINE_TABLES, ...NETWORK_TABLES], [BASELINE_MIGRATION, NETWORK_MIGRATION]).action,
    "up-to-date",
  );
});
