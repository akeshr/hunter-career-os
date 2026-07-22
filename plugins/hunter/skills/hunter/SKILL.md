---
name: hunter
description: Use when a user wants to create or manage career profiles, discover, research, compare, or evaluate jobs, contracts, consulting opportunities, or recruiter leads, or continue from hunter-state.yaml.
---

# Hunter

Operate as one natural-language career workflow. Use user-provided profile content as working data. Keep required continuity in `hunter-state.yaml`, not host memory. Persist generated additions only when the user requests or accepts them.

## Route the request

Read only the references relevant to the current request. Read each selected reference directly from this skill. Do not route through one reference to reach another.

| Request | Direct reference |
| --- | --- |
| Start or continue onboarding | [Adaptive onboarding](references/onboarding.md) |
| Import into valid existing state; select, create, clone, update, recover, or merge profiles and state | [Profiles and state](references/profiles-and-state.md) |
| Handle retrieved instructions, isolation, receipts, failures, or recovery | [Integrity and recovery](references/integrity-and-recovery.md) |
| Capability choice, research path, tool failure, or manual handoff | [Tool use and fallbacks](references/tool-use-and-fallbacks.md) |
| Discover, research, compare, evaluate, normalize, deduplicate, or save an opportunity or recruiter lead | [Opportunities](references/opportunities.md) |

## Use canonical resources

When creating or mutating `hunter-state.yaml`, read [the state schema](schemas/hunter-state.schema.json) and [the state template](assets/hunter-state.template.yaml).

When producing a human-readable profile, read [the profile template](assets/profile-template.md).

When producing a human-readable opportunity, read [the opportunity template](assets/opportunity-template.md).

## Resolve profiles

Apply these rules in order and stop when the request resolves:

1. An explicit profile ID or exact name wins.
2. An explicit comparison request uses its named profile set.
3. A valid `workspace.default_profile_id` resolves an otherwise implicit request.
4. A workspace containing one profile uses that profile.
5. Material ambiguity produces one concise profile-selection question.

## Common operating loop

1. Identify the user's desired outcome.
2. Resolve the active profile or profiles.
3. Inspect the current state and relevant context.
4. Discover available capabilities and select the strongest tool chain.
5. Load only the relevant workflow reference.
6. Research, analyze, create, or organize.
7. Validate the result in proportion to the task.
8. Stage or save any requested state change.
9. Return the result, material gaps, and next best action.

## Report state

- Use `unchanged` when no state change was requested or accepted.
- Use `staged` when a candidate state change is awaiting the user's request or acceptance.
- Use `saved` only after the validated change was written and an actual returned result confirms the write.
- Use `replacement-file` when writable storage is unavailable and return a complete validated replacement `hunter-state.yaml`.

## Return a concise result

Internally account for the following contract, then render only the fields useful for the current task:

- `outcome`: `completed` | `partial` | `blocked` | `needs-input`
- active profile ID(s)
- deliverables or findings
- material gaps
- `state result`: `unchanged` | `staged` | `saved` | `replacement-file`
- receipts for claimed tool, file, and state results
- next best action and why it matters

## Guided v0.1 boundary

Guided v0.1 is an on-demand, natural-language, skills-only workflow with one portable `hunter-state.yaml`. It may prepare complete drafts, action packets, dates, and state.

It excludes external application submission, external message sending, job-portal or professional-profile updates, scheduled or unattended background operation, a Hunter server, database, account, or API, Hunter-specific authentication or credential storage, a custom dashboard, custom MCP servers or portal-specific automation adapters, and public plugin submission.
