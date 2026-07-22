import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseStateYaml } from "../../../tools/hunter-state/io.mjs";
import { validateStateTransition } from "../../../tools/hunter-state/transition.mjs";

const fixture = async (name) => {
  const parsed = parseStateYaml(
    await readFile(
      new URL(`../fixtures/state/transition/${name}.yaml`, import.meta.url),
      "utf8",
    ),
    name,
  );
  assert.equal(parsed.ok, true);
  return parsed.state;
};

const clone = (value) => structuredClone(value);
const codes = (result) => result.errors.map((error) => error.code);

test("a new state starts at root revision 1 with revision 1 records", async () => {
  const after = await fixture("valid-after");
  after.revision = 1;
  after.profiles["profile-alpha"].record_revision = 1;
  after.profiles["profile-alpha"].artifacts.forEach(
    (artifact) => (artifact.record_revision = 1),
  );
  after.opportunities["opportunity-alpha"].record_revision = 1;
  after.pursuits["pursuit-alpha"].record_revision = 1;
  after.relationships["relationship-alpha"].record_revision = 1;
  after.activities.forEach((activity) => (activity.record_revision = 1));
  after.tasks.forEach((task) => (task.record_revision = 1));

  assert.deepEqual(validateStateTransition(null, after), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("a new state rejects a root revision other than 1", async () => {
  const after = await fixture("valid-after");
  const result = validateStateTransition(null, after);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("root_revision"));
});

test("a new state requires every record and artifact to start at revision 1", async () => {
  const after = await fixture("valid-after");
  after.revision = 1;
  after.profiles["profile-alpha"].record_revision = 1;
  after.profiles["profile-alpha"].artifacts.forEach(
    (artifact) => (artifact.record_revision = 1),
  );
  after.opportunities["opportunity-alpha"].record_revision = 1;
  after.pursuits["pursuit-alpha"].record_revision = 1;
  after.relationships["relationship-alpha"].record_revision = 1;
  after.activities.forEach((activity) => (activity.record_revision = 1));
  after.tasks.forEach((task) => (task.record_revision = 1));
  after.tasks[0].record_revision = 2;

  const result = validateStateTransition(null, after);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === "record_revision" &&
        error.path === "/tasks/task-beta/record_revision",
    ),
  );
});

test("a valid saved mutation increments the root once and returns the after state report", async () => {
  const [before, after] = await Promise.all([fixture("before"), fixture("valid-after")]);
  assert.deepEqual(validateStateTransition(before, after), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("a saved mutation increments the root revision exactly once", async () => {
  const [before, after] = await Promise.all([fixture("before"), fixture("valid-after")]);
  after.revision = before.revision + 2;
  const result = validateStateTransition(before, after);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("root_revision"));
});

test("rounded root revision overflow cannot satisfy an exact increment", async () => {
  const before = await fixture("before");
  before.revision = Number.MAX_SAFE_INTEGER + 1;
  const after = clone(before);
  after.revision = before.revision + 1;
  assert.equal(after.revision, before.revision);

  const result = validateStateTransition(before, after);

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      ({ code, path }) => code === "unsafe_integer" && path === "/revision",
    ),
  );
});

test("new records begin at record revision 1", async () => {
  const [before, after] = await Promise.all([fixture("before"), fixture("valid-after")]);
  after.tasks.find((task) => task.id === "task-gamma").record_revision = 2;
  const result = validateStateTransition(before, after);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) => error.code === "record_revision" && error.path === "/tasks/task-gamma/record_revision",
    ),
  );
});

test("changed records increment their revision exactly once", async () => {
  const [before, after] = await Promise.all([fixture("before"), fixture("valid-after")]);
  after.tasks.find((task) => task.id === "task-alpha").record_revision = 7;
  const result = validateStateTransition(before, after);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) => error.code === "record_revision" && error.path === "/tasks/task-alpha/record_revision",
    ),
  );
});

test("rounded record revision overflow cannot satisfy a changed-record increment", async () => {
  const before = await fixture("before");
  const beforeTask = before.tasks.find(({ id }) => id === "task-alpha");
  beforeTask.record_revision = Number.MAX_SAFE_INTEGER + 1;
  const after = clone(before);
  after.revision += 1;
  const afterTask = after.tasks.find(({ id }) => id === "task-alpha");
  afterTask.title = "Changed after unsafe revision";
  afterTask.record_revision = beforeTask.record_revision + 1;
  assert.equal(afterTask.record_revision, beforeTask.record_revision);

  const result = validateStateTransition(before, after);

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      ({ code, path }) =>
        code === "unsafe_integer" && path === "/tasks/0/record_revision",
    ),
  );
});

test("unchanged records retain their revision when ID arrays are reordered", async () => {
  const [before, after] = await Promise.all([fixture("before"), fixture("valid-after")]);
  after.relationships["relationship-alpha"].record_revision = 3;
  const result = validateStateTransition(before, after);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === "record_revision" &&
        error.path === "/relationships/relationship-alpha/record_revision",
    ),
  );
});

test("stable IDs cannot change for an existing mapped record", async () => {
  const [before, after] = await Promise.all([fixture("before"), fixture("valid-after")]);
  after.profiles["profile-alpha"].id = "profile-renamed";
  const result = validateStateTransition(before, after);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) => error.code === "stable_id" && error.path === "/profiles/profile-alpha/id",
    ),
  );
});

test("after-state dangling-reference errors are retained with transition diagnostics", async () => {
  const [before, after] = await Promise.all([fixture("before"), fixture("invalid-after")]);
  const result = validateStateTransition(before, after);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("dangling_reference"));
  assert.ok(codes(result).includes("root_revision"));
});

test("artifact comparisons preserve colliding slash-containing profile and artifact IDs", async () => {
  const before = await fixture("before");
  before.profiles["profile-a/b"] = {
    id: "profile-a/b",
    record_revision: 1,
    name: "Slash Profile",
    data: {},
    artifacts: [
      {
        id: "c",
        record_revision: 4,
        profile_id: "profile-a/b",
        type: "resume",
        filename: "slash-profile.md",
        created_at: "2026-07-21T10:00:00Z",
        availability: "available",
      },
    ],
  };
  before.profiles["profile-a"] = {
    id: "profile-a",
    record_revision: 1,
    name: "Plain Profile",
    data: {},
    artifacts: [
      {
        id: "b/c",
        record_revision: 6,
        profile_id: "profile-a",
        type: "resume",
        filename: "plain-profile.md",
        created_at: "2026-07-21T10:00:00Z",
        availability: "available",
      },
    ],
  };

  const after = clone(before);
  after.revision += 1;
  after.profiles["profile-a/b"].artifacts[0].record_revision = 5;

  const result = validateStateTransition(before, after);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === "record_revision" &&
        error.path === "/profiles/profile-a~1b/artifacts/c/record_revision",
    ),
  );
});

test("the transition validator does not mutate either input", async () => {
  const [before, after] = await Promise.all([fixture("before"), fixture("valid-after")]);
  const beforeSnapshot = clone(before);
  const afterSnapshot = clone(after);
  validateStateTransition(before, after);
  assert.deepEqual(before, beforeSnapshot);
  assert.deepEqual(after, afterSnapshot);
});
