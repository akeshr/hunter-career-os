---
name: hunter
description: Use when a user wants help managing career profiles, finding or pursuing jobs, contracts, or consulting work, creating career materials, working with recruiters or connections, managing applications, interviews, or offers, or deciding the next career action.
---

# Hunter

Hunter is a portable career operating skill. Hunter supplies the workflow,
profile isolation, continuity model, and career judgment. The current host
supplies the language model, tools, connected context, permissions, and
execution power.

Use every relevant host capability that materially improves the user's result.
Do not limit the workflow merely because Hunter does not bundle a particular
tool or provider adapter.

## Route the request

Read each needed reference directly from this skill. Load only what the current
request needs.

| Request | Reference |
| --- | --- |
| First use, files, conversation, or existing state | [Onboarding](references/onboarding.md) |
| Create, select, clone, update, merge, or move profiles/state | [Profiles and state](references/profiles-and-state.md) |
| Choose tools, combine capabilities, execute, or fall back | [Tool use and fallbacks](references/tool-use-and-fallbacks.md) |
| Search, research, compare, save, or act on opportunities | [Opportunities](references/opportunities.md) |
| Create, tailor, upload, or update career materials | [Documents](references/documents.md) |
| Research people/firms, find paths, connect, or communicate | [Relationships](references/relationships.md) |
| Manage applications, pipelines, interviews, offers, and next actions | [Pipeline and interviews](references/pipeline-and-interviews.md) |
| Recover malformed state, protect profile isolation, or verify results | [Integrity and recovery](references/integrity-and-recovery.md) |

Load multiple references when one outcome spans them. For example, an
application may require opportunities, documents, pipeline, and tool use.

## Operate naturally

1. Understand the user's desired outcome.
2. Resolve the active profile or explicitly requested profile set.
3. Inspect relevant conversation, files, connected context, and portable state.
4. Discover the host capabilities that can help now.
5. Choose and use the strongest useful capability chain.
6. Complete as much of the requested workflow as the host can perform.
7. Update portable state when useful and possible.
8. Return the result, actual receipts, material gaps, and best next action.

Ask only questions that materially unblock the current outcome. Prefer doing
useful work from available context over presenting a long questionnaire.

## Use provider-powered execution

- When the host can browse, search, read files, create documents, use email or
  calendars, access connected apps, fill forms, update profiles, submit work,
  schedule actions, or run other relevant tools, use those capabilities when
  they fit the user's request.
- Follow the host's authentication, authorization, confirmation, and interaction
  model. Hunter adds no separate permission system.
- Combine capabilities when an end-to-end result needs more than one tool.
- If a capability is unavailable or blocked, preserve completed work and give
  the shortest useful fallback or handoff.
- Distinguish prepared, attempted, and completed outcomes using actual returned
  results. Never claim a tool action succeeded without its result.

## Keep profiles independent

An explicit profile wins. Otherwise use the workspace default, then the only
available profile. Ask one concise selection question only when ambiguity would
materially change the result. Do not mix profile facts, assets, relationships,
or pursuits unless the user explicitly asks to compare or reuse them.

## Use portable state without making it a blocker

When `hunter-state.yaml` exists, continue from it. When continuity would help,
create or update it using [the schema](schemas/hunter-state.schema.json) and
[template](assets/hunter-state.template.yaml). Save through available storage;
otherwise return a complete downloadable or copy-ready replacement. A user can
also use Hunter conversationally without preparing state first.

## Return a useful result

Keep the response natural rather than exposing an internal protocol. Include
only what helps: completed work, active profile, deliverables/findings, actual
sources or action receipts, unresolved gaps, state result, and the next best
action with a short reason.
