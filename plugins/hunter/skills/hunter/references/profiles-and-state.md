# Isolated profiles and portable state

Keep each profile independent. Apply only the operation the user requested, preserve unrelated state, and never report a save until the complete candidate passes validation.

## Resolve profiles

Apply this precedence in order and stop at the first rule that resolves the request:

1. Use an explicit profile ID or exact name when either is supplied.
2. For an explicit comparison request, use its named profile set.
3. For an otherwise implicit request, use a valid `workspace.default_profile_id`.
4. If no valid default applies and the workspace contains exactly one profile, use that profile.
5. If material ambiguity remains, ask one concise profile-selection question.

## Create

- Create a new independent profile with a unique stable ID, a user-approved display `name`, `record_revision: 1`, `data.lifecycle: active`, and an empty `artifacts` array.
- Use the canonical `profile.data` keys and populate only user-provided, requested, or accepted data; never copy another profile implicitly.

## Import into existing workspace

- Validate the existing state, read the requested available sources, and extract them into exactly one new independent profile with a unique stable ID.
- Give the imported profile the requested display name, `record_revision: 1`, `data.lifecycle: active`, canonical `profile.data`, and an empty `artifacts` array.
- Keep canonical container shapes: `positioning`, `targets`, `preferences`, and `search` are objects; `experience`, `projects`, `achievements`, `skills`, `education`, `stories`, and `reusable_components` are arrays.
- Preserve every existing profile and record, `workspace.default_profile_id`, and every unknown semantic field unless the user explicitly requests a change to one of them.
- Advance the root `revision` by one; leave all existing record revisions and stable IDs unchanged.
- Validate the complete candidate state and the before/candidate transition before writing.
- Treat this as a mutation of valid existing state; do not perform first-state initialization, reset the workspace, or copy data from another profile unless the user explicitly requests selected reuse.

## Clone

- Copy the source profile's complete `data` object, including every canonical key and every unknown data key, into a new independent profile.
- Give the clone a new stable ID, `record_revision: 1`, the requested display name, `data.lifecycle: active`, and an empty `artifacts` array.
- Leave the source unchanged and do not create future synchronization between source and clone.
- Do not copy artifacts, pursuits, activities, tasks, or profile-specific relationship notes unless the user explicitly requests selected reuse.

## Copy selected data

- Identify the source profile, destination profile, and exact `profile.data` fields before copying.
- Copy only those fields into the destination; preserve all other destination data and unknown keys.
- Change only the destination profile record; leave the source and every unselected profile unchanged.

## Rename

- Change only the selected profile's display `name` and `record_revision` within profile records.
- Leave its ID, `data`, artifacts, dependents, and every other record unchanged.

## Archive and restore

- Archive by changing only the selected profile's `data.lifecycle` to `archived`; restore by changing only it to `active`.
- Increment only the selected profile's `record_revision` among profile records and leave all other profile content unchanged.

## Delete

- Preview all dependents before mutation and request confirmation when the deletion is material.
- After confirmation, remove the profile and all artifacts nested under it.
- Remove every pursuit whose `profile_id` is the deleted profile ID.
- Remove activities and tasks owned by the deleted profile or by any removed pursuit.
- Remove the profile ID from every shared opportunity `profile_ids` array and relationship `profile_ids` array.
- Remove its key from optional profile-keyed extension maps, including opportunity `profile_evaluations` and relationship `profile_contexts`.
- Set `workspace.default_profile_id` to `null` when it names the deleted profile.
- Validate the final candidate and remove or resolve every remaining core or workflow-extension reference to a deleted ID; save only when no dangling reference remains.

## Save every mutation

- Read `schema_version` and the current root `revision`, then validate the relevant existing state before applying the smallest requested change.
- Preserve every unknown semantic field that the requested operation does not target.
- Start every new record at `record_revision: 1`.
- Increment each changed record's `record_revision` exactly once; retain every unchanged record's revision and stable ID.
- Increment the root `revision` exactly once for every successful saved mutation.
- Validate the complete candidate state and all changed references against [the canonical state schema](../schemas/hunter-state.schema.json), then validate the before/candidate transition under the revision rules above before writing it.
- When writable storage exists, update the state artifact; otherwise return a complete replacement `hunter-state.yaml` with state result `replacement-file`, never `saved`.

## Merge state copies

- Validate every supplied input—`base` when present, `left`, and `right`; if any supplied input is malformed, return `invalid_input` without attempting a merge.
- Require every supplied input's `workspace.id` to match; return `workspace_mismatch` without merging when any differs.
- With a base copy, perform a three-way merge: keep identical changes, take a one-sided change, combine disjoint object or stable-ID-record changes, and ask one concise choice for unresolved same-record conflicts.
- Without a base, deduplicate only semantically deep-equivalent copies; return `base_required` for every other divergence and never infer ancestry from revision numbers.
- Do not manufacture a revision when identical branches deduplicate or one branch is unchanged from the base.
- For a real merge, set the root revision to `max(left.revision, right.revision) + 1`.
- For a record that combines changes from both branches, set `record_revision` to `max(left.record_revision, right.record_revision) + 1`.
