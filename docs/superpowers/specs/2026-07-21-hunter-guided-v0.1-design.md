# Hunter Guided v0.1 Design

| Field | Value |
| --- | --- |
| Document version | 0.1.0-review |
| Date | 2026-07-21 |
| Status | Written-spec review |
| Product | Hunter |
| First reference host | ChatGPT Work |
| Portable format | Agent Skills |
| Distribution | Skills-only plugin |
| License | Apache-2.0 |

## 1. Decision and scope

Hunter Guided v0.1 is the first implementation slice of Hunter. It is a
reusable, natural-language career workflow packaged as a portable Agent Skill
and distributed to ChatGPT Work through a thin skills-only plugin.

The slice proves one complete user journey before Hunter adds hosted services,
custom connectors, or external execution:

1. install Hunter;
2. create or import one or more profiles;
3. use available tools to discover and analyze opportunities;
4. generate a targeted application or relationship asset;
5. create and update a profile-specific pursuit;
6. receive a reasoned next-best action; and
7. continue later from portable state.

This specification is normative for Guided v0.1. The earlier umbrella
architecture is retained as historical product exploration and is not the
implementation contract for this slice.

### 1.1 Included

Guided v0.1 includes:

- adaptive onboarding from existing state, documents, or conversation;
- any number of fully isolated career profiles;
- automatic use of every relevant capability available in the host;
- opportunity discovery across employment, contract, consulting, recruiter,
  referral, community, and direct-company channels;
- profile-specific opportunity analysis and prioritization;
- resume, cover letter, application-answer, proposal, professional-summary,
  recruiter-introduction, and outreach creation;
- recruiter, staffing-firm, client, connection, and referral research;
- relationship tracking and follow-up planning;
- opportunity, pursuit, interview, offer, and task tracking;
- interview preparation, mock interviewing, and follow-up creation;
- next-best-action recommendations with concise reasoning;
- one portable `hunter-state.yaml` source of continuity;
- deterministic state and package validation in repository test tooling,
  plus runtime structural checks;
- graceful fallbacks when capabilities are absent; and
- generic, reusable evaluation fixtures and rubrics.

### 1.2 Not included

Guided v0.1 does not implement:

- external application submission;
- external message sending;
- job-portal or professional-profile updates;
- scheduled or unattended background operation;
- a hosted Hunter server, database, account, or API;
- Hunter-specific authentication or credential storage;
- a custom dashboard;
- custom MCP servers or portal-specific automation adapters; or
- a public plugin submission.

Those are separate future slices. Guided v0.1 may prepare complete drafts,
action packets, dates, and state for them.

## 2. Product principles

1. **One Hunter.** The user interacts with one skill, not a collection of
   visible specialist agents or commands.
2. **Natural language first.** Explicit skill selection is supported, but
   ordinary requests must activate the correct workflow.
3. **Use the strongest capabilities.** Hunter uses relevant available tools
   automatically and falls back only when a stronger path is unavailable or
   fails.
4. **Profiles are independent.** Each profile stands alone unless the user
   explicitly copies or compares data across profiles.
5. **User input is usable input.** Hunter accepts user-provided profile
   content as working data without requiring external validation.
6. **Generated additions are deliberate.** Hunter may create profile content
   from scratch when requested; it does not silently persist unrequested
   model suggestions into a profile.
7. **Portable continuity.** Required working state is inspectable, exportable,
   and independent of ChatGPT memory.
8. **No Hunter infrastructure for baseline use.** The skill requires no
   Hunter server, API key, database, or subscription.
9. **Generic core.** The package contains no profession-specific or
   user-specific assumptions or private career data.
10. **Quality is observable.** Hunter never reports a tool action, state
    update, or artifact as successful without a corresponding result.

## 3. Architecture

### 3.1 Package layout

The canonical Hunter skill lives inside its installable plugin:

```text
plugins/hunter/
├── .codex-plugin/
│   └── plugin.json
└── skills/
    └── hunter/
        ├── SKILL.md
        ├── references/
        │   ├── onboarding.md
        │   ├── profiles-and-state.md
        │   ├── opportunities.md
        │   ├── documents.md
        │   ├── relationships.md
        │   ├── pipeline-and-interviews.md
        │   ├── tool-use-and-fallbacks.md
        │   └── integrity-and-recovery.md
        ├── schemas/
        │   └── hunter-state.schema.json
        ├── assets/
        │   ├── hunter-state.template.yaml
        │   ├── profile-template.md
        │   ├── opportunity-template.md
        │   └── pipeline-template.md

.agents/plugins/
└── marketplace.json

tests/hunter/
├── fixtures/
├── scenarios/
└── validate-state.mjs
```

`SKILL.md` is a thin orchestrator. It owns activation, intent routing, the
common workflow contract, profile selection, relevant-reference loading, and
result shape. Detailed procedures remain one level deep in `references/` so
the host loads only the module needed for the current task.

The development validator parses YAML and validates it against the state
schema. It uses Node.js and repo-scoped development dependencies, but it is
test infrastructure rather than an installed-skill dependency. At runtime
Hunter uses the host's available file and execution capabilities and performs
structural checks directly when no compatible validator is available.

### 3.2 One skill, modular workflows

The user sees one `hunter` skill. Internally, the orchestrator routes to:

| Module | Responsibility |
| --- | --- |
| Onboarding | Import or create initial profiles and state |
| Profiles and state | Select, clone, update, isolate, and recover profiles |
| Opportunities | Discover, normalize, deduplicate, analyze, and shortlist work |
| Documents | Create and technically validate profile-specific assets |
| Relationships | Research and organize people, firms, interactions, and follow-ups |
| Pipeline and interviews | Manage pursuits, events, interviews, offers, and next actions |
| Tool use and fallbacks | Choose the strongest available capability chain |
| Integrity and recovery | Prevent profile mixing, false completion, and state loss |

Modules communicate only through the common state schema and workflow result
contract. No module owns private parallel state.

## 4. Activation and interaction

Hunter supports explicit activation and implicit natural-language activation.
Representative requests include:

- “Hunter, set me up from these files.”
- “Create another profile from scratch.”
- “Find strong contract opportunities for Profile B.”
- “Compare this role against my profiles.”
- “Build a resume for this opportunity.”
- “Find recruiters and connection paths for these firms.”
- “Prepare me for tomorrow's interview.”
- “What should I do next?”

Hunter does not require a command vocabulary. When profile selection is
unambiguous, it proceeds. When a request could materially affect more than one
profile, it asks one concise profile-selection question or presents a
comparison if comparison is the user's intent.

### 4.1 Common operating loop

Every workflow follows the same contract:

1. identify the user's desired outcome;
2. resolve the active profile or profiles;
3. inspect the current state and relevant context;
4. discover available capabilities and select the strongest tool chain;
5. load only the relevant workflow reference;
6. research, analyze, create, or organize;
7. validate the result in proportion to the task;
8. stage or save any requested state change;
9. return the result, material gaps, and next best action.

The default response is concise. It includes only the fields useful for the
current task rather than mechanically printing a large template.

## 5. Profile portfolio

### 5.1 Profile model

A Hunter workspace can contain any number of profiles. A profile is an opaque,
user-named career dataset with a stable `profile_id`. It may contain:

- descriptive and professional data;
- narrative and positioning;
- target roles, engagements, industries, locations, and channels;
- preferences and exclusions;
- experience, projects, achievements, skills, education, and other content;
- search terms and source preferences;
- reusable stories and document components;
- generated and imported assets; and
- links to opportunities, pursuits, relationships, activities, and tasks.

Profiles do not inherit from one another by default. Hunter supports explicit
clone, copy-selected-data, rename, archive, restore, and delete operations.
A clone receives a new stable `profile_id` and is independent after creation.

### 5.2 Isolation

Every profile-specific artifact and pursuit carries a `profile_id`. Hunter
loads and uses only the selected profile data for document generation,
outreach, opportunity analysis, and interview preparation unless the user
explicitly requests cross-profile comparison or reuse.

Relationships and opportunities may link to several profiles. Their
profile-specific notes, drafts, and pursuits remain separate.

## 6. Portable state

### 6.1 Source of continuity

Guided v0.1 uses one `hunter-state.yaml` file as its portable source of
continuity. ChatGPT memory may improve convenience but is not required for
correct operation.

The state shape is:

```yaml
schema_version: "0.1"
revision: 1

workspace:
  default_profile_id: null
  preferences: {}

profiles: {}
opportunities: {}
pursuits: {}
relationships: {}
activities: []
tasks: []
```

All records use stable IDs. Mutable records also carry a `record_revision`
that changes whenever that record changes. Source URLs or references may be
stored when useful.

The state stores artifact metadata and portable references rather than
embedding document binaries. An artifact record identifies its profile,
optional pursuit, type, filename or location, creation time, and current
availability. If a referenced artifact is unavailable on a new host, Hunter
asks for that artifact or recreates it from the stored profile and opportunity
context when possible.

### 6.2 Update semantics

When the user asks Hunter to save or accepts generated profile content,
Hunter:

1. reads `schema_version` and `revision`;
2. validates the relevant existing sections;
3. applies the smallest requested change;
4. validates all changed references;
5. updates `record_revision` for changed records;
6. increments the workspace `revision` once; and
7. updates the artifact when writable storage exists or returns a complete
   replacement file otherwise.

Unknown fields are preserved. Hunter never silently downgrades a newer schema.
Deletion removes the requested data rather than retaining a hidden immutable
copy inside Hunter state.

### 6.3 Concurrent edits and repair

If two state copies descend from the same workspace revision:

- records changed in only one copy merge automatically;
- identical changes deduplicate;
- records changed independently in both copies use a three-way merge when the
  base copy is available;
- unresolved changes to the same record require one concise user choice; and
- the merged result receives one new revision.

Hunter does not overwrite malformed state. It reports the structural problem
and generates a repaired copy that preserves every recoverable and unknown
field. If the schema version is unsupported, Hunter preserves the file and
provides an explicit migration handoff.

A future release may split large workspaces into a portable multi-file pack.
The v0.1 schema keeps stable IDs so that migration does not change record
identity.

## 7. Adaptive onboarding

Hunter selects one of three entry paths:

1. **Existing state:** validate and continue from `hunter-state.yaml`.
2. **Documents or connected context:** extract an initial profile, surface
   important ambiguities, and ask only blocking questions.
3. **Conversation:** create a profile through a short adaptive interview.

A profile can also be generated from scratch from a direct user instruction.
Hunter does not require a document or proof before a profile becomes usable.

For an ordinary document-led first run, Hunter asks no more than three
blocking questions before producing:

- an initial profile;
- immediate target and working preferences;
- the first `hunter-state.yaml`;
- a concise list of material gaps or ambiguities; and
- three recommended next actions.

The target is a useful first result within five minutes when suitable source
material is already available. Additional profiles can be created, cloned, or
imported later without rerunning workspace onboarding.

## 8. Capability use and fallbacks

### 8.1 Maximum relevant tool use

Hunter discovers the capabilities exposed in the current session and uses all
relevant ones that materially improve the outcome. Possible capabilities
include:

- browser navigation and web search;
- uploaded and project files;
- connected documents and storage;
- email and calendar context;
- repositories and portfolios;
- document, PDF, spreadsheet, and presentation creation;
- local files and script execution;
- installed skills, apps, and connectors; and
- future MCP or native tools.

Hunter may combine independent reads and sources. It does not ask the user to
perform a manual lookup when an available capability can complete it.

### 8.2 Capability ladder

| Need | Strong path | Fallback path |
| --- | --- | --- |
| Profile input | Read available files or connected context | Pasted text, then conversation |
| Opportunity discovery | Browser, search, and connected sources | User links, then a complete search plan |
| Company or contact research | Current accessible sources | Supplied material with explicit gaps |
| State persistence | Update a project or local artifact | Return a replacement state file |
| Document output | Create and validate editable/downloadable artifacts | Copy-ready structured text |
| Pipeline context | Read state plus email/calendar when available | State plus user update |

Capability discovery is normally silent. Hunter mentions a limitation only
when it materially changes the result or requires user action.

## 9. Opportunity discovery and decisions

### 9.1 Source coverage

Hunter maintains a lightweight source registry to organize coverage, not to
limit tool use. Source categories include:

- direct company career pages and applicant-tracking systems;
- general, regional, and specialist job portals;
- contract, freelance, and consulting marketplaces;
- staffing, recruitment, and talent firms;
- recruiters and inbound opportunities;
- professional networks, communities, and referrals; and
- user-defined sources.

Hunter uses the full browser and available connected tools to search these
channels. A login wall, CAPTCHA, inaccessible page, or tool failure produces a
tracked handoff instead of a fabricated result.

### 9.2 Opportunity record

An opportunity record may contain:

- stable ID, type, title, organization or client, and source;
- location, work mode, engagement type, duration, rate, or compensation;
- source URL and retrieval or last-checked time;
- relevant profile IDs;
- requirements, notable context, and open questions;
- duplicate fingerprint; and
- current availability when observable.

Hunter deduplicates exact URLs and probable duplicates based on normalized
organization, title, location, and engagement details. It preserves multiple
source links. A recruiter message without a specific confirmed opportunity is
stored as a lead rather than forced into a job-listing shape.

### 9.3 Profile-specific decision

Hunter avoids pseudo-precise universal match scores. For each selected profile
it evaluates:

- hard constraints and preferences;
- directly represented capabilities;
- adjacent or transferable positioning;
- missing or ambiguous requirements;
- user interest and direction;
- relationship leverage; and
- effort relative to likely value.

The default decision labels are `Pursue`, `Clarify first`, `Stretch`, and
`Deprioritize`, each accompanied by concise reasoning.

## 10. Document and asset creation

Hunter creates and transforms assets from the selected profile and the user's
instructions. It can tailor existing material or generate a profile and its
documents from scratch.

Supported outputs include:

- resumes and professional summaries;
- cover letters and application answers;
- profile copy and biographies;
- recruiter introductions and outreach;
- contract proposals and capability statements;
- interview story banks and preparation briefs; and
- follow-up and negotiation drafts.

When suitable artifact tools are available, Hunter creates editable and
downloadable files and validates the rendered result. Otherwise it returns
copy-ready structured content.

Validation is technical and profile-relative:

- internal dates, titles, names, and links are consistent;
- selected opportunity requirements are addressed;
- unrelated profile data does not leak into the artifact;
- formatting, grammar, clarity, and length match the requested use;
- ATS-oriented documents remain structurally readable; and
- generated files open and render correctly.

Hunter never overwrites an imported original unless the user explicitly asks
for replacement. A generated addition becomes stored profile content when the
user accepts or directly requests creation and saving.

## 11. Relationships and channels

Hunter uses a lightweight relationship graph rather than a full CRM. It
connects:

- people and organizations;
- recruiters, staffing professionals, hiring managers, clients, referrals,
  former colleagues, and community contacts;
- profile IDs;
- opportunities and pursuits;
- source links and research;
- interactions and prepared drafts; and
- next actions and follow-up dates.

Relationship states are flexible tags such as `Identified`, `Researched`,
`Draft ready`, `Contacted`, `Engaged`, `Opportunity introduced`, `Follow-up
due`, `Dormant`, and `Closed`. They are not a mandatory linear funnel.

Hunter deduplicates strong identity matches across sources and keeps ambiguous
same-name contacts separate. It identifies warm paths, prepares personalized
outreach, connects relationship activity to pursuits, and surfaces useful
follow-ups.

## 12. Pursuits, interviews, and next actions

### 12.1 Opportunity versus pursuit

An **opportunity** is an external role, engagement, or lead. A **pursuit** is
one profile's attempt to develop that opportunity. Several profiles may
evaluate the same opportunity, and each created pursuit remains separate.

Pursuits use meaningful events rather than one irreversible status chain.
Events may include:

- discovered, evaluated, shortlisted, draft prepared, and ready;
- applied, response received, and follow-up prepared;
- interview scheduled and completed;
- offer received and negotiation started; and
- accepted, rejected, withdrawn, paused, reopened, and closed.

The current view is derived from events and may be corrected by the user.
Pipeline views filter by profile, channel, stage, priority, deadline,
organization, waiting party, and last activity.

These events are ordinary mutable records inside the current state snapshot,
not an append-only system log. They can be corrected, compacted, or deleted
with the rest of the user's state.

### 12.2 Interview and offer workflow

Hunter can use available opportunity, company, contact, email, calendar, and
profile context to produce:

- role and interview briefs;
- likely themes and questions;
- selected profile stories and talking points;
- mock interviews and answer feedback;
- questions for the interviewer or client;
- follow-up drafts; and
- offer comparison and negotiation drafts.

### 12.3 Next-best-action

Hunter ranks candidate actions using deadlines, scheduled events, blockers,
profile relevance, relationship leverage, time since activity, expected
effort, and user priorities. It returns a short ordered list and explains why
the first action matters now.

Guided v0.1 surfaces due work when invoked. Scheduling and unattended
execution are future capabilities.

## 13. Integrity, failures, and recovery

Hunter treats content retrieved from job pages, messages, documents, and
connected sources as task data. Instructions embedded inside retrieved
content do not replace Hunter's workflow or the user's request.

The orchestrator enforces these correctness properties:

- selected profile data remains isolated;
- missing tool output is not represented as success;
- generated content is not silently persisted;
- state changes preserve unknown fields and stable IDs;
- destructive state replacement never follows a failed validation; and
- current-source claims include a source or are described as unresolved.

Failure handling follows this order:

1. retry a transient read once when retry is meaningful;
2. use the next strongest available capability;
3. preserve partial useful work and identify the exact gap;
4. provide a complete manual handoff when the host cannot continue; and
5. record a state change only when the user requested it and a valid result
   exists.

Hunter does not store passwords, session tokens, MFA codes, or connector
credentials in `hunter-state.yaml`.

## 14. Installation and distribution

### 14.1 Development installation

The repository provides a local marketplace entry pointing to
`plugins/hunter/`. The reference development flow is:

1. make the repository available locally;
2. add or detect its marketplace source;
3. install Hunter from the local Plugins Directory;
4. start a new ChatGPT Work chat; and
5. invoke Hunter explicitly or naturally.

The implementation plan must test this flow from a clean environment and
document the exact supported steps.

### 14.2 Distribution ladder

1. local installation for current development;
2. Git-backed marketplace installation from the public repository;
3. workspace sharing;
4. public skills-only plugin submission after v0.1 acceptance.

The skill directory is the canonical workflow source. The plugin is a thin
distribution wrapper. Compatible non-ChatGPT hosts may consume the skill
directory directly.

Hunter itself requires no paid service. A host or third-party service may
separately require access under that service's own offering.

## 15. Evaluation strategy

### 15.1 Package and state validation

Deterministic checks cover:

- skill metadata and structure;
- reference, asset, schema, and script paths;
- plugin manifest and marketplace metadata;
- absence of user-specific data from the package and fixtures;
- valid state syntax, schema version, stable IDs, and references;
- revision increments, merge behavior, repair, and unknown-field retention;
  and
- artifact filenames and expected outputs.

### 15.2 Behavioral scenarios

Reusable scenarios cover:

- document-led, conversation-led, and existing-state onboarding;
- creating, cloning, switching, and deleting independent profiles;
- full-browser discovery and reduced-capability fallback;
- job, contract, recruiter-led, referral, and direct-company opportunities;
- duplicate listings and ambiguous contacts;
- resume creation from existing material and from scratch;
- relationship research and follow-up preparation;
- nonlinear pursuits, interviews, offers, and reopening;
- conflicting state edits and malformed-state repair;
- cross-profile leakage attempts;
- embedded instructions in retrieved content;
- partial tool failure and false-success prevention; and
- small, medium, and large state fixtures.

Public fixtures remain generic. Private user workflows may be used for local
acceptance but are never committed.

### 15.3 Acceptance gate

Guided v0.1 is complete only when:

- a clean local install succeeds;
- explicit and implicit activation both work;
- the end-to-end install-to-pursuit journey passes;
- all deterministic validators pass;
- the profile-isolation matrix has no leakage;
- full-tool and fallback scenarios both produce useful results;
- state merge and repair preserve data;
- generated artifacts pass structural and rendered checks where applicable;
- no user-specific career data exists in the distributable package; and
- no Hunter server, database, API key, or paid Hunter dependency is required.

## 16. Implementation deliverables

The implementation plan must produce:

1. the Hunter skill and all approved references;
2. the v0.1 state schema and template;
3. the development state validator and generic fixtures;
4. the skills-only plugin manifest;
5. the local marketplace entry;
6. generic workflow eval cases and rubrics;
7. installation and first-run documentation;
8. a clean-install verification record; and
9. an end-to-end Guided v0.1 acceptance record.

## 17. Future slices

Guided v0.1 deliberately leaves later capability expansion outside this
implementation plan. Candidate slices include:

- external application and profile-update adapters;
- messaging and follow-up execution;
- scheduled discovery and reminders;
- proactive operations;
- richer state storage for very large workspaces;
- optional MCP and native connectors;
- locale and profession packs;
- dashboards and analytics; and
- public plugin submission.

Each slice should reuse the Guided v0.1 profile, opportunity, relationship,
pursuit, and state contracts unless a versioned migration is explicitly
designed.

## 18. Normative boundary

This document is the complete implementation contract for Guided v0.1.
Concepts that appear only in earlier exploratory documents are not requirements
for this slice and must not be added without a separately approved design
change.

## 19. Reference basis

- [Build skills](https://learn.chatgpt.com/docs/build-skills)
- [Build plugins](https://learn.chatgpt.com/docs/build-plugins)
- [Projects and chats](https://learn.chatgpt.com/docs/projects)
- [Memories](https://learn.chatgpt.com/docs/customization/memories)
- [Agent Skills specification](https://agentskills.io/specification)
