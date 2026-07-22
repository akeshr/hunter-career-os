# Hunter 06: Pipeline, Interviews, and Next Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add profile-specific pursuits, nonlinear lifecycle events, pipeline views, interview and offer preparation, tasks, and explainable next-best-action ranking.

**Architecture:** One directly linked `pipeline-and-interviews.md` reference owns workflow judgment. A repository-only pure helper derives the current pursuit view from frozen Plan 1 activity records; it adds no installed runtime dependency. Opportunities remain external work records while each pursuit represents one profile’s attempt to develop one opportunity.

**Tech Stack:** Agent Skills Markdown, generic YAML scenarios, Node.js 20+ with `node:test`, Plan 1 state tooling, host email/calendar/browser/document capabilities, and fresh-agent behavioral evaluation.

## Global Constraints

- Plans 1–5 and their gates must pass before this plan begins.
- Use `docs/superpowers/specs/2026-07-21-hunter-guided-v0.1-design.md` as the product contract.
- REQUIRED before skill edits: use `superpowers:test-driven-development`, `superpowers:writing-skills`, and `skill-creator`.
- Do not reshape the state schema. Pursuit events remain mutable activity records in the current snapshot, not an append-only audit log.
- Every pursuit retains one `profile_id` and one `opportunity_id`; several profiles may have separate pursuits for the same opportunity.
- Record applied/sent/completed/accepted/rejected only from user input or an actual tool result.
- Load only the selected profile unless comparison is explicit.
- Use relevant email/calendar/company/contact context when available and fall back honestly.
- Guided v0.1 surfaces due work when invoked; it does not schedule or execute unattended actions.
- Do not add external apply/send/profile updates, portal automation, Hunter infrastructure, policy/truth/profile modes, or public submission.
- Use generic fixtures, `apply_patch`, explicit `git add` paths, and focused commits.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `plugins/hunter/skills/hunter/references/pipeline-and-interviews.md` | Pursuits, pipeline, interviews, offers, tasks, and next actions |
| `plugins/hunter/skills/hunter/assets/pipeline-template.md` | Portable pipeline view |
| `plugins/hunter/skills/hunter/SKILL.md` | One direct route |
| `tools/hunter-state/pursuit-view.mjs` | Repository-only deterministic derived-stage helper |
| `tools/hunter-state/next-actions.mjs` | Repository-only deterministic action ordering |
| `tests/hunter/fixtures/workflows/pipeline/state-before.yaml` | Generic nonlinear pipeline |
| `tests/hunter/scenarios/06-*.yaml` | Eight pressure scenarios |
| `tests/hunter/pipeline-scenarios.test.mjs` | Plan 2 scenario-contract checks |
| `tests/hunter/pipeline.test.mjs` | Derived view, transition, routing, and ranking tests |
| `docs/superpowers/verification/2026-07-22-hunter-06-pipeline.md` | RED/GREEN host-run evidence |

## Locked Derived-View Interface

~~~js
derivePursuitView(state, pursuitId)
// {
//   valid: true,
//   pursuit_id,
//   profile_id,
//   opportunity_id,
//   current_stage,
//   effective_activity_id,
//   timeline
// }
// | { valid: false, errors: [{ code, path, message }] }

rankNextActions(state, { profileId, asOf, limit = 5 })
// {
//   valid: true,
//   actions: [{
//     source_type,
//     source_id,
//     task_id, // string for task candidates; null for synthesized activity/pursuit candidates
//     category,
//     title,
//     due_at,
//     reasons,
//     hunter_can_prepare,
//     user_input_needed
//   }]
// }
// | { valid: false, errors: [{ code, path, message }] }
~~~

An effective stage activity:

- is present in the pursuit’s `event_ids`;
- resolves to a root activity referencing the same pursuit/profile;
- has `type: pursuit-stage`; and
- has `details.stage` in the approved stage set.

Sort effective activities by numeric `Date.parse(occurred_at)` ascending, then
activity ID by JavaScript code-unit order ascending. The final entry determines
`current_stage` and `effective_activity_id`. `timeline` is the ordered array
`{ activity_id, occurred_at, stage }[]`. With no stage entry, return
`current_stage: unknown` and `effective_activity_id: null`.

Approved stages are `discovered`, `evaluated`, `shortlisted`, `draft-prepared`, `ready`, `applied`, `response-received`, `follow-up-prepared`, `follow-up-sent`, `interview-scheduled`, `interview-completed`, `offer-received`, `negotiation-started`, `accepted`, `rejected`, `withdrawn`, `paused`, `reopened`, and `closed`.

## Pipeline Extension Contract

These are optional additional-field semantics, not schema changes:

~~~yaml
pursuit:
  priority: high
  channel: direct-company
  waiting_on: employer
  blockers:
    - portfolio-update
  relationship_ids:
    - relationship-example
stage_activity:
  type: pursuit-stage
  details:
    stage: interview-scheduled
    scheduled_for: "2026-08-01T09:00:00Z"
task:
  profile_id: profile-alpha
  opportunity_id: opportunity-alpha
  pursuit_id: pursuit-alpha
  relationship_id: relationship-example
  activity_id: activity-interview
  priority: high
  blocked_by: []
  due_at: "2026-07-31T17:00:00Z"
  action_kind: commitment
  relationship_leverage: high
  expected_value: high
  effort: small
  last_meaningful_activity_at: "2026-07-20T09:00:00Z"
  hunter_can_prepare: Draft the follow-up.
  user_input_needed: Confirm the preferred tone.
offer_context:
  terms: {}
  decision_due_at: "2026-08-03T17:00:00Z"
~~~

Offer context lives under the owning pursuit’s optional `offer` field.
`scheduled_for` lives in the relevant activity details. Filters and ranking
use only these names. `action_kind` is one of `deadline`, `commitment`,
`unblock`, `outreach`, `follow-up`, `value`, or `maintenance`;
`priority` is `urgent`, `high`, `normal`, or `low` on tasks and pursuits;
`relationship_leverage` and `expected_value` are `high`, `normal`, or `low`;
and `effort` is `small`, `medium`, or `large`. Ranking fields are optional;
missing fields fall through to the next applicable rule and ultimately
`maintenance`; missing `blocked_by` means an empty blocker list.

---

### Task 1: Define nonlinear pipeline fixtures and RED scenarios

**Files:**
- Create: `tests/hunter/fixtures/workflows/pipeline/state-before.yaml`
- Create: `tests/hunter/scenarios/06-separate-pursuits.yaml`
- Create: `tests/hunter/scenarios/06-nonlinear-reopen.yaml`
- Create: `tests/hunter/scenarios/06-correct-delete-event.yaml`
- Create: `tests/hunter/scenarios/06-pipeline-filter.yaml`
- Create: `tests/hunter/scenarios/06-interview-context.yaml`
- Create: `tests/hunter/scenarios/06-offer-negotiation.yaml`
- Create: `tests/hunter/scenarios/06-next-best-action.yaml`
- Create: `tests/hunter/scenarios/06-calendar-fallback.yaml`
- Create: `tests/hunter/pipeline-scenarios.test.mjs`
- Create: `docs/superpowers/verification/2026-07-22-hunter-06-pipeline.md`

- [ ] **Step 1: Create and validate the pipeline fixture**

Use a fixed evaluation instant `2026-08-01T08:00:00Z`. Include two isolated
profiles, one opportunity evaluated by both, two distinct pursuits, mutable
stage activities, an interview at `2026-08-02T09:00:00Z`, an offer deadline
at `2026-08-04T17:00:00Z`, a follow-up due
`2026-07-31T12:00:00Z`, a high-value blocked pursuit task, and low-priority
research tasks. All timestamps are fixed RFC 3339 values and all records
validate.

~~~bash
npm run validate:state -- \
  tests/hunter/fixtures/workflows/pipeline/state-before.yaml
~~~

Expected: exit 0.

- [ ] **Step 2: Write eight one-file scenarios**

| ID | Capability profile | Critical outcome |
| --- | --- | --- |
| `06-separate-pursuits` | reduced | Same opportunity, separate Alpha/Beta pursuits and notes |
| `06-nonlinear-reopen` | reduced | Paused then reopened; prepared follow-up is not sent |
| `06-correct-delete-event` | reduced | User correction/deletion updates mutable snapshot and derived view |
| `06-pipeline-filter` | reduced | Filters by profile/stage/deadline/waiting party/last activity |
| `06-interview-context` | full | Uses profile/opportunity/company/contact/email/calendar context; no other profile stories |
| `06-offer-negotiation` | full | Compares observed terms and prepares clarification/negotiation drafts |
| `06-next-best-action` | reduced | Short ordered list; first action has explicit “why now” |
| `06-calendar-fallback` | reduced | Uses state plus user update; never invents calendar results |

State assertions require valid transitions, exact revisions, supported events only, and no state mutation for a read-only next-action request.

Every file uses `workflow: pipeline-and-interviews`, an ID equal to its
filename, `fixtures[]` paths beginning `../fixtures/`, and explicit
capabilities. Every prompt involving “tomorrow,” “overdue,” or deadline order
states `as_of: 2026-08-01T08:00:00Z` and evaluates relative time from that
instant.

Use this complete canonical nonlinear case:

~~~yaml
id: 06-nonlinear-reopen
title: Reopen a paused pursuit without claiming prepared work was sent
workflow: pipeline-and-interviews
capability_profile: reduced
capabilities:
  available:
    - files.read
    - state.read
    - state.write
  unavailable:
    - email.read
    - calendar.read
  failures: []
fixtures:
  - ../fixtures/workflows/pipeline/state-before.yaml
prompt: |
  as_of: 2026-08-01T08:00:00Z
  For Profile Alpha, record that the paused pursuit has reopened and that a
  follow-up draft is ready. Record reopened at 2026-08-01T08:05:00Z and
  follow-up-prepared at 2026-08-01T08:10:00Z. Show the current view and save
  the smallest valid state change. Do not mark the follow-up sent.
expected:
  must:
    - Adds a reopened stage activity and a follow-up-prepared stage activity.
    - Derives the current stage from the later effective event.
  must_not:
    - Adds a follow-up-sent event.
    - Modifies Profile Beta or its pursuit.
  state:
    - Reopened is 2026-08-01T08:05:00Z and follow-up-prepared is 2026-08-01T08:10:00Z.
    - New activities start at revision 1; pursuit and root increment once.
    - The resulting state and transition validate.
~~~

- [ ] **Step 3: Validate scenario structure**

Create `pipeline-scenarios.test.mjs`. Enumerate exactly eight `06-*.yaml`
files, load them with `loadScenario`, require
`validateScenarioShape(scenario, filename)` to return `[]`, and require unique
IDs plus an `as_of` line in every time-relative prompt.

~~~bash
node --test tests/hunter/pipeline-scenarios.test.mjs
~~~

Expected: eight subtests PASS.

- [ ] **Step 4: Capture skill-TDD RED behavior**

Run `06-nonlinear-reopen`, `06-interview-context`, and
`06-next-best-action` in zero-context agents (`fork_turns: "none"`) using
Plan 5 Hunter but no pipeline reference. Prohibit reading plans/spec/rubric
and hide expectations until output completes. Record a genuine linear-status,
false-completion, profile-context, capability, or ranking failure. Record
`plan_base_commit` from `git rev-parse HEAD` before any Plan 6 commit. The
verification file must contain exactly one column-one record in this
machine-readable form, using the observed 40-character lowercase hash:

~~~text
plan_base_commit: 0123456789abcdef0123456789abcdef01234567
~~~

- [ ] **Step 5: Commit RED inputs and evidence**

~~~bash
git add tests/hunter/fixtures/workflows/pipeline \
  tests/hunter/scenarios/06-*.yaml \
  tests/hunter/pipeline-scenarios.test.mjs \
  docs/superpowers/verification/2026-07-22-hunter-06-pipeline.md
git commit -m "test: define Hunter pipeline pressure scenarios"
~~~

### Task 2: Implement deterministic pursuit views and action ordering

**Files:**
- Create: `tools/hunter-state/pursuit-view.mjs`
- Create: `tools/hunter-state/next-actions.mjs`
- Create: `tests/hunter/pipeline.test.mjs`

- [ ] **Step 1: Write failing derivation tests**

Cover:

- unknown stage with no effective activity;
- latest timestamp wins;
- stable ID breaks equal-time ties;
- paused then reopened yields `reopened`;
- correction to an activity updates the view after valid revisions;
- deletion from `event_ids` removes the event’s effect;
- missing/mismatched event IDs produce helper diagnostics;
- duplicate event IDs are rejected by Plan 1 validation before derivation;
- events for the other profile/pursuit never participate.

Also implement in the test module:

~~~js
validatePipelineExtensions(state)
// [] | [{ code, path, message }]
~~~

It checks Plan-6-owned fields only and ignores/preserves every unrelated
unknown extension. It validates optional relationship IDs; RFC 3339
scheduled/offer/deadline/ranking times; ranking enums; task
profile/opportunity/pursuit/relationship/activity ownership; stage-activity ownership;
and the locked meanings of Plan-6 fields when present. It never rejects an
unrelated unknown field merely because Plan 6 does not recognize it.

Every pursuit’s `profile_id` must appear in its opportunity’s `profile_ids`.

When an activity has both `pursuit_id` and optional `opportunity_id`, that
opportunity must equal the pursuit’s `opportunity_id`. Any relationship linked
from a pursuit, activity, or task must include the pursuit/task profile in its
`profile_ids`. Add negative tests for all three inconsistencies and a
transition test proving an unrelated unknown extension remains semantically
deep-equal.

- [ ] **Step 2: Run RED**

~~~bash
node --test tests/hunter/pipeline.test.mjs
~~~

Expected: `ERR_MODULE_NOT_FOUND` for the two new helpers.

- [ ] **Step 3: Implement the pure helper**

Do not mutate input. Validate state first, resolve the pursuit, normalize its
event IDs, validate activity ownership/type/stage, sort with the locked
`Date.parse`/ID algorithm, and return the exact interface. Use helper
diagnostic codes `unknown_pursuit`, `missing_event`, `event_ownership`, and
`invalid_stage`. Plan 1 owns duplicate-ID diagnostics.

- [ ] **Step 4: Add four exact transition tests**

1. Add reopened: new activity revision 1; pursuit +1; root +1.
2. Correct existing activity content: activity +1; root +1; pursuit unchanged.
3. Remove only an `event_id`: pursuit +1; root +1; activity unchanged.
4. Delete an activity record and its `event_id`: removed activity has no new
   revision; pursuit +1; root +1.

Every transition preserves unknown fields and validates.

- [ ] **Step 5: Write and implement deterministic action ranking**

Before implementation, assert an invalid profile/as-of fails; limit is honored;
tasks for other profiles are excluded; `Date.parse` handles time-zone offsets;
and the fixed fixture order follows the seven locked categories. Implement
`rankNextActions` without mutating state. Require a valid RFC 3339 `asOf` and
derive candidates exactly as follows:

1. every root task for the selected profile whose `status` is neither
   `completed` nor `cancelled` is a task candidate;
2. derive each pursuit’s current view and treat `accepted`, `rejected`,
   `withdrawn`, and `closed` as terminal for synthesized candidates;
3. for a nonterminal pursuit, its effective stage activity is an activity
   candidate only when `details.scheduled_for` is between `asOf - 24 hours`
   and `asOf + 7 days`, inclusive, and no open task references that activity
   through optional `activity_id`;
4. a nonterminal pursuit is an offer candidate only when
   `offer.decision_due_at` is between `asOf - 30 days` and `asOf + 7 days`,
   inclusive, and no open `deadline` task on that pursuit has the same
   `due_at` instant; and
5. a nonterminal high/urgent-priority pursuit with non-empty `blockers` is a
   pursuit candidate unless an open `action_kind: unblock` task references it.

Assign the first matching category in this exact order:

1. `scheduled-deadline`: a synthesized scheduled activity/offer candidate, or
   any task with `asOf <= due_at <= asOf + 48 hours`;
2. `overdue-commitment`: any unblocked task with `due_at < asOf`;
3. `unlock-blocker`: a synthesized blocked high-priority pursuit or an
   `unblock` task linked to a pursuit with non-empty blockers;
4. `leverage`: an `outreach` task with `relationship_leverage: high` and a
   valid relationship owned by the same profile;
5. `stale-followup`: a `follow-up` task whose
   `last_meaningful_activity_at <= asOf - 7 days`;
6. `value-effort`: a `value` task with `expected_value: high` and
   `effort: small`; and
7. `maintenance`: every remaining candidate.

Set candidate priority from the task, or from the owning pursuit for an
activity/pursuit candidate; missing priority means `normal`. Sort an explicit
`urgent` candidate before non-urgent candidates. Within the urgent and
non-urgent buckets sort category first, then priority (`high`, `normal`,
`low`; `urgent` is already bucketed), then the candidate’s due/scheduled
instant (missing means positive infinity), then `source_id` by JavaScript
code-unit order.
`source_type` is `task`, `activity`, or `pursuit`; `task_id` equals the task ID
for a task candidate and is null for a synthesized candidate. Construct
human-readable `reasons`, `hunter_can_prepare`, and `user_input_needed` only
from the source record and linked selected-profile records; never invent a
numeric score. Add one fixture candidate for every rule, plus duplicate-
suppression and missing-optional-field tests. Prove a terminal pursuit creates
no synthesized action, a year-distant event does not outrank current work, an
overdue offer inside the 30-day window remains visible, urgent priority
overrides the normal bucket, and a legacy task with only `due_at` still enters
the scheduled/overdue category without `action_kind`.

- [ ] **Step 6: Run GREEN and commit**

~~~bash
node --test tests/hunter/pipeline.test.mjs
git add tools/hunter-state/pursuit-view.mjs \
  tools/hunter-state/next-actions.mjs \
  tests/hunter/pipeline.test.mjs
git commit -m "feat: derive Hunter pursuit views"
~~~

### Task 3: Implement pipeline, interview, offer, and task workflows

**Files:**
- Create: `plugins/hunter/skills/hunter/references/pipeline-and-interviews.md`
- Create: `plugins/hunter/skills/hunter/assets/pipeline-template.md`
- Modify: `plugins/hunter/skills/hunter/SKILL.md`
- Modify: `tests/hunter/package.test.mjs`
- Modify: `tests/hunter/pipeline.test.mjs`

- [ ] **Step 1: Add failing route/content tests**

Assert a direct route, opportunity/pursuit separation, approved stages, locked derived-stage ordering, mutable correction/deletion, filter dimensions, interview outputs, offer comparison, task placement, ranking factors, “why now,” prepared-versus-completed distinction, and calendar fallback.

- [ ] **Step 2: Run RED**

Expected: `ENOENT` for `pipeline-and-interviews.md`.

- [ ] **Step 3: Implement pursuit and pipeline behavior**

Resolve profile → opportunity → profile-specific pursuit. Stage changes are root `pursuit-stage` activities linked through `event_ids`. Do not force a linear sequence. Preserve useful prior events; allow user correction, compaction, and deletion through valid mutable transitions.

Apply the Pipeline Extension Contract directly at runtime and in deterministic
fixtures: optional relationship IDs resolve; scheduled/offer/deadline/ranking
values parse and use locked enums; tasks belong to their declared
profile/pursuit; an activity’s optional opportunity matches its pursuit; every
linked relationship includes the owning profile; unrelated unknown extensions
remain preserved; and filter fields use only the locked names.

Pipeline views filter/group only as useful by profile, channel, derived stage, priority, deadline, organization, relationship, waiting party, blocker, and last activity. `pipeline-template.md` contains a compact table plus Immediate Deadlines, Blocked Pursuits, Follow-ups Due, and Next Best Action sections.

- [ ] **Step 4: Implement interview and offer behavior**

Interview outputs cover role/company/contact brief, likely themes/questions, selected profile stories/talking points, mock interview/feedback, interviewer/client questions, follow-up draft, and exact logistical gaps. Use only the selected profile.

Offer comparison covers observable scope, compensation/rate, engagement type, duration/stability, location/work mode, growth/value, relationship context, deadlines, contingencies, and unresolved terms. Never manufacture a missing term or mark an outcome without support.

- [ ] **Step 5: Implement tasks and next-best-action ordering**

Prepared and completed remain distinct. Root tasks identify one concrete action, profile, optional relationship/opportunity/pursuit, due time, blocker, and status.

Rank candidate actions in this lexicographic order:

1. immediate scheduled events and expiring deadlines;
2. overdue/time-sensitive unblocked commitments;
3. actions unlocking a blocked high-value pursuit;
4. profile relevance and relationship leverage;
5. time since meaningful activity;
6. expected value relative to effort; and
7. lower-priority research/maintenance.

Respect explicit user priority using the locked urgent bucket and within-
category tie-break. Return a short list. The first item states why it matters
now, what Hunter can prepare immediately, and what user input remains. Do not
present a universal numerical score.

- [ ] **Step 6: Add the direct route and run GREEN**

Add one direct pipeline/interview/offer/next-action route to `SKILL.md`.
Duplicate no lifecycle details there. Replace the intermediate frontmatter
description with the final full trigger description:

~~~yaml
description: Use when a user wants help creating or managing career profiles, finding or evaluating jobs, contracts, or consulting opportunities, researching recruiters or connections, generating resumes or outreach, tracking applications, interviews, or offers, or deciding the next career action.
~~~

Update `package.test.mjs` to expect this exact final description.

~~~bash
node --test tests/hunter/pipeline.test.mjs
npm test
python3 /root/.codex/skills/oai/skill-creator/scripts/quick_validate.py \
  plugins/hunter/skills/hunter
python3 /root/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  plugins/hunter
~~~

Expected: all pass.

- [ ] **Step 7: Commit**

~~~bash
git add plugins/hunter/skills/hunter/SKILL.md \
  plugins/hunter/skills/hunter/references/pipeline-and-interviews.md \
  plugins/hunter/skills/hunter/assets/pipeline-template.md \
  tests/hunter/package.test.mjs \
  tests/hunter/pipeline.test.mjs
git commit -m "feat: add Hunter pursuit and interview workflows"
~~~

### Task 4: Run GREEN pipeline qualification

**Files:**
- Modify: `docs/superpowers/verification/2026-07-22-hunter-06-pipeline.md`
- Modify only for observed gaps: pipeline reference or route

- [ ] **Step 1: Run all eight scenarios in fresh agents**

Record tools/context actually used, derived-stage result, state transition, profile-isolation check, interview/offer artifacts, ranking rationale, every required/forbidden criterion, and PASS/FAIL.

Full cases require actual email/calendar/browser/document receipts as declared.
Reduced cases must run where stronger capabilities are genuinely absent or
return a real controlled failure; otherwise record `blocked`.

- [ ] **Step 2: Refactor only observed general gaps**

Apply the smallest change, rerun the failed scenario, then rerun all eight. Never encode fixture names or assume a specific portal/calendar provider.

- [ ] **Step 3: Run the complete gate**

~~~bash
npm ci
npm run test:state
node --test tests/hunter/pipeline.test.mjs
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
  docs/superpowers/verification/2026-07-22-hunter-06-pipeline.md)
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
git add docs/superpowers/verification/2026-07-22-hunter-06-pipeline.md \
  plugins/hunter/skills/hunter/SKILL.md \
  plugins/hunter/skills/hunter/references/pipeline-and-interviews.md
git commit -m "test: qualify Hunter pipeline workflows"
~~~

## Plan Gate

Do not start Plan 7 until all eight scenarios are GREEN; separate-profile pursuits remain isolated; nonlinear/reopen/correct/delete derivation is deterministic; applied/sent/completed/outcome events have support; interview/offer content uses only the selected profile and observable terms; next actions are concise and explain “why now”; full-context and fallback paths are honest; no external execution occurs; all validators pass; and `git status --short` is empty.
