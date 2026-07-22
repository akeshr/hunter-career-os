import assert from "node:assert/strict";
import test from "node:test";

import { makeStateFixture } from "../helpers/make-state-fixture.mjs";
import { validateStateObject } from "../../../tools/hunter-state/validate.mjs";

const countRecords = (state) => ({
  profiles: Object.keys(state.profiles).length,
  opportunities: Object.keys(state.opportunities).length,
  pursuits: Object.keys(state.pursuits).length,
  relationships: Object.keys(state.relationships).length,
  activities: state.activities.length,
  tasks: state.tasks.length,
});

const matrices = [
  {
    name: "small",
    counts: { profiles: 1, opportunities: 2, pursuits: 1 },
    expected: {
      profiles: 1,
      opportunities: 2,
      pursuits: 1,
      relationships: 0,
      activities: 0,
      tasks: 0,
    },
  },
  {
    name: "medium",
    counts: {
      profiles: 5,
      opportunities: 50,
      pursuits: 25,
      relationships: 50,
    },
    expected: {
      profiles: 5,
      opportunities: 50,
      pursuits: 25,
      relationships: 50,
      activities: 0,
      tasks: 0,
    },
  },
  {
    name: "large",
    counts: {
      profiles: 20,
      opportunities: 500,
      pursuits: 250,
      relationships: 500,
      activities: 2000,
      tasks: 1000,
    },
    expected: {
      profiles: 20,
      opportunities: 500,
      pursuits: 250,
      relationships: 500,
      activities: 2000,
      tasks: 1000,
    },
  },
];

for (const { name, counts, expected } of matrices) {
  test(`${name} fixture has exact deterministic valid counts`, () => {
    const first = makeStateFixture(counts);
    const second = makeStateFixture(counts);

    assert.deepEqual(first, second);
    assert.deepEqual(countRecords(first), expected);
    const validation = validateStateObject(first);
    assert.equal(validation.valid, true);
    assert.deepEqual(validation.errors, []);
  });
}

test("fixtures use generic indexed labels and isolated profile data", () => {
  const state = makeStateFixture({
    profiles: 2,
    opportunities: 2,
    pursuits: 2,
    relationships: 2,
    activities: 2,
    tasks: 2,
  });
  const profiles = Object.values(state.profiles);
  const serialized = JSON.stringify(state);

  assert.equal(state.workspace.id, "workspace-example");
  assert.equal(profiles[0].name, "Example Profile 001");
  assert.equal(
    state.opportunities["opportunity-001"].organization,
    "Example Organization 001",
  );
  assert.equal(
    state.relationships["relationship-001"].name,
    "Example Contact 001",
  );
  assert.doesNotMatch(serialized, /@|linkedin|resume|real|personal/i);
  assert.notEqual(profiles[0], profiles[1]);
  assert.notEqual(profiles[0].data, profiles[1].data);
  assert.notEqual(profiles[0].artifacts, profiles[1].artifacts);
});

test("skewed two-profile fixtures only link tasks to compatible activities", () => {
  const state = makeStateFixture({
    profiles: 2,
    opportunities: 2,
    pursuits: 2,
    relationships: 2,
    activities: 1,
    tasks: 2,
  });

  assert.equal(validateStateObject(state).valid, true);
  assert.equal(state.tasks[0].activity_id, "activity-001");
  assert.equal(Object.hasOwn(state.tasks[1], "activity_id"), false);
  assert.equal(state.tasks[1].profile_id, "profile-002");
});
