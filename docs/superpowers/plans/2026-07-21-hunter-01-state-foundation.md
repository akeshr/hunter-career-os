# Hunter 01: State Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify the complete portable `hunter-state.yaml` contract before any Hunter workflow depends on it.

**Architecture:** The installed skill has no runtime package dependency. Repository-owned Node.js ESM tooling parses constrained YAML, validates JSON Schema plus cross-record semantics, checks saved transitions, performs explicit three-way merge, and generates conservative repaired copies. The complete v0.1 schema freezes at this plan gate.

**Tech Stack:** Node.js 20+, `node:test`, `node:assert/strict`, YAML 2.x, Ajv 8.x with Draft 2020-12 and formats, JSON Schema, YAML 1.2-compatible state.

## Global Constraints

- Use `docs/superpowers/specs/2026-07-21-hunter-guided-v0.1-design.md` as the product contract.
- Development tooling may use Node packages; the distributed skill may not depend on them at runtime.
- State supports any number of isolated profiles and no forced shared profile core.
- Do not add profile-mode, truth-status, watermark, or Hunter policy fields.
- Do not store credentials, session tokens, MFA codes, or connector secrets.
- Preserve unknown semantic fields. Comments, aliases, tags, key order, quoting, and byte identity are not portable state.
- Use generic fixtures only; never commit real user career or contact data.
- Do not implement external apply/send/profile updates, scheduling, a Hunter server/database/API key, custom MCP, or public submission.
- Use `apply_patch` for edits, explicit `git add` paths, and one focused commit per task.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `package.json` / `package-lock.json` | Reproducible development tests |
| `plugins/hunter/skills/hunter/schemas/hunter-state.schema.json` | Complete v0.1 structural contract |
| `plugins/hunter/skills/hunter/assets/hunter-state.template.yaml` | Empty portable state |
| `tests/hunter/support/state/io.mjs` | Strict parsing and canonical serialization |
| `tests/hunter/support/state/validate.mjs` | Schema and semantic validation |
| `tests/hunter/support/state/transition.mjs` | Saved-mutation revision validation |
| `tests/hunter/support/state/merge.mjs` | Three-way merge and conflict reporting |
| `tests/hunter/support/state/repair.mjs` | Conservative structural repair |
| `tests/hunter/support/validate-state-cli.mjs` | CLI validator |
| `tests/hunter/state/*.test.mjs` | State unit tests |
| `tests/hunter/fixtures/state/**` | Generic fixtures |

## Locked State Interfaces

```js
parseStateYaml(text, sourceName = "<memory>")
// { ok: true, state } | { ok: false, diagnostics }

serializeState(state)
// canonical YAML string

validateStateObject(state)
// { valid, errors: [{ code, path, message }], warnings: [] }

validateStateTransition(before, after)
// same report shape

mergeStateCopies({ base, left, right })
// { kind: "merged", state }
// | { kind: "conflict", conflicts, partial }
// | { kind: "base_required" | "workspace_mismatch" | "invalid_input", diagnostics }

repairStateYaml(text)
// { kind: "repaired", state, yaml, changes, diagnostics }
// | { kind: "valid", state, yaml }
// | { kind: "unrepairable" | "unsupported_version", original, diagnostics }
```

### Task 1: Add parsing, schema validation, and the empty state

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `.gitignore`
- Create: `plugins/hunter/skills/hunter/schemas/hunter-state.schema.json`
- Create: `plugins/hunter/skills/hunter/assets/hunter-state.template.yaml`
- Create: `tests/hunter/support/state/io.mjs`
- Create: `tests/hunter/support/state/validate.mjs`
- Create: `tests/hunter/state/schema.test.mjs`
- Create: `tests/hunter/fixtures/state/valid/empty.yaml`
- Create: `tests/hunter/fixtures/state/valid/two-profiles.yaml`

**Interfaces:**
- Produces `parseStateYaml`, `serializeState`, and `validateStateObject` exactly as locked above.
- Later tasks consume the schema unchanged.

- [ ] **Step 1: Write the failing tests**

Create `tests/hunter/state/schema.test.mjs` with these tests:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const fixture = (name) =>
  readFile(new URL("../fixtures/state/" + name, import.meta.url), "utf8");

test("empty state validates", async () => {
  const { parseStateYaml } = await import("../support/state/io.mjs");
  const { validateStateObject } =
    await import("../support/state/validate.mjs");
  const parsed = parseStateYaml(await fixture("valid/empty.yaml"), "empty");
  assert.equal(parsed.ok, true);
  assert.deepEqual(validateStateObject(parsed.state), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("unknown semantic fields survive a round trip", async () => {
  const { parseStateYaml, serializeState } =
    await import("../support/state/io.mjs");
  const parsed = parseStateYaml(
    await fixture("valid/two-profiles.yaml"),
    "two-profiles",
  );
  const roundTrip = parseStateYaml(serializeState(parsed.state), "roundtrip");
  assert.equal(roundTrip.ok, true);
  assert.equal(roundTrip.state.extensions.future_flag, true);
});

test("duplicate keys, aliases, tags, and non-finite numbers are rejected", async () => {
  const { parseStateYaml } = await import("../support/state/io.mjs");
  const cases = [
    "revision: 1\\nrevision: 2\\n",
    "a: &a {x: 1}\\nb: *a\\n",
    "value: !custom x\\n",
    "value: .inf\\n",
  ];
  for (const text of cases) assert.equal(parseStateYaml(text).ok, false);
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
node --test tests/hunter/state/schema.test.mjs
```

Expected: FAIL because the state modules and fixtures do not exist.

- [ ] **Step 3: Add the development package**

Create `package.json`:

```json
{
  "name": "hunter-career-os",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "node --test tests/hunter/state/*.test.mjs tests/hunter/*.test.mjs",
    "test:state": "node --test tests/hunter/state/*.test.mjs"
  },
  "devDependencies": {
    "ajv": "^8.0.0",
    "ajv-formats": "^3.0.0",
    "yaml": "^2.0.0"
  }
}
```

Create `.gitignore` containing `node_modules/`. Run `npm install` and retain
the generated lockfile.

- [ ] **Step 4: Create the full schema and fixtures**

The root schema uses Draft 2020-12, `additionalProperties: true`, and requires:

| Object | Required fields |
| --- | --- |
| Root | `schema_version="0.1"`, integer `revision >= 1`, `workspace`, `profiles`, `opportunities`, `pursuits`, `relationships`, `activities`, `tasks` |
| Workspace | `id` matching `workspace-*`, nullable `default_profile_id`, object `preferences` |
| Profile | `id`, `record_revision >= 1`, `name`, object `data`, array `artifacts` |
| Artifact | `id`, `record_revision`, `profile_id`, `type`, date-time `created_at`, `availability`, and at least one of `filename` or `location` |
| Opportunity | `id`, `record_revision`, `kind`, unique `profile_ids`, array `sources` |
| Pursuit | `id`, `record_revision`, `profile_id`, `opportunity_id`, unique `event_ids` |
| Relationship | `id`, `record_revision`, `kind`, `name`, unique `profile_ids` |
| Activity | `id`, `record_revision`, `type`, date-time `occurred_at`; optional foreign IDs and `details` |
| Task | `id`, `record_revision`, `title`, `status`; optional foreign IDs and nullable date-time `due_at` |

Use stable ID prefixes `profile-`, `opportunity-`, `pursuit-`,
`relationship-`, `activity-`, and `task-`. Artifacts and sources only require
non-empty IDs.

Create the skill template and empty fixture with:

```yaml
schema_version: "0.1"
revision: 1
workspace:
  id: workspace-example
  default_profile_id: null
  preferences: {}
profiles: {}
opportunities: {}
pursuits: {}
relationships: {}
activities: []
tasks: []
```

Create a second fixture with `profile-alpha` and `profile-beta`, distinct
`data.custom_note` values, empty artifact arrays, and:

```yaml
extensions:
  future_flag: true
```

- [ ] **Step 5: Implement the minimal parser and validator**

`io.mjs` must use `parseDocument(text, { uniqueKeys: true })`, reject parse
errors and the unsupported YAML features above, recursively reject non-plain
objects and non-finite numbers, and serialize with deterministic key ordering.

`validate.mjs` must compile the schema with:

```js
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
```

Map every Ajv error to `{ code: "schema", path, message }`.

- [ ] **Step 6: Run GREEN and commit**

Run `npm run test:state`. Expected: 3 tests PASS.

Commit:

```bash
git add .gitignore package.json package-lock.json \
  plugins/hunter/skills/hunter/schemas/hunter-state.schema.json \
  plugins/hunter/skills/hunter/assets/hunter-state.template.yaml \
  tests/hunter/support/state/io.mjs tests/hunter/support/state/validate.mjs \
  tests/hunter/state/schema.test.mjs tests/hunter/fixtures/state/valid
git commit -m "feat: define portable Hunter state"
```

### Task 2: Validate semantic IDs and references

**Files:**
- Modify: `tests/hunter/support/state/validate.mjs`
- Create: `tests/hunter/state/semantics.test.mjs`
- Create: `tests/hunter/fixtures/state/invalid/key-id-mismatch.yaml`
- Create: `tests/hunter/fixtures/state/invalid/dangling-pursuit.yaml`
- Create: `tests/hunter/fixtures/state/invalid/duplicate-array-id.yaml`

**Interfaces:**
- Extends `validateStateObject` without changing its signature.
- Adds codes `map_key_id_mismatch`, `duplicate_id`, and `dangling_reference`.

- [ ] **Step 1: Write failing table-driven tests**

```js
for (const [file, code] of [
  ["key-id-mismatch.yaml", "map_key_id_mismatch"],
  ["dangling-pursuit.yaml", "dangling_reference"],
  ["duplicate-array-id.yaml", "duplicate_id"],
]) {
  test(file + " reports " + code, async () => {
    const result = validateStateObject(await loadInvalid(file));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.code === code));
  });
}
```

- [ ] **Step 2: Run RED**

Run `node --test tests/hunter/state/semantics.test.mjs`.

Expected: FAIL because semantic codes are absent.

- [ ] **Step 3: Implement exact semantic checks**

Check map-key/embedded-ID equality; unique IDs in activities, tasks, and each
profile artifact array; nullable default profile resolution; every foreign
profile/opportunity/pursuit/relationship reference; and artifact ownership.
Combine schema and semantic errors before computing `valid`.

- [ ] **Step 4: Run GREEN**

Run `npm run test:state`. Expected: all schema and semantic tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/hunter/support/state/validate.mjs tests/hunter/state/semantics.test.mjs \
  tests/hunter/fixtures/state/invalid
git commit -m "feat: validate Hunter state references"
```

### Task 3: Validate saved transitions and revisions

**Files:**
- Create: `tests/hunter/support/state/transition.mjs`
- Create: `tests/hunter/state/transition.test.mjs`
- Create: `tests/hunter/fixtures/state/transition/before.yaml`
- Create: `tests/hunter/fixtures/state/transition/valid-after.yaml`
- Create: `tests/hunter/fixtures/state/transition/invalid-after.yaml`

**Interfaces:**
- Produces `validateStateTransition(before, after)`.
- Diagnostic codes: `root_revision`, `record_revision`, `stable_id`.

- [ ] **Step 1: Write failing tests for every revision rule**

Assert:

- new state starts at root revision 1;
- a saved mutation increments root revision exactly once;
- new records start at record revision 1;
- changed records increment exactly once;
- unchanged records retain their revision;
- stable IDs never change;
- the resulting state has no dangling references.

- [ ] **Step 2: Run RED**

Run `node --test tests/hunter/state/transition.test.mjs`.

Expected: module-not-found for `transition.mjs`.

- [ ] **Step 3: Implement transition validation**

Use `isDeepStrictEqual` for record comparison. Normalize activities, tasks, and
artifacts to ID maps before comparing. Validate `after` first and return its
errors together with transition errors.

- [ ] **Step 4: Run GREEN and commit**

Run `npm run test:state`. Expected: zero failures.

```bash
git add tests/hunter/support/state/transition.mjs tests/hunter/state/transition.test.mjs \
  tests/hunter/fixtures/state/transition
git commit -m "feat: validate Hunter state transitions"
```

### Task 4: Implement safe three-way merge

**Files:**
- Create: `tests/hunter/support/state/merge.mjs`
- Create: `tests/hunter/state/merge.test.mjs`
- Create: `tests/hunter/fixtures/state/merge/base.yaml`
- Create: `tests/hunter/fixtures/state/merge/left.yaml`
- Create: `tests/hunter/fixtures/state/merge/right.yaml`

**Interfaces:**
- Produces `mergeStateCopies({ base, left, right })` exactly as locked.
- Never guesses a base from revision numbers.

- [ ] **Step 1: Write failing merge tests**

Cover identical branches, one unchanged branch, disjoint object edits,
ID-array merge, unknown fields, delete/unchanged, delete/edit conflict,
both-sides non-ID-array conflict, missing base, workspace mismatch, invalid
input, and result revision.

For a missing base, two valid same-workspace inputs that are semantically
deep-equal deduplicate to that unchanged state. Any other divergence returns
`base_required`. The API consumes parsed objects, so byte identity is not part
of this decision.

- [ ] **Step 2: Run RED**

Run `node --test tests/hunter/state/merge.test.mjs`.

Expected: module-not-found for `merge.mjs`.

- [ ] **Step 3: Implement the locked recursive decisions**

```text
left equals right  -> keep either
left equals base   -> keep right
right equals base  -> keep left
plain objects      -> recurse by key
ID arrays          -> normalize, recurse, sort by ID
other arrays       -> conflict when both changed
delete/unchanged   -> delete
delete/edit        -> conflict
```

With a supplied base and a real merge, set root revision to
`max(left.revision, right.revision) + 1`. A record
combining both branches gets `max(left.record_revision,
right.record_revision) + 1`.

- [ ] **Step 4: Run GREEN and commit**

Run `npm run test:state`. Expected: zero failures.

```bash
git add tests/hunter/support/state/merge.mjs tests/hunter/state/merge.test.mjs \
  tests/hunter/fixtures/state/merge
git commit -m "feat: merge Hunter state copies"
```

### Task 5: Add conservative repair and validator CLI

**Files:**
- Create: `tests/hunter/support/state/repair.mjs`
- Create: `tests/hunter/state/repair.test.mjs`
- Create: `tests/hunter/state/cli.test.mjs`
- Create: `tests/hunter/support/validate-state-cli.mjs`
- Create: `tests/hunter/fixtures/state/repair/missing-collections.yaml`
- Create: `tests/hunter/fixtures/state/repair/missing-record-metadata.yaml`
- Create: `tests/hunter/fixtures/state/repair/unrepairable.yaml`

**Interfaces:**
- Produces `repairStateYaml(text)` exactly as locked.
- CLI exit codes: 0 valid, 1 invalid state, 2 usage/I/O.

- [ ] **Step 1: Write failing repair and CLI tests**

Safe repair may add missing empty root collections, replace absent/null
optional containers with documented empty values, restore a missing embedded
map-record ID from its key, and add `record_revision: 1` when no history
exists. It may emit a repaired copy only if that copy fully validates.

Assert it refuses invalid YAML, duplicate IDs, dangling references, ambiguous
scalar coercion, and unsupported schema versions.

Create `tests/hunter/state/cli.test.mjs`. Spawn the validator with the valid
template and require exit 0 plus one JSON object; spawn it with an invalid
fixture and require exit 1; and spawn it without arguments and require exit 2.

- [ ] **Step 2: Run RED**

Run:

```bash
node --test tests/hunter/state/repair.test.mjs \
  tests/hunter/state/cli.test.mjs
```

Expected: FAIL because `repair.mjs` and the validator CLI do not exist.

- [ ] **Step 3: Implement repair and CLI**

CLI:

```text
node tests/hunter/support/validate-state-cli.mjs <state.yaml> [--repair-output <new.yaml>]
```

Print one JSON object to stdout. `--repair-output` writes only a new path and
only for `kind: "repaired"`. Never replace the input.

- [ ] **Step 4: Run GREEN and commit**

Run:

```bash
node tests/hunter/support/validate-state-cli.mjs \
  plugins/hunter/skills/hunter/assets/hunter-state.template.yaml
npm run test:state
```

Expected: validator exits 0; all tests PASS.

```bash
git add tests/hunter/support/state/repair.mjs tests/hunter/support/validate-state-cli.mjs \
  tests/hunter/state/repair.test.mjs tests/hunter/state/cli.test.mjs \
  tests/hunter/fixtures/state/repair
git commit -m "feat: repair and inspect Hunter state"
```

### Task 6: Qualify small, medium, and large state

**Files:**
- Create: `tests/hunter/helpers/make-state-fixture.mjs`
- Create: `tests/hunter/state/fixture-matrix.test.mjs`
- Create: `tests/hunter/fixtures/state/README.md`
- Modify: `README.md`

**Interfaces:**
- Produces `makeStateFixture(counts) -> state` with deterministic generic data.
- Establishes `npm run test:state` as the frozen state gate.

- [ ] **Step 1: Write the failing fixture matrix test**

Assert deterministic output and valid states for:

- small: 1 profile, 2 opportunities, 1 pursuit;
- medium: 5 profiles, 50 opportunities, 25 pursuits, 50 relationships;
- large: 20 profiles, 500 opportunities, 250 pursuits, 500 relationships,
  2,000 activities, and 1,000 tasks.

- [ ] **Step 2: Run RED**

Run `node --test tests/hunter/state/fixture-matrix.test.mjs`.

Expected: module-not-found for the fixture helper.

- [ ] **Step 3: Implement deterministic generic generation**

Derive every field from integer indexes; never call random or time APIs. Use
labels such as `Example Organization 001` and `Example Contact 001`. Document
every committed fixture category and its owning test.

- [ ] **Step 4: Run the full gate**

```bash
npm ci
npm run test:state
node tests/hunter/support/validate-state-cli.mjs \
  plugins/hunter/skills/hunter/assets/hunter-state.template.yaml
```

Expected: zero failures and validator exit 0.

- [ ] **Step 5: Commit**

```bash
git add README.md tests/hunter/helpers/make-state-fixture.mjs \
  tests/hunter/state/fixture-matrix.test.mjs \
  tests/hunter/fixtures/state/README.md
git commit -m "test: qualify Hunter state foundation"
```

## Plan Gate

Do not start Plan 2 until `npm ci`, `npm run test:state`, and template
validation all pass; genericity review finds no user-specific fixture data;
the complete state contract is review-approved; and `git status --short` is
empty.
