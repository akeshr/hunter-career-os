# Hunter Guided v0.1 Implementation Roadmap

**Approved design:** [Hunter Guided v0.1 Design](../specs/2026-07-21-hunter-guided-v0.1-design.md)

The approved design contains several independently reviewable subsystems. It
must be implemented through the following plans in order rather than as one
large change.

| Order | Plan | Independently testable milestone |
| --- | --- | --- |
| 1 | [State foundation](2026-07-21-hunter-01-state-foundation.md) | Portable state parses, validates, transitions, merges, and repairs against generic fixtures |
| 2 | [Installable core and onboarding](2026-07-21-hunter-02-installable-core-onboarding.md) | Hunter package validates and, when supplied as the system-under-test, onboards and manages isolated profiles; installed-host activation is deferred to Plan 7 |
| 3 | [Capabilities and opportunities](2026-07-21-hunter-03-capabilities-opportunities.md) | Hunter selects and uses controlled available/failing capability paths and produces normalized profile-specific opportunity decisions; real host tools are qualified in Plan 7 |
| 4 | [Document assets](2026-07-21-hunter-04-document-assets.md) | Hunter creates and validates profile-specific career assets |
| 5 | [Relationships](2026-07-21-hunter-05-relationships.md) | Hunter researches and tracks people, firms, warm paths, and follow-ups |
| 6 | [Pipeline, interviews, and next actions](2026-07-21-hunter-06-pipeline-interviews-next-actions.md) | Hunter manages pursuits, interviews, offers, tasks, and ranked next actions |
| 7 | [Qualification and installation](2026-07-21-hunter-07-qualification-installation.md) | Clean install and the complete Guided v0.1 journey pass |

## Interface ownership

- Plan 1 owns the complete `hunter-state.yaml` contract and development state
  tooling. Later plans may add fixtures but must not reshape the schema without
  an approved migration.
- Later workflow plans may add deterministic validators for optional
  additional-field semantics. Those validators extend reference checking
  without changing Plan 1’s schema or core interfaces.
- Plan 2 owns the common Hunter operating loop, profile resolution, response
  contract, plugin package, and onboarding/profile references.
- Plan 2 adds `agents/openai.yaml` as host UI metadata. It contains no Hunter
  policy, dependency, state, or workflow logic.
- Plans 3–6 each own their named workflow reference and scenarios. Their only
  shared production-file edit is the corresponding route/trigger expansion in
  `SKILL.md`; each also advances the shared package-test expectation.
- Plan 7 owns package qualification, clean installation, full behavioral
  acceptance, user documentation, and the v0.1 release gate.
- Deterministic Node tests and host-executed conversational evaluations are
  separate evidence streams. Neither substitutes for the other.

## State clarifications locked for implementation

The state implementation uses these precise interpretations of the approved
design:

- `workspace.id` distinguishes unrelated workspaces.
- Artifacts live under their owning profile.
- YAML must contain JSON-compatible data. Duplicate keys, aliases, custom
  tags, non-string mapping keys, and non-finite numbers are invalid.
- Unknown semantic fields are preserved; comments, anchors, scalar quoting,
  key order, and byte identity are not portability guarantees.
- Three-way merge requires the base copy. Because the API consumes parsed
  objects, without a base only semantic deep-equivalent inputs deduplicate;
  other divergence returns `base_required`.
- Automatic repair is conservative. It repairs only parseable, unambiguous
  structural defects and never overwrites the source file.
- Root activities, root tasks, and profile artifacts merge by stable ID rather
  than array position.
- Current pursuit stage is the most recent effective stage-changing activity
  ordered by `occurred_at` and then stable activity ID.

## Execution rule

Finish and verify each plan before starting the next. A failed plan gate stops
the sequence and requires diagnosis before later work proceeds.
