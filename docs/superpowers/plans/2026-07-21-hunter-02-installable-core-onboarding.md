# Hunter 02: Installable Core and Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package one installable Hunter skill that activates naturally, onboards users, and manages fully isolated profiles through the frozen portable-state contract.

**Architecture:** A thin `SKILL.md` owns activation, routing, profile resolution, the shared operating loop, and concise result behavior. Detailed onboarding, profile/state, and recovery procedures live in direct references. The plugin and repository marketplace are distribution wrappers; all user continuity remains in `hunter-state.yaml`.

**Tech Stack:** Agent Skills Markdown/YAML, Codex skills-only plugin JSON, repository-local marketplace JSON, Node.js 20+, `node:test`, Ajv/YAML development tooling, skill-creator validation, plugin-creator validation, and host-executed conversational evaluations.

## Global Constraints

- Plan 1 must pass before this plan begins; its schema and state interfaces are frozen.
- Use `docs/superpowers/specs/2026-07-21-hunter-guided-v0.1-design.md` as the product contract.
- REQUIRED before editing skill content: use `superpowers:test-driven-development`, `superpowers:writing-skills`, and `skill-creator`.
- REQUIRED for plugin scaffolding and validation: use `plugin-creator`.
- The canonical source is `plugins/hunter/skills/hunter/`. Do not create a second editable personal-skill copy.
- Keep `SKILL.md` below 500 lines and 5,000 tokens. Link every reference directly from it.
- The user sees one Hunter skill and uses natural language; do not expose specialist subagents or require commands.
- Profiles are independent. Do not add inheritance, a shared factual core, profile modes, truth labels, proof requirements, watermarks, or Hunter policy fields.
- User-provided data is usable working data. Generated additions are persisted only when requested or accepted.
- Required continuity comes from `hunter-state.yaml`, not ChatGPT memory.
- Do not implement external apply/send/profile updates, unattended scheduling, a Hunter server/database/API key, custom MCP, dashboard, portal adapter, or public submission.
- Package content and fixtures must remain generic and contain no private career data.
- Use `apply_patch` for edits, explicit `git add` paths, and one focused commit per task.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `plugins/hunter/.codex-plugin/plugin.json` | Skills-only plugin manifest |
| `.agents/plugins/marketplace.json` | Repository-local marketplace |
| `plugins/hunter/skills/hunter/SKILL.md` | Activation, routing, profile resolution, common loop, result contract |
| `plugins/hunter/skills/hunter/agents/openai.yaml` | Skill UI metadata |
| `plugins/hunter/skills/hunter/references/onboarding.md` | Four onboarding paths |
| `plugins/hunter/skills/hunter/references/profiles-and-state.md` | Profile operations and state updates |
| `plugins/hunter/skills/hunter/references/integrity-and-recovery.md` | Isolation, receipts, failure, repair, and recovery |
| `plugins/hunter/skills/hunter/assets/profile-template.md` | Human-readable portable profile outline |
| `tests/hunter/helpers/scenario.mjs` | Frozen scenario loader and structural validator |
| `tests/hunter/scenarios/scenario.schema.json` | One-file-per-scenario contract |
| `tests/hunter/scenarios/02-*.yaml` | Core pressure scenarios |
| `tests/hunter/core-scenarios.test.mjs` | Scenario-format tests |
| `tests/hunter/package.test.mjs` | Incremental package and route tests |
| `docs/superpowers/verification/2026-07-22-hunter-02-core.md` | RED/GREEN host-run evidence |

## Locked Core Contracts

### Profile resolution

1. Explicit profile ID or exact name wins.
2. An explicit comparison request uses its named profile set.
3. A valid `workspace.default_profile_id` resolves an otherwise implicit request.
4. A workspace containing one profile uses that profile.
5. Material ambiguity produces one concise profile-selection question.

### Workflow result

Hunter internally accounts for these values, but renders only useful fields:

~~~text
outcome: completed | partial | blocked | needs-input
active profile ID(s)
deliverables or findings
material gaps
state result: unchanged | staged | saved | replacement-file
receipts for claimed tool, file, and state results
next best action and why it matters
~~~

### Canonical profile semantics

The schema intentionally keeps `profile.data` extensible. Hunter’s v0.1
workflow uses these optional named keys consistently:

~~~yaml
data:
  lifecycle: active
  positioning: {}
  targets: {}
  preferences: {}
  experience: []
  projects: []
  achievements: []
  skills: []
  education: []
  search: {}
  stories: []
  reusable_components: []
~~~

Unknown keys remain allowed and preserved. Later plans consume these keys
rather than inventing top-level profile target/preference fields.

### Scenario file

Each `tests/hunter/scenarios/*.yaml`, except the JSON schema, represents exactly one case:

~~~yaml
id: lowercase-hyphenated-id
title: Human-readable title
workflow: onboarding
capability_profile: full
capabilities:
  available:
    - files.read
    - state.write
  unavailable: []
  failures: []
fixtures:
  - ../fixtures/example.yaml
capability_bindings:
  files.read:
    - ../fixtures/example.yaml
prompt: |
  Exact user prompt.
expected:
  must:
    - Observable required behavior.
  must_not:
    - Observable prohibited behavior.
  state:
    - State assertion, or an empty array when no mutation is expected.
~~~

The filename without `.yaml` equals `id`. `workflow` is one of `onboarding`,
`profiles-and-state`, `tool-use-and-fallbacks`, `opportunities`, `documents`,
`relationships`, `pipeline-and-interviews`, or `end-to-end`.
`capability_profile` is `full` or `reduced`.
`capabilities.available`, `unavailable`, and `failures` explicitly describe
the evaluation surface; a failure contains `capability`, integer `times`, and
`error`. Fixture paths resolve inside `tests/hunter/`.
`capability_bindings` is optional. When present, it maps a non-empty capability
name to a unique non-empty array of paths already listed in `fixtures`; each
key must also appear in `capabilities.available`. Controlled adapters use this
map directly and never infer fixture roles from filenames or content.

---

### Task 1: Freeze the scenario contract and observe RED behavior

**Files:**
- Create: `tests/hunter/scenarios/scenario.schema.json`
- Create: `tests/hunter/helpers/scenario.mjs`
- Create: `tests/hunter/scenarios/02-document-onboarding.yaml`
- Create: `tests/hunter/scenarios/02-conversation-onboarding.yaml`
- Create: `tests/hunter/scenarios/02-existing-state.yaml`
- Create: `tests/hunter/scenarios/02-clone-isolation.yaml`
- Create: `tests/hunter/scenarios/02-malformed-recovery.yaml`
- Create: `tests/hunter/core-scenarios.test.mjs`
- Create: `docs/superpowers/verification/2026-07-22-hunter-02-core.md`

**Interfaces:**

~~~js
loadScenario(url)
// Promise<object>

validateScenarioShape(scenario, filename)
// [] | [{ path, message }]
~~~

- [ ] **Step 1: Write the failing deterministic test**

Create `core-scenarios.test.mjs`. Load the five files, assert every validation
result is `[]`, assert IDs are unique, and assert each ID equals its filename.
With temporary scenario objects, also assert a binding to an unavailable
capability and a binding path absent from `fixtures` each produce a stable
diagnostic. Assert available/unavailable overlap, a failure targeting an
unavailable capability, and duplicate failure capabilities are rejected.

- [ ] **Step 2: Run RED**

~~~bash
node --test tests/hunter/core-scenarios.test.mjs
~~~

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `helpers/scenario.mjs`.

- [ ] **Step 3: Add the exact JSON Schema and helper**

The Draft 2020-12 schema uses `additionalProperties: false` and requires `id`,
`title`, `workflow`, `capability_profile`, `capabilities`, `prompt`, and
`expected`. `capabilities` requires unique non-empty-string `available` and
`unavailable` arrays plus `failures`; each failure requires a capability,
integer `times >= 1`, and non-empty error. `expected` requires non-empty
`must` and `must_not` arrays plus `state`. `fixtures` is optional and contains
unique paths matching `^\\.\\./fixtures/`. `capability_bindings` is an
optional object whose property names are non-empty capability strings and
whose values are unique non-empty arrays using the same fixture-path pattern.
After JSON Schema validation, the helper rejects any binding key absent from
`capabilities.available` or any binding path absent from `fixtures`. It also
requires `available` and `unavailable` to be disjoint, every failure capability
to be available, and at most one failure schedule per capability.

Implement the helper with Ajv 2020 and `yaml.parseDocument`. Reject duplicate YAML keys. Map every error to `{ path, message }`. Validate filename/ID equality after schema validation.

- [ ] **Step 4: Add five exact pressure cases**

| ID | Prompt focus | Critical `must` | Critical `must_not` |
| --- | --- | --- | --- |
| `02-document-onboarding` | Build first workspace from supplied generic career material | At most three blocking questions; profile ID; revision 1; valid state; three next actions | Proof demand; unreceipted save claim |
| `02-conversation-onboarding` | No resume; start conversationally | One adaptive question; usable profile without documents | Long fixed questionnaire |
| `02-existing-state` | Rename `profile-alpha` in the Plan 1 two-profile fixture | Continue without onboarding; one root revision; unknown fields preserved | Modify `profile-beta` |
| `02-clone-isolation` | Clone `profile-alpha` and change only the clone | New stable ID; independent clone; valid transition | Source mutation; future inheritance |
| `02-malformed-recovery` | Recover a repair fixture without overwriting it | Exact defect; separate validated repair when possible | Original overwrite; newer-schema guess |

Use these declared surfaces:

- document/existing/clone/recovery: `files.read`, `state.read`, and
  `state.write` available; no configured failure;
- conversation: `state.write` available, `files.read` and connected sources
  unavailable; no configured failure.

- [ ] **Step 5: Capture a genuine skill-TDD RED baseline**

Run each prompt in a zero-context fresh agent (`fork_turns: "none"`) without
Hunter skill content. Provide only the prompt, declared capability surface,
and named generic fixture; prohibit reading the spec, plans, rubric, or skill.
Hide the expectations until after output. Record commit, host, input, result,
failed criteria, and observed rationalization in the verification record.

Expected: at least one critical criterion fails. If all pass, strengthen clone isolation with a second profile-specific field and rerun until a real failure is observed.

- [ ] **Step 6: Run GREEN for structure and commit**

~~~bash
node --test tests/hunter/core-scenarios.test.mjs
~~~

Expected: all five scenario subtests PASS.

~~~bash
git add tests/hunter/scenarios/scenario.schema.json \
  tests/hunter/helpers/scenario.mjs \
  tests/hunter/scenarios/02-*.yaml \
  tests/hunter/core-scenarios.test.mjs \
  docs/superpowers/verification/2026-07-22-hunter-02-core.md
git commit -m "test: define Hunter core pressure scenarios"
~~~

### Task 2: Scaffold the skills-only plugin

**Files:**
- Create: `plugins/hunter/.codex-plugin/plugin.json`
- Create: `.agents/plugins/marketplace.json`
- Create: `tests/hunter/package.test.mjs`

- [ ] **Step 1: Write package tests before scaffolding**

Assert the plugin name/version/skills path; marketplace name and source; `AVAILABLE`/`ON_INSTALL` policy; absence of `apps`, `mcpServers`, hooks, `.app.json`, and `.mcp.json`; and exact skills-only capability metadata.

- [ ] **Step 2: Run RED**

~~~bash
node --test tests/hunter/package.test.mjs
~~~

Expected: FAIL because both manifests are absent.

- [ ] **Step 3: Scaffold without overwriting Plan 1 files**

~~~bash
python3 /root/.codex/skills/.system/plugin-creator/scripts/create_basic_plugin.py \
  hunter \
  --path "$PWD/plugins" \
  --with-skills \
  --with-marketplace \
  --marketplace-path "$PWD/.agents/plugins/marketplace.json" \
  --marketplace-name hunter-career-os \
  --install-policy AVAILABLE \
  --auth-policy ON_INSTALL \
  --category Productivity
~~~

The existing `plugins/hunter/skills/hunter/schemas` and `assets` paths remain untouched because the scaffold creates only missing plugin files and directories.

- [ ] **Step 4: Replace scaffold metadata with the approved manifest**

Use this exact product metadata:

~~~json
{
  "name": "hunter",
  "version": "0.1.0",
  "description": "Portable guided career workflows for profiles, opportunities, application assets, relationships, and pursuits.",
  "author": { "name": "Hunter Career OS Contributors" },
  "license": "Apache-2.0",
  "keywords": ["career", "jobs", "contracts", "resumes", "recruiting"],
  "skills": "./skills/",
  "interface": {
    "displayName": "Hunter",
    "shortDescription": "Guided career discovery and pursuit workflows",
    "longDescription": "Use available tools to build isolated profiles, discover and analyze opportunities, create targeted assets, and maintain portable pursuit state.",
    "developerName": "Hunter Career OS Contributors",
    "category": "Productivity",
    "capabilities": ["Interactive", "Read", "Write"],
    "defaultPrompt": [
      "Set me up from my career files.",
      "Find and evaluate opportunities for this profile.",
      "What should I do next?"
    ]
  }
}
~~~

The marketplace remains the generated `hunter-career-os` root with exactly one local `./plugins/hunter` entry and `ON_INSTALL` authentication metadata.
Its required `policy` object is host installation metadata only; it is not a
Hunter career-behavior field and never enters Hunter state or responses.

- [ ] **Step 5: Run GREEN and validate**

~~~bash
node --test tests/hunter/package.test.mjs
~~~

Expected: package tests PASS. Defer plugin validation until Task 6 because
`plugins/hunter/skills/hunter/` intentionally has no `SKILL.md` yet; do not
create a placeholder skill merely to satisfy the validator.

- [ ] **Step 6: Commit**

~~~bash
git add .agents/plugins/marketplace.json \
  plugins/hunter/.codex-plugin/plugin.json \
  tests/hunter/package.test.mjs
git commit -m "feat: package Hunter as a skills-only plugin"
~~~

### Task 3: Write adaptive onboarding and the profile asset

**Files:**
- Create: `plugins/hunter/skills/hunter/references/onboarding.md`
- Create: `plugins/hunter/skills/hunter/assets/profile-template.md`
- Modify: `tests/hunter/package.test.mjs`

- [ ] **Step 1: Add failing content assertions**

Assert four named entry paths, the three-question document-led limit, the
first-result fields, no proof requirement, no imported-original overwrite,
the canonical `profile.data` layout, conditional use of the state
schema/template, and all sections of the profile template.

- [ ] **Step 2: Run RED**

Expected: `ENOENT` for `references/onboarding.md`.

- [ ] **Step 3: Implement the reference**

`onboarding.md` must contain these procedures:

1. Existing state: validate and continue; never rerun onboarding when valid.
2. Documents/connected context: read relevant available sources first; ask only blocking questions; no more than three before the first useful result.
3. Conversation: ask one adaptive question at a time and create a usable partial profile early.
4. Direct from scratch: honor the instruction without requiring documents or proof.
5. First state: schema `0.1`, root revision 1, unique workspace/profile IDs, profile revision 1, required empty collections, and first profile as default unless requested otherwise.
6. First result: profile, targets/preferences, state artifact or complete replacement YAML, material gaps, and exactly three next actions for ordinary document-led onboarding.

Create `profile-template.md` with Profile ID, Name, Positioning, Targets, Preferences/Exclusions, Experience/Projects/Achievements, Skills/Education, Search Preferences, Reusable Components, and Assets.

For state creation/mutation, the reference directs the orchestrator to read
`schemas/hunter-state.schema.json` and
`assets/hunter-state.template.yaml`. For a human-readable profile output, it
uses `assets/profile-template.md`. These are canonical assets, not a second
state shape.

- [ ] **Step 4: Run GREEN and commit**

~~~bash
node --test tests/hunter/package.test.mjs
git add plugins/hunter/skills/hunter/references/onboarding.md \
  plugins/hunter/skills/hunter/assets/profile-template.md \
  tests/hunter/package.test.mjs
git commit -m "feat: add adaptive Hunter onboarding"
~~~

### Task 4: Write isolated profile and state operations

**Files:**
- Create: `plugins/hunter/skills/hunter/references/profiles-and-state.md`
- Modify: `tests/hunter/package.test.mjs`

- [ ] **Step 1: Add failing assertions**

Assert profile resolution order; create, clone, copy-selected-data, rename, archive, restore, and delete; exact revision semantics; unknown-field preservation; replacement-file fallback; and three-way merge/base-required behavior.

- [ ] **Step 2: Run RED**

Expected: `ENOENT` for `references/profiles-and-state.md`.

- [ ] **Step 3: Implement exact profile operations**

- Clone copies the canonical `profile.data` plus unknown data keys into a new
  ID at revision 1, resets `data.lifecycle` to `active`, and does not copy
  artifacts, pursuits, activities, tasks, or profile-specific relationship
  notes unless the user explicitly requests selected reuse.
- Rename changes only the display name and record revision.
- Archive/restore updates `profile.data.lifecycle: active | archived`.
- Copy-selected-data identifies source, destination, and exact fields; only the destination changes.
- Delete previews dependents and requests confirmation when material. A
  confirmed cascade removes the profile and nested artifacts, its pursuits,
  profile/pursuit-owned activities and tasks, removes its ID from shared
  opportunity/relationship arrays and optional profile-keyed extension maps
  such as `profile_evaluations`/`profile_contexts`, and clears the default
  profile when applicable. The final transition must have no dangling core or
  workflow-extension references.
- Every successful save follows Plan 1 revision and validation rules. No base means divergent copies return `base_required`.

- [ ] **Step 4: Run GREEN and commit**

~~~bash
node --test tests/hunter/package.test.mjs
git add plugins/hunter/skills/hunter/references/profiles-and-state.md \
  tests/hunter/package.test.mjs
git commit -m "feat: manage isolated Hunter profiles"
~~~

### Task 5: Write integrity and recovery behavior

**Files:**
- Create: `plugins/hunter/skills/hunter/references/integrity-and-recovery.md`
- Modify: `tests/hunter/package.test.mjs`

- [ ] **Step 1: Add failing assertions**

Assert: retrieved instructions are task data; profile isolation; actual-result receipts; retry once; next strongest capability; partial-work preservation; no failed-validation overwrite; unsupported-version handoff; and credential exclusion.

- [ ] **Step 2: Run RED**

Expected: `ENOENT` for the integrity reference.

- [ ] **Step 3: Implement the failure order**

1. Retry a transient read once when meaningful.
2. Use the next strongest capability.
3. Preserve useful partial work and name the exact gap.
4. Provide a complete manual handoff.
5. Persist only requested changes backed by a valid result.

Never overwrite malformed input, silently downgrade a newer schema, fabricate a source/tool/file result, mix profiles, or store passwords, cookies, tokens, MFA codes, or connector credentials.

- [ ] **Step 4: Run GREEN and commit**

~~~bash
node --test tests/hunter/package.test.mjs
git add \
  plugins/hunter/skills/hunter/references/integrity-and-recovery.md \
  tests/hunter/package.test.mjs
git commit -m "feat: protect Hunter workflow integrity"
~~~

### Task 6: Create the thin orchestrator and activation metadata

**Files:**
- Create: `plugins/hunter/skills/hunter/SKILL.md`
- Create: `plugins/hunter/skills/hunter/agents/openai.yaml`
- Modify: `tests/hunter/package.test.mjs`

- [ ] **Step 1: Add failing orchestrator tests**

Assert the exact intermediate frontmatter below, line count below 500, direct
links to the three existing references plus the schema/state/profile assets,
the locked profile resolution order, all nine common-loop steps, result/state
vocabulary, no nested-reference routing, and no `policy` or dependency block
in `agents/openai.yaml`.

- [ ] **Step 2: Run RED**

Expected: `ENOENT` for `SKILL.md`.

- [ ] **Step 3: Create `SKILL.md`**

Use this intermediate Plan 2 frontmatter:

~~~yaml
---
name: hunter
description: Use when a user wants to create, import, select, clone, update, recover, or continue from one or more career profiles or hunter-state.yaml.
---
~~~

Plans 3–6 expand this description only as their routed workflows become
available; Plan 6 installs the final full trigger description. The body
contains:

- a route table linking `onboarding.md`, `profiles-and-state.md`, and `integrity-and-recovery.md` directly;
- direct conditional links to `schemas/hunter-state.schema.json`,
  `assets/hunter-state.template.yaml`, and `assets/profile-template.md` for
  state/profile creation and mutation;
- the approved nine-step common operating loop;
- the locked profile-resolution order;
- the saved/staged/replacement-file state behavior;
- the concise result contract; and
- the Guided v0.1 boundary.

It tells the host to read only the relevant workflow references and never duplicates their detailed procedures.

- [ ] **Step 4: Generate and complete `agents/openai.yaml`**

~~~bash
python3 /root/.codex/skills/oai/skill-creator/scripts/generate_openai_yaml.py \
  plugins/hunter/skills/hunter \
  --interface 'display_name=Hunter' \
  --interface 'short_description=Career profiles, opportunities, and pursuits' \
  --interface 'default_prompt=Use $hunter to set me up from my career files.'
~~~

Do not add a `policy` or dependency block. The metadata remains eligible for
host-side implicit invocation, but Plan 2 does not claim to prove activation
without an installed copy. Plan 7 owns explicit and implicit new-chat
activation evidence.

- [ ] **Step 5: Run GREEN and official validators**

~~~bash
node --test tests/hunter/package.test.mjs
python3 /root/.codex/skills/oai/skill-creator/scripts/quick_validate.py \
  plugins/hunter/skills/hunter
python3 /root/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  plugins/hunter
~~~

Expected: all pass.

- [ ] **Step 6: Commit**

~~~bash
git add plugins/hunter/skills/hunter/SKILL.md \
  plugins/hunter/skills/hunter/agents/openai.yaml \
  tests/hunter/package.test.mjs
git commit -m "feat: add Hunter core orchestrator"
~~~

### Task 7: Run GREEN behavior and installation smoke

**Files:**
- Modify: `docs/superpowers/verification/2026-07-22-hunter-02-core.md`

- [ ] **Step 1: Run the five scenarios in fresh agents**

Use `fork_turns: "none"`. Give each fresh agent the completed skill and only
its prompt, declared capabilities, and fixtures; prohibit reading plans/specs
or the rubric. Reveal the rubric after the response. Record actual tools,
result receipt, state validator result, must/must-not/state scores, and final
PASS/FAIL.

- [ ] **Step 2: Close only observed loopholes**

Apply the smallest general instruction change, rerun the failed case, then rerun all five. Do not encode fixture names into the skill.

- [ ] **Step 3: Run the deterministic gate**

~~~bash
npm ci
npm run test:state
node --test tests/hunter/core-scenarios.test.mjs tests/hunter/package.test.mjs
npm run validate:state -- \
  plugins/hunter/skills/hunter/assets/hunter-state.template.yaml
python3 /root/.codex/skills/oai/skill-creator/scripts/quick_validate.py \
  plugins/hunter/skills/hunter
python3 /root/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  plugins/hunter
git diff --check
~~~

Expected: zero failures.

- [ ] **Step 4: Perform an optional disposable development-install smoke**

Use a disposable plugin profile/environment that will not be reused for Plan
7’s clean-install evidence. When Codex CLI is available:

~~~bash
codex plugin marketplace add "$PWD"
codex plugin marketplace list
codex plugin add hunter@hunter-career-os
codex plugin list
~~~

When CLI or an exact local Plugins Directory surface is absent, record the
smoke as `not-run` and continue; package validation plus zero-context workflow
evaluation with the completed skill supplied as the system-under-test is the
Plan 2 gate. This proves behavior, not host-side skill selection. Plan 7 owns
the first mandatory actual install and both explicit and implicit activation
checks in a freshly isolated environment. Never reuse a smoke installation as
its clean-install evidence.

- [ ] **Step 5: Commit GREEN evidence**

~~~bash
git add docs/superpowers/verification/2026-07-22-hunter-02-core.md \
  plugins/hunter/skills/hunter/SKILL.md \
  plugins/hunter/skills/hunter/references
git commit -m "test: qualify Hunter core workflows"
~~~

## Plan Gate

Do not start Plan 3 until all deterministic checks and official validators
pass; zero-context workflow evaluations with the completed skill supplied are
GREEN; generated state and transitions validate; clone isolation has no
leakage; the package remains generic; and `git status --short` is empty. Do
not describe this as host activation evidence. A disposable installation
smoke is useful but not a substitute for or prerequisite to Plan 7’s
clean-install and activation gate.
