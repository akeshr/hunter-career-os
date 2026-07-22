# Hunter 04: Document Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Hunter create, technically validate, deliver, and track profile-specific career assets without cross-profile leakage or false artifact completion.

**Architecture:** `references/documents.md` owns document workflow judgment while Plan 2’s `SKILL.md` remains the thin router. Host pressure scenarios verify tool choice and output behavior; deterministic Node tests verify that saved artifact metadata uses Plan 1’s frozen `profiles[profile_id].artifacts[]` contract and exact revisions.

**Tech Stack:** Agent Skills Markdown, generic YAML scenarios, host document/PDF/file capabilities, Node.js 20+ with `node:test`, and Plan 1 state tooling.

## Global Constraints

- Plans 1–3 and their gates must pass before this plan begins.
- Use `docs/superpowers/specs/2026-07-21-hunter-guided-v0.1-design.md` as the product contract.
- REQUIRED before skill edits: use `superpowers:test-driven-development`, `superpowers:writing-skills`, and `skill-creator`.
- Do not modify the frozen state schema or create a root artifact collection.
- Store artifact metadata only under the owning profile’s `artifacts[]`.
- Every saved artifact has exactly one `profile_id`. Opportunity, pursuit, and relationship links are optional.
- Use only the selected profile unless the user explicitly requests comparison or reuse.
- Use the strongest relevant artifact capability; fall back only after it is unavailable or fails.
- Never claim an editable, downloadable, saved, opened, or rendered file without its actual result.
- Never overwrite an imported original unless explicitly asked to replace it.
- Do not silently persist generated additions.
- Do not add profile/truth/policy modes, watermarks, proof requirements, external submission/messaging/profile updates, scheduling, Hunter infrastructure, or public submission.
- Installed skill instructions have no Node runtime dependency.
- Use generic fixtures, `apply_patch`, explicit `git add` paths, and focused commits.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `plugins/hunter/skills/hunter/references/documents.md` | Creation, validation, delivery, fallback, and artifact-state procedure |
| `plugins/hunter/skills/hunter/SKILL.md` | One direct document route |
| `tests/hunter/fixtures/workflows/documents/state-before.yaml` | Generic two-profile state |
| `tests/hunter/fixtures/workflows/documents/source-resume.md` | Imported original |
| `tests/hunter/fixtures/workflows/documents/opportunity.md` | Target requirement fixture |
| `tests/hunter/scenarios/04-*.yaml` | Seven document pressure scenarios |
| `tests/hunter/document-scenarios.test.mjs` | Plan 2 scenario-contract checks |
| `tests/hunter/document-assets.test.mjs` | Routing and artifact-transition tests |
| `docs/superpowers/verification/2026-07-22-hunter-04-documents.md` | RED/GREEN host-run evidence |

## Artifact Extension Contract

Plan 1 fields remain authoritative. Optional artifact fields may include:

~~~yaml
opportunity_id: opportunity-alpha
pursuit_id: pursuit-alpha
relationship_ids:
  - relationship-example
purpose: targeted-application
format: docx
source_artifact_ids: []
updated_at: "2026-07-22T10:30:00Z"
validation:
  structural: passed
  rendered: passed
  checked_at: "2026-07-22T10:30:00Z"
~~~

Only actual observed checks are recorded. `rendered: passed` requires inspection of a real render. These optional fields do not become schema requirements.

---

### Task 1: Define fixtures and capture RED document behavior

**Files:**
- Create: `tests/hunter/fixtures/workflows/documents/state-before.yaml`
- Create: `tests/hunter/fixtures/workflows/documents/source-resume.md`
- Create: `tests/hunter/fixtures/workflows/documents/opportunity.md`
- Create: `tests/hunter/scenarios/04-tailor-existing.yaml`
- Create: `tests/hunter/scenarios/04-create-from-scratch.yaml`
- Create: `tests/hunter/scenarios/04-letter-and-answers.yaml`
- Create: `tests/hunter/scenarios/04-proposal-and-introduction.yaml`
- Create: `tests/hunter/scenarios/04-copy-ready-fallback.yaml`
- Create: `tests/hunter/scenarios/04-profile-isolation.yaml`
- Create: `tests/hunter/scenarios/04-failed-artifact.yaml`
- Create: `tests/hunter/document-scenarios.test.mjs`
- Create: `docs/superpowers/verification/2026-07-22-hunter-04-documents.md`

- [ ] **Step 1: Create and validate the starting state**

Create `profile-alpha` as a generic transformation-program profile and `profile-beta` as a distinct clinical-product profile. Add `opportunity-alpha` for a transformation lead and link only Alpha. Both profiles have empty artifacts; all other root collections are valid.

~~~bash
node tests/hunter/support/validate-state-cli.mjs \
  tests/hunter/fixtures/workflows/documents/state-before.yaml
~~~

Expected: exit 0.

- [ ] **Step 2: Add generic source material**

`source-resume.md` contains only Alpha’s Example Logistics transformation work. `opportunity.md` requests multi-region change leadership, business/technology alignment, executive communication, a concise two-page resume, and short cover letter. Use only example.com URLs and fictional names.

- [ ] **Step 3: Write seven scenarios against the frozen Plan 2 contract**

| ID | Capability profile | Critical outcome |
| --- | --- | --- |
| `04-tailor-existing` | full | Editable targeted resume, real render inspection, original preserved |
| `04-create-from-scratch` | full | Resume without requiring an imported resume; saved artifact transition |
| `04-letter-and-answers` | full | Cover letter and application answers consistent with profile/opportunity |
| `04-proposal-and-introduction` | full | Contract proposal plus recruiter introduction, prepared but not sent |
| `04-copy-ready-fallback` | reduced | Complete structured content; explicitly no downloadable artifact |
| `04-profile-isolation` | reduced | Alpha output contains no Beta-only phrase or facts |
| `04-failed-artifact` | full | Useful draft preserved; failed file never marked available or rendered |

State assertions require exact revisions, artifact ownership, valid references, original preservation, and no state mutation unless saving is requested.

Every file uses `workflow: documents`, an ID equal to its filename, and
`fixtures[]` paths beginning `../fixtures/`. Use this complete canonical case:

~~~yaml
id: 04-profile-isolation
title: Keep an explicitly selected profile isolated in document output
workflow: documents
capability_profile: reduced
capabilities:
  available:
    - files.read
    - structured-text.write
    - state.read
  unavailable:
    - document.create
    - document.render
  failures: []
fixtures:
  - ../fixtures/workflows/documents/state-before.yaml
prompt: |
  Write a professional summary for Profile Alpha. The workspace also
  contains Profile Beta, but I did not ask for comparison or reuse.
expected:
  must:
    - Uses the Alpha transformation-program material.
    - Returns complete copy-ready summary text.
  must_not:
    - Uses the Beta clinical-product phrase or facts.
    - Asks for profile selection when Profile Alpha is explicit.
  state:
    - Makes no state change unless saving is separately requested.
~~~

- [ ] **Step 4: Validate scenario structure before committing it**

Create `document-scenarios.test.mjs`. Enumerate exactly the seven `04-*.yaml`
files, load each through `loadScenario`, require
`validateScenarioShape(scenario, filename)` to return `[]`, and require unique
IDs.

~~~bash
node --test tests/hunter/document-scenarios.test.mjs
~~~

Expected: seven subtests PASS.

- [ ] **Step 5: Capture the skill-TDD RED baseline**

Run at least `04-tailor-existing`, `04-copy-ready-fallback`, and `04-failed-artifact` with fresh agents using the Plan 3 skill but no document reference. Hide the rubric until after output. Record genuine failures in tool selection, render/receipt behavior, fallback completeness, or state metadata.
Record `plan_base_commit` from `git rev-parse HEAD` before any Plan 4 commit.
The verification file must contain exactly one column-one record in this
machine-readable form, using the observed 40-character lowercase hash:

~~~text
plan_base_commit: 0123456789abcdef0123456789abcdef01234567
~~~

- [ ] **Step 6: Commit RED inputs and evidence**

~~~bash
git add tests/hunter/fixtures/workflows/documents \
  tests/hunter/scenarios/04-*.yaml \
  tests/hunter/document-scenarios.test.mjs \
  docs/superpowers/verification/2026-07-22-hunter-04-documents.md
git commit -m "test: define Hunter document pressure scenarios"
~~~

### Task 2: Write failing routing and artifact-transition tests

**Files:**
- Create: `tests/hunter/document-assets.test.mjs`

- [ ] **Step 1: Add the missing-reference test**

Read `SKILL.md` and `references/documents.md`. Assert a direct route and these concepts: selected profile, imported original, strongest available, editable artifact, copy-ready fallback, actual tool result, structural validation, rendered inspection, cross-profile isolation, and `profile.artifacts`.

- [ ] **Step 2: Add an artifact-extension checker**

Implement inside the test:

~~~js
validateArtifactExtensions(state, {
  availableArtifactIds = new Set(),
  renderedArtifactIds = new Set(),
} = {})
// [] | [{ code, path, message }]
~~~

It verifies optional opportunity IDs exist and include the artifact’s owning
profile in `opportunity.profile_ids`; pursuit IDs exist, belong to the
artifact profile, and match the opportunity when both are present;
relationship IDs exist and include the profile where profile-linked; source
artifact IDs resolve inside the same owning profile; no artifact references
itself; and availability/filename/location/validation fields never claim a
result absent from the supplied test receipt sets.

- [ ] **Step 3: Add a valid artifact-creation transition test**

Load `state-before.yaml`, then:

1. increment root revision once;
2. increment `profile-alpha.record_revision` once;
3. add `artifact-profile-alpha-resume` at revision 1 under Alpha;
4. use `profile_id: profile-alpha`, `type: resume`, an RFC 3339 `created_at`, `availability: available`, a generic filename/location, `opportunity_id: opportunity-alpha`, and only actually supported validation fields;
5. leave Profile Beta and every unrelated record deep-equal to before; and
6. assert object, transition, and artifact-extension validation all pass.

- [ ] **Step 4: Add update, batch, and invalid-ownership tests**

An update preserves artifact ID, increments artifact/profile/root exactly once, changes only requested metadata, and validates. A fixture placing an Alpha-owned artifact under Beta and a fixture linking an Alpha artifact to a Beta-only opportunity must each fail with stable ownership diagnostics.

A single saved transition creating a cover letter plus application answers
increments root once and Alpha once, regardless of artifact count; each new
artifact starts at revision 1.

- [ ] **Step 5: Run RED**

~~~bash
node --test tests/hunter/document-assets.test.mjs
~~~

Expected: FAIL with `ENOENT` for `references/documents.md`.

- [ ] **Step 6: Commit the test**

~~~bash
git add tests/hunter/document-assets.test.mjs
git commit -m "test: specify Hunter artifact state behavior"
~~~

### Task 3: Implement document creation, validation, and fallback

**Files:**
- Create: `plugins/hunter/skills/hunter/references/documents.md`
- Modify: `plugins/hunter/skills/hunter/SKILL.md`
- Modify: `tests/hunter/package.test.mjs`

- [ ] **Step 1: Re-run RED immediately before editing**

Run the deterministic test and one fresh `04-failed-artifact` case. Confirm the previously observed gap still exists.

- [ ] **Step 2: Implement the document reference**

It directly covers:

- resumes and professional summaries;
- cover letters and application answers;
- profile copy and biographies;
- recruiter introductions and outreach;
- contract proposals and capability statements;
- interview story banks and preparation briefs; and
- follow-up and negotiation drafts.

The required procedure is:

1. resolve one active profile unless comparison/reuse is explicit;
2. resolve supplied opportunity, pursuit, and relationship context;
3. inspect relevant source material and available artifact capabilities;
4. choose editable creation plus render, editable plus structural checks, or complete copy-ready text;
5. create/revise from the selected profile and user instruction;
6. validate internal dates/titles/names/links, target coverage, profile isolation, requested format/length, grammar/clarity, ATS readability, file openability, and real render quality when available;
7. return actual artifact/text and receipts;
8. save metadata only when requested/accepted and backed by a result; and
9. validate object plus transition before claiming a state save.

- [ ] **Step 3: Specify original and failure behavior**

- Never overwrite an imported source unless replacement is explicit.
- Direct from-scratch creation does not require an existing resume.
- Content completion and file completion are distinct.
- If editable creation fails, return the full useful draft, exact failed capability, and shortest manual handoff.
- Never invent a path, link, availability, opened state, or render result.
- A suggested profile addition is used in the current requested asset but saved as profile data only on request/acceptance.

- [ ] **Step 4: Specify artifact writes**

New artifact: stable ID; revision 1; owning profile; type/time/availability; filename or location; known optional links; owning profile/root revisions each +1. Updated artifact: stable ID preserved; artifact/profile/root revisions each +1. Unrelated profiles remain unchanged.

One saved transition increments the root and each changed profile exactly
once, regardless of how many artifacts that transaction creates or updates.
`availability` describes the observed current host/session location. Creation
does not imply the artifact will be available in another chat or host; record
portable/external availability only when that location is actually durable and
observable.

Add one direct document route to `SKILL.md` without copying the procedure.
Set its intermediate frontmatter description exactly to:

~~~yaml
description: Use when a user wants to manage career profiles, discover or evaluate jobs, contracts, consulting opportunities, or recruiter leads, create resumes, cover letters, application answers, profile copy, proposals, or outreach drafts, or continue from hunter-state.yaml.
~~~

Do not yet add relationship, pipeline, interview, or offer triggers.
Update `package.test.mjs` to expect this exact intermediate description.

- [ ] **Step 5: Run GREEN and official validation**

~~~bash
node --test tests/hunter/document-assets.test.mjs
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
  plugins/hunter/skills/hunter/references/documents.md \
  tests/hunter/package.test.mjs
git commit -m "feat: add Hunter document asset workflow"
~~~

### Task 4: Run GREEN artifact and fallback qualification

**Files:**
- Modify: `docs/superpowers/verification/2026-07-22-hunter-04-documents.md`
- Modify only if an observed gap requires it: `references/documents.md` or its route

- [ ] **Step 1: Run all seven fresh-agent scenarios**

Record host/capabilities, actual tools, output file receipt, structural check, rendered inspection when applicable, state transition result, required/forbidden behaviors, and PASS/FAIL. Use appropriate host document/PDF inspection capabilities rather than treating generation as inspection.

Full cases require real tool receipts. Reduced cases must run where the
stronger capability is genuinely absent or returns a real controlled failure.
Instructing a capable agent to pretend a tool is absent is not evidence;
record `blocked` when no suitable host/failure path exists.

- [ ] **Step 2: Refactor only observed general gaps**

Make the smallest reference/route change, rerun the failed case, then rerun all seven. Never encode fixture-specific wording.

- [ ] **Step 3: Run the complete deterministic gate**

~~~bash
npm ci
npm run test:state
node --test tests/hunter/document-assets.test.mjs
npm test
node tests/hunter/support/validate-state-cli.mjs \
  plugins/hunter/skills/hunter/assets/hunter-state.template.yaml
python3 /root/.codex/skills/oai/skill-creator/scripts/quick_validate.py \
  plugins/hunter/skills/hunter
python3 /root/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  plugins/hunter
git diff --check
~~~

Expected: zero failures.

- [ ] **Step 4: Confirm the schema stayed frozen**

~~~bash
mapfile -t bases < <(sed -n 's/^plan_base_commit: //p' \
  docs/superpowers/verification/2026-07-22-hunter-04-documents.md)
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
git add docs/superpowers/verification/2026-07-22-hunter-04-documents.md \
  plugins/hunter/skills/hunter/SKILL.md \
  plugins/hunter/skills/hunter/references/documents.md
git commit -m "test: qualify Hunter document assets"
~~~

## Plan Gate

Do not start Plan 5 until all seven scenarios are GREEN; both artifact-tool and copy-ready paths are useful; created files actually open and rendered outputs are inspected when applicable; artifact creation/update transitions pass; invalid ownership is rejected; imported originals are preserved; cross-profile content does not leak; no artifact success is claimed without a result; the frozen schema is untouched; all validators pass; and `git status --short` is empty.
