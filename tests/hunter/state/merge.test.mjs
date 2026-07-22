import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseStateYaml, serializeState } from "../../../tools/hunter-state/io.mjs";
import { mergeStateCopies } from "../../../tools/hunter-state/merge.mjs";
import { validateStateObject } from "../../../tools/hunter-state/validate.mjs";

const fixture = async (name) => {
  const parsed = parseStateYaml(
    await readFile(
      new URL(`../fixtures/state/merge/${name}.yaml`, import.meta.url),
      "utf8",
    ),
    name,
  );
  assert.equal(parsed.ok, true);
  return parsed.state;
};

const clone = (value) => structuredClone(value);

const snapshots = (base, left, right) => ({
  base: { present: true, value: base },
  left: left === undefined
    ? { present: false }
    : { present: true, value: left },
  right: right === undefined
    ? { present: false }
    : { present: true, value: right },
});

test("identical branches deduplicate without manufacturing a revision", async () => {
  const [base, left] = await Promise.all([fixture("base"), fixture("left")]);
  const result = mergeStateCopies({ base, left, right: clone(left) });

  assert.deepEqual(result, { kind: "merged", state: left });
  assert.notEqual(result.state, left);
});

test("one unchanged branch selects the changed branch unchanged", async () => {
  const [base, right] = await Promise.all([fixture("base"), fixture("right")]);
  const result = mergeStateCopies({ base, left: clone(base), right });

  assert.deepEqual(result, { kind: "merged", state: right });
  assert.equal(result.state.revision, 6);
});

test("disjoint object edits merge and compose record revisions", async () => {
  const [base, left, right] = await Promise.all([
    fixture("base"),
    fixture("left"),
    fixture("right"),
  ]);
  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "merged");
  assert.equal(result.state.profiles["profile-alpha"].name, "Alpha Profile, left edit");
  assert.equal(result.state.profiles["profile-alpha"].data.summary, "Right summary");
  assert.equal(result.state.profiles["profile-alpha"].record_revision, 4);
  assert.equal(result.state.revision, 7);
});

test("root maps merge by stable identity and keep profiles isolated", async () => {
  const base = await fixture("base");
  const left = clone(base);
  const right = clone(base);
  left.revision = 6;
  left.profiles["profile-alpha"].name = "Alpha changed";
  left.profiles["profile-alpha"].record_revision = 3;
  right.revision = 6;
  right.profiles["profile-beta"].name = "Beta changed";
  right.profiles["profile-beta"].record_revision = 2;

  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "merged");
  assert.equal(result.state.profiles["profile-alpha"].name, "Alpha changed");
  assert.equal(result.state.profiles["profile-alpha"].record_revision, 3);
  assert.equal(result.state.profiles["profile-beta"].name, "Beta changed");
  assert.equal(result.state.profiles["profile-beta"].record_revision, 2);
});

test("ID arrays merge by ID and sort by JavaScript code-unit order", async () => {
  const [base, left, right] = await Promise.all([
    fixture("base"),
    fixture("left"),
    fixture("right"),
  ]);
  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "merged");
  assert.deepEqual(
    result.state.activities.map(({ id }) => id),
    ["activity-left", "activity-middle"],
  );
  assert.deepEqual(
    result.state.tasks.map(({ id }) => id),
    ["task-aardvark", "task-middle"],
  );
});

test("unknown fields from both branches survive", async () => {
  const [base, left, right] = await Promise.all([
    fixture("base"),
    fixture("left"),
    fixture("right"),
  ]);
  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "merged");
  assert.deepEqual(result.state.extensions, {
    future_flag: true,
    left_note: "preserved",
    right_note: "preserved",
  });
});

test("delete versus unchanged applies the deletion", async () => {
  const base = await fixture("base");
  const left = clone(base);
  const right = clone(base);
  left.revision = 6;
  left.profiles["profile-alpha"].record_revision = 3;
  delete left.profiles["profile-alpha"].data.location;

  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "merged");
  assert.equal("location" in result.state.profiles["profile-alpha"].data, false);
  assert.equal(result.state.revision, 6);
});

test("delete versus edit reports an escaped logical ID path and keeps base in partial", async () => {
  const base = await fixture("base");
  const special = {
    id: "task-a/b~c",
    record_revision: 1,
    title: "Special task",
    status: "todo",
    profile_id: "profile-alpha",
  };
  base.tasks.push(special);
  const left = clone(base);
  const right = clone(base);
  left.revision = 6;
  left.tasks = left.tasks.filter(({ id }) => id !== special.id);
  right.revision = 6;
  right.tasks.find(({ id }) => id === special.id).title = "Edited special task";
  right.tasks.find(({ id }) => id === special.id).record_revision = 2;

  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "conflict");
  assert.deepEqual(result.conflicts, [
    {
      path: "/tasks/task-a~1b~0c",
      kind: "delete_edit",
      ...snapshots(special, undefined, right.tasks.find(({ id }) => id === special.id)),
    },
  ]);
  assert.deepEqual(
    result.partial.tasks.find(({ id }) => id === special.id),
    special,
  );
});

test("both-sides non-ID-array edits report a concurrent conflict", async () => {
  const base = await fixture("base");
  const left = clone(base);
  const right = clone(base);
  left.revision = 6;
  left.opportunities["opportunity-alpha"].profile_ids.push("profile-beta");
  left.opportunities["opportunity-alpha"].record_revision = 2;
  right.revision = 6;
  right.opportunities["opportunity-alpha"].profile_ids = ["profile-beta"];
  right.opportunities["opportunity-alpha"].record_revision = 2;

  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "conflict");
  assert.deepEqual(result.conflicts, [
    {
      path: "/opportunities/opportunity-alpha/profile_ids",
      kind: "concurrent_edit",
      ...snapshots(
        ["profile-alpha"],
        ["profile-alpha", "profile-beta"],
        ["profile-beta"],
      ),
    },
  ]);
  assert.deepEqual(
    result.partial.opportunities["opportunity-alpha"].profile_ids,
    ["profile-alpha"],
  );
});

test("conflicts are sorted by path then kind", async () => {
  const base = await fixture("base");
  const left = clone(base);
  const right = clone(base);
  left.revision = 6;
  right.revision = 6;
  left.workspace.preferences.locale = "fr";
  right.workspace.preferences.locale = "de";
  left.profiles["profile-alpha"].data.summary = "Left summary";
  right.profiles["profile-alpha"].data.summary = "Right summary";
  left.profiles["profile-alpha"].record_revision = 3;
  right.profiles["profile-alpha"].record_revision = 3;

  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "conflict");
  assert.deepEqual(result.conflicts.map(({ path }) => path), [
    "/profiles/profile-alpha/data/summary",
    "/workspace/preferences/locale",
  ]);
});

test("profile deletion versus a new task reference becomes a safe owner conflict", async () => {
  const base = await fixture("base");
  const left = clone(base);
  const right = clone(base);
  const newTask = {
    id: "task-new/a~b",
    record_revision: 1,
    title: "Use the deleted profile",
    status: "todo",
    profile_id: "profile-beta",
  };
  left.revision = 6;
  delete left.profiles["profile-beta"];
  right.revision = 6;
  right.tasks.push(newTask);
  right.extensions.unrelated_right_note = "preserved";
  const inputSnapshots = [clone(base), clone(left), clone(right)];

  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "conflict");
  assert.deepEqual(result.conflicts, [
    {
      path: "/tasks/task-new~1a~0b",
      kind: "concurrent_edit",
      base: { present: false },
      left: { present: false },
      right: { present: true, value: newTask },
    },
  ]);
  assert.equal(validateStateObject(result.partial).valid, true);
  assert.equal(Object.hasOwn(result.partial.profiles, "profile-beta"), false);
  assert.equal(
    result.partial.tasks.some(({ id }) => id === newTask.id),
    false,
  );
  assert.equal(result.partial.extensions.unrelated_right_note, "preserved");
  assert.deepEqual([base, left, right], inputSnapshots);
});

test("post-validation coalesces with an existing owner-level conflict", async () => {
  const base = await fixture("base");
  const betaTask = {
    id: "task-beta-owner",
    record_revision: 1,
    title: "Beta owner task",
    status: "todo",
    profile_id: "profile-beta",
  };
  base.tasks.push(betaTask);
  const left = clone(base);
  const right = clone(base);
  left.revision = 6;
  delete left.profiles["profile-beta"];
  left.tasks = left.tasks.filter(({ id }) => id !== betaTask.id);
  right.revision = 6;
  const editedTask = right.tasks.find(({ id }) => id === betaTask.id);
  editedTask.title = "Edited Beta owner task";
  editedTask.record_revision = 2;

  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "conflict");
  assert.deepEqual(result.conflicts, [
    {
      path: "/tasks/task-beta-owner",
      kind: "delete_edit",
      ...snapshots(betaTask, undefined, editedTask),
    },
  ]);
  assert.equal(validateStateObject(result.partial).valid, true);
});

test("missing base semantically equal branches deduplicate despite ID-array order", async () => {
  const left = await fixture("left");
  const right = clone(left);
  right.activities.reverse();

  const result = mergeStateCopies({ base: null, left, right });

  assert.deepEqual(result, { kind: "merged", state: left });
  assert.equal(result.state.revision, 6);
});

test("missing base never infers ancestry from revisions", async () => {
  const [left, right] = await Promise.all([fixture("left"), fixture("right")]);
  left.revision = 42;
  right.revision = 42;

  const result = mergeStateCopies({ left, right });

  assert.equal(result.kind, "base_required");
  assert.ok(result.diagnostics.some(({ code }) => code === "base_required"));
});

test("workspace mismatch is reported before attempting a merge", async () => {
  const [base, left, right] = await Promise.all([
    fixture("base"),
    fixture("left"),
    fixture("right"),
  ]);
  right.workspace.id = "workspace-other";

  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "workspace_mismatch");
  assert.ok(result.diagnostics.some(({ code }) => code === "workspace_mismatch"));
});

test("invalid input takes precedence over workspace mismatch", async () => {
  const [base, left, right] = await Promise.all([
    fixture("base"),
    fixture("left"),
    fixture("right"),
  ]);
  left.revision = 0;
  right.workspace.id = "workspace-other";

  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "invalid_input");
  assert.ok(result.diagnostics.some(({ input, code }) => input === "left" && code === "schema"));
});

test("non-object and missing branch inputs are invalid", async () => {
  const left = await fixture("left");
  const result = mergeStateCopies({ base: null, left, right: undefined });

  assert.equal(result.kind, "invalid_input");
  assert.ok(result.diagnostics.some(({ input }) => input === "right"));
});

test("the merge never mutates any input", async () => {
  const [base, left, right] = await Promise.all([
    fixture("base"),
    fixture("left"),
    fixture("right"),
  ]);
  const snapshots = [clone(base), clone(left), clone(right)];

  mergeStateCopies({ base, left, right });

  assert.deepEqual(base, snapshots[0]);
  assert.deepEqual(left, snapshots[1]);
  assert.deepEqual(right, snapshots[2]);
});

test("record_revision remains ordinary mergeable data in unknown objects", async () => {
  const base = await fixture("base");
  base.extensions.settings = { record_revision: 1, label: "base" };
  const left = clone(base);
  const right = clone(base);
  left.revision = 6;
  left.extensions.settings.record_revision = 2;
  right.revision = 6;
  right.extensions.settings.note = "right";

  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "merged");
  assert.deepEqual(result.state.extensions.settings, {
    label: "base",
    note: "right",
    record_revision: 2,
  });
  assert.equal(result.state.revision, 7);
});

test("identical logical record payload changes use maximum branch revisions", async () => {
  const base = await fixture("base");
  const left = clone(base);
  const right = clone(base);
  left.revision = 6;
  left.profiles["profile-alpha"].name = "Shared payload change";
  left.profiles["profile-alpha"].record_revision = 3;
  right.revision = 8;
  right.profiles["profile-alpha"].name = "Shared payload change";
  right.profiles["profile-alpha"].record_revision = 5;

  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "merged");
  assert.equal(result.state.profiles["profile-alpha"].name, "Shared payload change");
  assert.equal(result.state.profiles["profile-alpha"].record_revision, 5);
  assert.equal(result.state.revision, 9);
});

test("shared-plus-extra payloads never regress root or record revisions", async () => {
  const base = await fixture("base");
  const left = clone(base);
  const right = clone(base);
  left.revision = 10;
  left.profiles["profile-alpha"].name = "Shared payload change";
  left.profiles["profile-alpha"].record_revision = 10;
  right.revision = 6;
  right.profiles["profile-alpha"].name = "Shared payload change";
  right.profiles["profile-alpha"].data.extra = "Superset contribution";
  right.profiles["profile-alpha"].record_revision = 6;

  const result = mergeStateCopies({ base, left, right });

  assert.equal(result.kind, "merged");
  assert.equal(result.state.profiles["profile-alpha"].name, "Shared payload change");
  assert.equal(
    result.state.profiles["profile-alpha"].data.extra,
    "Superset contribution",
  );
  assert.equal(result.state.profiles["profile-alpha"].record_revision, 10);
  assert.equal(result.state.revision, 11);
});

test("quoted own __proto__ fields survive merge and serialization round-trip", async () => {
  const base = await fixture("base");
  const left = clone(base);
  const right = clone(base);
  left.revision = 6;
  Object.defineProperty(left.extensions, "__proto__", {
    value: { marker: "kept" },
    enumerable: true,
    configurable: true,
    writable: true,
  });
  const parsedLeft = parseStateYaml(
    serializeState(left).replace("  __proto__:", '  "__proto__":'),
    "quoted-proto-input",
  );
  assert.equal(parsedLeft.ok, true);
  right.revision = 6;
  right.extensions.right_safe = true;

  const result = mergeStateCopies({ base, left: parsedLeft.state, right });

  assert.equal(result.kind, "merged");
  assert.equal(Object.hasOwn(result.state.extensions, "__proto__"), true);
  assert.deepEqual(result.state.extensions.__proto__, { marker: "kept" });
  const reparsed = parseStateYaml(serializeState(result.state), "proto-roundtrip");
  assert.equal(reparsed.ok, true);
  assert.equal(Object.hasOwn(reparsed.state.extensions, "__proto__"), true);
  assert.deepEqual(reparsed.state.extensions.__proto__, { marker: "kept" });
});
