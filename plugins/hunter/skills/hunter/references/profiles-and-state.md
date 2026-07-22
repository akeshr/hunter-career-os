# Profiles and Portable State

Support any number of independent career profiles. A profile can represent a
different role direction, profession, engagement model, market, or experiment;
profiles do not need a shared factual core.

## Resolve the active profile

1. Use an explicit profile ID or exact name.
2. For comparison, use the named profile set.
3. Otherwise use the workspace default.
4. If only one profile exists, use it.
5. Ask one concise selection question only when ambiguity matters.

## Profile operations

- **Create/import:** build an independent profile from supplied or connected
  context.
- **Clone:** copy the selected profile into a new independent starting point;
  future changes do not synchronize automatically.
- **Copy selected material:** reuse only the fields or assets the user chooses.
- **Update/rename/archive:** change only the selected profile.
- **Delete:** show affected artifacts, pursuits, tasks, and shared links before
  a material deletion, then clean their references if the user proceeds.
- **Compare:** keep facts and reasoning separate for every profile.

Never copy another profile implicitly. User-requested reuse is allowed and
should retain clear source/ownership context.

## Portable state

`hunter-state.yaml` is optional portable continuity, not a prerequisite for
using Hunter. It can contain profiles, opportunities, pursuits, relationships,
activities, tasks, artifacts, and workspace preferences.

When changing state:

- use stable IDs and the shapes in [the schema](../schemas/hunter-state.schema.json);
- preserve unrelated and unknown fields;
- keep references aligned with the owning profile;
- increment revisions consistently; and
- save through available storage or return a complete replacement file.

## Merge or move state

For multiple copies of the same workspace, combine identical or independent
changes and ask one concise question for genuine conflicts. Do not infer that
different workspaces are the same merely because records look similar.

The state file may be stored in a project, downloaded and reattached, synced
through a connected drive/repository, or moved to another compatible agentic
platform.
