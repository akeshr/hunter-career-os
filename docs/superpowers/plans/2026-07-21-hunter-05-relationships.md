# Hunter 05: Relationships Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Hunter research and organize people, organizations, recruiting channels, warm paths, outreach assets, interactions, and follow-ups while preserving profile context and accurate state.

**Architecture:** `references/relationships.md` owns relationship research and lightweight graph behavior while `SKILL.md` remains the router. Relationships stay Plan 1 map records; profile contexts and graph edges use permitted optional fields. Actual interactions use root activities, follow-ups use root tasks, and outreach assets remain under their owning profile.

**Tech Stack:** Agent Skills Markdown, generic YAML scenarios, browser/search/files/email/calendar capabilities exposed by the host, Node.js 20+ with `node:test`, and Plan 1 state tooling.

## Global Constraints

- Plans 1–4 and their gates must pass before this plan begins.
- Use `docs/superpowers/specs/2026-07-21-hunter-guided-v0.1-design.md` as the product contract.
- REQUIRED before skill edits: use `superpowers:test-driven-development`, `superpowers:writing-skills`, and `skill-creator`.
- Do not reshape the frozen relationship, activity, task, profile, or artifact records.
- Represent people, organizations, staffing firms, communities, and useful channels with existing relationship records distinguished by `kind`.
- Every `profile_contexts` key must also appear in the relationship’s `profile_ids`.
- Store outreach artifacts under their owning profile; store actual interactions as root activities and follow-ups as root tasks.
- Keep ambiguous same-name contacts separate. Deduplicate only strong identity matches.
- Use all materially relevant available read capabilities; retain current-source URLs and checked times.
- A prepared draft is not a completed interaction. Guided v0.1 never sends it.
- Do not add profile/truth/policy modes, proof requirements, external execution, scheduling, Hunter infrastructure, or public submission.
- Do not store credentials, tokens, cookies, MFA codes, or connector secrets.
- Installed skill instructions retain no Node runtime dependency.
- Use generic fixtures, `apply_patch`, explicit `git add` paths, and focused commits.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `plugins/hunter/skills/hunter/references/relationships.md` | Research, identity, graph, warm path, draft, interaction, and follow-up procedure |
| `plugins/hunter/skills/hunter/SKILL.md` | One direct relationship route |
| `tests/hunter/fixtures/workflows/relationships/state-before.yaml` | Generic two-profile relationship state |
| `tests/hunter/scenarios/05-*.yaml` | Six relationship pressure scenarios |
| `tests/hunter/relationship-scenarios.test.mjs` | Plan 2 scenario-contract checks |
| `tests/hunter/relationships.test.mjs` | Routing, extension, graph-link, activity, and task tests |
| `docs/superpowers/verification/2026-07-22-hunter-05-relationships.md` | RED/GREEN host-run evidence |

## Relationship Extension Contract

Plan 1 fields remain authoritative. Optional fields may include:

~~~yaml
profile_contexts:
  profile-alpha:
    state_tags:
      - Researched
    notes:
      - Relevant to opportunity-alpha.
    artifact_ids:
      - artifact-introduction
    task_ids:
      - task-follow-up
    next_action: Review the prepared introduction.
related_relationship_ids:
  - relationship-example-organization
opportunity_ids:
  - opportunity-alpha
pursuit_ids: []
artifact_ids:
  - artifact-introduction
task_ids:
  - task-follow-up
sources:
  - id: source-example-contact
    url: https://example.com/team/example-contact
    retrieved_at: "2026-07-22T11:00:00Z"
identity_keys:
  - https://example.com/team/example-contact
possible_duplicate_ids: []
last_activity_id: activity-contacted
~~~

Activities/tasks use Plan 1’s optional `profile_id`, `relationship_id`, `opportunity_id`, and `pursuit_id` references. Outreach artifacts may add `relationship_ids[]`. These extensions do not become schema requirements.

---

### Task 1: Define relationship fixtures and RED scenarios

**Files:**
- Create: `tests/hunter/fixtures/workflows/relationships/state-before.yaml`
- Create: `tests/hunter/scenarios/05-research-person-firm.yaml`
- Create: `tests/hunter/scenarios/05-ambiguous-identities.yaml`
- Create: `tests/hunter/scenarios/05-warm-path.yaml`
- Create: `tests/hunter/scenarios/05-outreach-draft.yaml`
- Create: `tests/hunter/scenarios/05-confirmed-interaction.yaml`
- Create: `tests/hunter/scenarios/05-multi-profile-context.yaml`
- Create: `tests/hunter/relationship-scenarios.test.mjs`
- Create: `docs/superpowers/verification/2026-07-22-hunter-05-relationships.md`

- [ ] **Step 1: Create and validate the starting state**

Use two distinct generic profiles, `opportunity-alpha` linked only to Alpha, and empty relationships/activities/tasks. Include no real names, companies, contact details, or private data.

~~~bash
npm run validate:state -- \
  tests/hunter/fixtures/workflows/relationships/state-before.yaml
~~~

Expected: exit 0.

- [ ] **Step 2: Write six one-file scenarios**

| ID | Capability profile | Critical outcome |
| --- | --- | --- |
| `05-research-person-firm` | full | Current sources; separate person/firm records; Alpha-only context |
| `05-ambiguous-identities` | full | Same display name at different firms remains two possible duplicates |
| `05-warm-path` | full | Uses connected context first; distinguishes observed edge from inference |
| `05-outreach-draft` | full | Personalized artifact linked to Alpha and relationship; not sent/contacted |
| `05-confirmed-interaction` | full | User-confirmed contact creates activity and a follow-up task |
| `05-multi-profile-context` | reduced | Shared relationship keeps profile-specific notes/drafts separate |

Every scenario uses the Plan 2 schema and includes state assertions for valid stable IDs, exact revisions, source retention, graph links, and unchanged unrelated profiles.

Every file uses `workflow: relationships`, an ID equal to its filename,
`fixtures[]` paths beginning `../fixtures/`, and an explicit `capabilities`
surface. Use this complete canonical identity case:

~~~yaml
id: 05-ambiguous-identities
title: Keep ambiguous same-name contacts separate
workflow: relationships
capability_profile: full
capabilities:
  available:
    - browser.search
    - browser.navigate
    - state.read
    - state.write
  unavailable: []
  failures: []
fixtures:
  - ../fixtures/workflows/relationships/state-before.yaml
prompt: |
  Two current results show contacts named Jordan Example at different
  organizations. Track both useful leads without assuming they are one person.
expected:
  must:
    - Keeps two relationship records and both source links.
    - Records why identity remains unresolved.
  must_not:
    - Merges solely on display name.
    - Invents an email address or connection.
  state:
    - Both new records start at revision 1 and the saved state validates.
    - Profile Beta remains unchanged.
~~~

- [ ] **Step 3: Validate scenario structure**

Create `relationship-scenarios.test.mjs`. Enumerate exactly six `05-*.yaml`
files, load them with `loadScenario`, require
`validateScenarioShape(scenario, filename)` to return `[]`, and require unique
IDs.

~~~bash
node --test tests/hunter/relationship-scenarios.test.mjs
~~~

Expected: six subtests PASS.

- [ ] **Step 4: Capture fresh-agent RED behavior**

Run `05-ambiguous-identities`, `05-warm-path`, and
`05-outreach-draft` in zero-context agents (`fork_turns: "none"`) with the
Plan 4 skill but no relationship reference. Prohibit reading plans/spec/rubric
and hide expectations until output completes. Record at least one genuine
identity, graph, profile-context, or completion-state failure. Record
`plan_base_commit` from `git rev-parse HEAD` before any Plan 5 commit. The
verification file must contain exactly one column-one record in this
machine-readable form, using the observed 40-character lowercase hash:

~~~text
plan_base_commit: 0123456789abcdef0123456789abcdef01234567
~~~

- [ ] **Step 5: Commit RED inputs and evidence**

~~~bash
git add tests/hunter/fixtures/workflows/relationships \
  tests/hunter/scenarios/05-*.yaml \
  tests/hunter/relationship-scenarios.test.mjs \
  docs/superpowers/verification/2026-07-22-hunter-05-relationships.md
git commit -m "test: define Hunter relationship pressure scenarios"
~~~

### Task 2: Write failing deterministic relationship tests

**Files:**
- Create: `tests/hunter/relationships.test.mjs`

- [ ] **Step 1: Add the missing-route test**

Assert `SKILL.md` directly links `references/relationships.md`. Assert the reference contains identity/deduplication, `profile_contexts`, flexible tags, related relationship IDs, warm paths, source time, `profile.artifacts`, root activities/tasks, draft-not-sent behavior, and valid transition rules.

- [ ] **Step 2: Add a local extension checker**

Inside the test module, implement:

~~~js
validateRelationshipExtensions(state)
// [] | [{ code, path, message }]
~~~

It checks that profile-context keys belong to `profile_ids`; optional relationship/opportunity/pursuit/artifact/task IDs resolve; relationship↔artifact links are reciprocal; activities/tasks with relationship IDs resolve; and `last_activity_id` resolves to the same relationship.

For each relationship-level `opportunity_id`, the opportunity must share at
least one profile with the relationship. For each `pursuit_id`, the pursuit’s
profile must appear in the relationship’s `profile_ids`, and its opportunity
must satisfy that same shared-profile rule.

It also enforces profile ownership: each entry in
`profile_contexts.<profile_id>.artifact_ids` belongs to that same profile;
each entry in its `task_ids` resolves to a task with that `profile_id`; every activity/task linked to a
relationship has a `profile_id` present in the relationship’s `profile_ids`;
and `last_activity_id` matches both the relationship and, when the activity
has a profile, one of the linked profiles.

- [ ] **Step 3: Add valid research and draft transitions**

Research transition:

- add one fictional organization and one fictional person at revision 1;
- link them through `related_relationship_ids`;
- add Alpha-only `profile_contexts` and example.com sources;
- increment root once; leave both profile records unchanged; and
- pass Plan 1 object/transition checks plus the extension checker.

Draft transition:

- add an introduction artifact under Alpha and reciprocal relationship link;
- add `Draft ready` but not `Contacted`;
- create one pending review/follow-up task;
- increment artifact/profile/relationship/root records exactly once; and
- leave Beta deep-equal.

- [ ] **Step 4: Add confirmed-interaction and invalid-context tests**

A user-confirmed interaction increments the changed relationship once and the
changed preparation task once, creates one interaction activity at revision 1
and one follow-up task at revision 1 with a fixture-fixed RFC 3339 `due_at`,
increments root once, and leaves profiles and unrelated records unchanged. It
advances the relationship to `Contacted` only from the confirmed interaction.

For an extension where `profile_contexts.profile-beta` is absent from
`profile_ids`, assert Plan 1 structural validation remains valid and the
workflow checker owns the failure:

~~~js
assert.equal(validateStateObject(state).valid, true);
assert.equal(
  validateRelationshipExtensions(state)[0].code,
  "profile_context_not_linked",
);
~~~

Add one invalid case for each ownership rule: an Alpha context pointing to a
Beta artifact, an Alpha context pointing to a Beta task, a Beta activity on an
Alpha-only relationship, and a `last_activity_id` whose relationship or
profile differs. Also reject an Alpha-only relationship linked to a Beta-only
opportunity or pursuit. Require stable, field-specific diagnostics.

- [ ] **Step 5: Run RED and commit**

~~~bash
node --test tests/hunter/relationships.test.mjs
~~~

Expected: FAIL with `ENOENT` for `references/relationships.md`.

~~~bash
git add tests/hunter/relationships.test.mjs
git commit -m "test: specify Hunter relationship state behavior"
~~~

### Task 3: Implement research, identity, graph, and follow-up behavior

**Files:**
- Create: `plugins/hunter/skills/hunter/references/relationships.md`
- Modify: `plugins/hunter/skills/hunter/SKILL.md`
- Modify: `tests/hunter/package.test.mjs`

- [ ] **Step 1: Re-run one RED case**

Confirm `05-ambiguous-identities` or `05-outreach-draft` still exhibits the recorded baseline gap immediately before editing.

- [ ] **Step 2: Implement the relationship procedure**

1. Resolve active profile and goal.
2. Inspect existing relationship, opportunity, pursuit, activity, task, and artifact context.
3. Use strongest relevant browser/search/file/email/calendar/repository reads.
4. Normalize each useful person, organization, staffing firm, client, referral, or community record.
5. Retain source links and retrieval time for current research.
6. Deduplicate only canonical profile/contact/organization identity matches; keep ambiguous same names separate and link possible duplicates.
7. Build graph edges, profile-specific context, warm-path reasoning, and next steps.
8. Use the document workflow for introductions/outreach/follow-ups.
9. Save only requested valid transitions and return receipts/gaps/next action.

- [ ] **Step 3: Implement flexible states and evidence boundaries**

Allowed example tags include `Identified`, `Researched`, `Draft ready`, `Contacted`, `Engaged`, `Opportunity introduced`, `Follow-up due`, `Dormant`, and `Closed`. They are not a mandatory funnel.

A draft can establish `Draft ready`, never `Contacted`. `Contacted` requires user confirmation or an actual observable interaction. A warm path distinguishes observed links from inferred possibilities. Never invent an email, identity, source, connection path, or interaction.

- [ ] **Step 4: Implement state placement**

- Profile-specific notes/tags/artifact/task IDs live under `profile_contexts.<profile_id>`.
- Outreach artifacts remain under the owning `profile.artifacts` and link reciprocally.
- Actual interactions are root activities.
- Follow-ups are root tasks.
- New records start at revision 1; every changed record and root increment exactly once; all IDs resolve.

Add one direct relationship route to `SKILL.md` without copying the procedure.
Set its intermediate frontmatter description exactly to:

~~~yaml
description: Use when a user wants to manage career profiles, opportunities, or career documents, research recruiters, contacts, firms, connections, or warm paths, prepare outreach or follow-ups, or continue from hunter-state.yaml.
~~~

Do not yet add pipeline/interview/offer triggers.
Update `package.test.mjs` to expect this exact intermediate description.

- [ ] **Step 5: Run GREEN and official validation**

~~~bash
node --test tests/hunter/relationships.test.mjs
npm test
python3 /root/.codex/skills/oai/skill-creator/scripts/quick_validate.py \
  plugins/hunter/skills/hunter
python3 /root/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  plugins/hunter
~~~

Expected: all pass.

- [ ] **Step 6: Commit**

~~~bash
git add plugins/hunter/skills/hunter/SKILL.md \
  plugins/hunter/skills/hunter/references/relationships.md \
  tests/hunter/package.test.mjs
git commit -m "feat: add Hunter relationship workflow"
~~~

### Task 4: Run GREEN relationship qualification

**Files:**
- Modify: `docs/superpowers/verification/2026-07-22-hunter-05-relationships.md`
- Modify only for observed gaps: the relationship reference or route

- [ ] **Step 1: Run all six scenarios in fresh agents**

Record actual capabilities/sources, identity decisions, graph path basis, generated artifact receipt, activities/tasks, state validation, every required/forbidden criterion, and PASS/FAIL.

Full cases require actual tool receipts. Reduced cases must run where stronger
capabilities are genuinely absent or return a real controlled failure;
otherwise record `blocked`.

- [ ] **Step 2: Refactor only observed general gaps**

Apply the smallest change, rerun the failed case, then rerun all six. Do not add portal-specific rules or fixture names.

- [ ] **Step 3: Run the complete gate**

~~~bash
npm ci
npm run test:state
node --test tests/hunter/document-assets.test.mjs \
  tests/hunter/relationships.test.mjs
npm test
npm run validate:state -- \
  plugins/hunter/skills/hunter/assets/hunter-state.template.yaml
python3 /root/.codex/skills/oai/skill-creator/scripts/quick_validate.py \
  plugins/hunter/skills/hunter
python3 /root/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  plugins/hunter
git diff --check
~~~

Expected: zero failures.

- [ ] **Step 4: Confirm the frozen schema stayed untouched**

~~~bash
mapfile -t bases < <(sed -n 's/^plan_base_commit: //p' \
  docs/superpowers/verification/2026-07-22-hunter-05-relationships.md)
test "${#bases[@]}" -eq 1
base="${bases[0]}"
[[ "$base" =~ ^[0-9a-f]{40}$ ]]
git cat-file -e "$base^{commit}"
git diff --exit-code "$base"..HEAD -- \
  plugins/hunter/skills/hunter/schemas/hunter-state.schema.json
~~~

Expected: exit 0 with no diff.

- [ ] **Step 5: Commit GREEN evidence**

~~~bash
git add docs/superpowers/verification/2026-07-22-hunter-05-relationships.md \
  plugins/hunter/skills/hunter/SKILL.md \
  plugins/hunter/skills/hunter/references/relationships.md
git commit -m "test: qualify Hunter relationships"
~~~

## Plan Gate

Do not start Plan 6 until all six scenarios are GREEN; person/organization/profile-context/graph/activity/task/artifact transitions pass; ambiguous identities remain separate; warm paths distinguish evidence from inference; drafts never imply sending/contact; shared relationships preserve isolated profile context; no fabricated source or identity appears; the frozen schema is untouched; all validators pass; and `git status --short` is empty.
