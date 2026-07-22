import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { repairStateYaml } from "../../../tools/hunter-state/repair.mjs";
import { parseStateYaml } from "../../../tools/hunter-state/io.mjs";
import { validateStateObject } from "../../../tools/hunter-state/validate.mjs";

const fixture = (name) =>
  readFile(new URL("../fixtures/state/" + name, import.meta.url), "utf8");

test("valid state is returned without repair", async () => {
  const result = repairStateYaml(await fixture("valid/empty.yaml"));

  assert.equal(result.kind, "valid");
  assert.deepEqual(Object.keys(result).sort(), ["kind", "state", "yaml"]);
  assert.equal(validateStateObject(result.state).valid, true);
  assert.equal(parseStateYaml(result.yaml).ok, true);
});

test("missing root collections are restored as empty containers", async () => {
  const result = repairStateYaml(await fixture("repair/missing-collections.yaml"));

  assert.equal(result.kind, "repaired");
  assert.deepEqual(result.state.profiles, {});
  assert.deepEqual(result.state.opportunities, {});
  assert.deepEqual(result.state.pursuits, {});
  assert.deepEqual(result.state.relationships, {});
  assert.deepEqual(result.state.activities, []);
  assert.deepEqual(result.state.tasks, []);
  assert.equal(result.state.extensions.future_flag, true);
  assert.equal(validateStateObject(result.state).valid, true);
  assert.ok(result.changes.length >= 6);
  assert.deepEqual(result.diagnostics, []);
});

test("missing record metadata and safe empty containers are restored", async () => {
  const result = repairStateYaml(
    await fixture("repair/missing-record-metadata.yaml"),
  );

  assert.equal(result.kind, "repaired");
  const profile = result.state.profiles["profile-alpha"];
  assert.equal(profile.id, "profile-alpha");
  assert.equal(profile.record_revision, 1);
  assert.deepEqual(profile.data, {});
  assert.equal(profile.artifacts[0].record_revision, 1);
  assert.equal(profile.future_profile_field.retained, true);
  const opportunity = result.state.opportunities["opportunity-alpha"];
  assert.equal(opportunity.id, "opportunity-alpha");
  assert.equal(opportunity.record_revision, 1);
  assert.deepEqual(opportunity.profile_ids, []);
  assert.deepEqual(opportunity.sources, []);
  assert.equal(result.state.activities[0].record_revision, 1);
  assert.deepEqual(result.state.activities[0].details, {});
  assert.equal(result.state.tasks[0].record_revision, 1);
  assert.deepEqual(result.state.tasks[0].details, {});
  assert.equal(validateStateObject(result.state).valid, true);
  const reparsed = parseStateYaml(result.yaml);
  assert.equal(
    reparsed.state.profiles["profile-alpha"].future_profile_field.retained,
    true,
  );
});

test("repair change paths escape slash and tilde in map record IDs", async () => {
  const original = (await fixture("valid/empty.yaml")).replace(
    "profiles: {}",
    [
      "profiles:",
      "  profile-a/b~c:",
      "    record_revision: 1",
      "    name: Escaped Profile",
      "    data: {}",
      "    artifacts: []",
    ].join("\n"),
  );

  const result = repairStateYaml(original);

  assert.equal(result.kind, "repaired");
  assert.ok(
    result.changes.some(
      ({ code, path }) =>
        code === "map_record_id" &&
        path === "/profiles/profile-a~1b~0c/id",
    ),
  );
  assert.equal(validateStateObject(result.state).valid, true);
});

test("invalid YAML is unrepairable and preserves the original text", () => {
  const original = "schema_version: [\n";
  const result = repairStateYaml(original);

  assert.equal(result.kind, "unrepairable");
  assert.equal(result.original, original);
  assert.ok(result.diagnostics.some(({ code }) => code === "parse"));
});

test("duplicate IDs remain unrepairable", async () => {
  const original = await fixture("repair/unrepairable.yaml");
  const result = repairStateYaml(original);

  assert.equal(result.kind, "unrepairable");
  assert.equal(result.original, original);
  assert.ok(result.diagnostics.some(({ code }) => code === "duplicate_id"));
});

test("dangling references remain unrepairable", async () => {
  const original = await fixture("invalid/dangling-pursuit.yaml");
  const result = repairStateYaml(original);

  assert.equal(result.kind, "unrepairable");
  assert.equal(result.original, original);
  assert.ok(
    result.diagnostics.some(({ code }) => code === "dangling_reference"),
  );
});

test("ambiguous scalar coercion is not attempted", async () => {
  const original = (await fixture("valid/empty.yaml")).replace(
    'schema_version: "0.1"',
    "schema_version: 0.1",
  );
  const result = repairStateYaml(original);

  assert.equal(result.kind, "unrepairable");
  assert.equal(result.original, original);
  assert.ok(result.diagnostics.some(({ code }) => code === "schema"));
});

test("unsupported schema versions are distinguished from unrepairable input", async () => {
  const original = (await fixture("valid/empty.yaml")).replace(
    'schema_version: "0.1"',
    'schema_version: "0.2"',
  );
  const result = repairStateYaml(original);

  assert.equal(result.kind, "unsupported_version");
  assert.equal(result.original, original);
  assert.ok(
    result.diagnostics.some(({ code }) => code === "unsupported_version"),
  );
});

test("explicit invalid record metadata is never overwritten", async () => {
  const original = (await fixture("valid/two-profiles.yaml")).replace(
    "record_revision: 1",
    "record_revision: 0",
  );
  const result = repairStateYaml(original);

  assert.equal(result.kind, "unrepairable");
  assert.equal(result.original, original);
});

test("non-empty history prevents unsafe record revision synthesis", async () => {
  const original = (
    await fixture("repair/missing-record-metadata.yaml")
  ).replace(
    "  profile-alpha:\n",
    "  profile-alpha:\n    history:\n      - record_revision: 2\n",
  );
  const result = repairStateYaml(original);

  assert.equal(result.kind, "unrepairable");
  assert.equal(result.original, original);
  assert.ok(result.diagnostics.some(({ code }) => code === "schema"));
});
