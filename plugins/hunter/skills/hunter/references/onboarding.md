# Adaptive onboarding

Select the entry path that matches the available context. Use supplied content as working profile data and produce a useful result as early as possible.

## Existing state

Validate the supplied `hunter-state.yaml`. When valid, continue from it and do not rerun onboarding. For a later profile import into a valid workspace, delegate to the orchestrator's Profiles and state route without first-state initialization.

## Documents or connected context

Read all relevant available documents and connected sources before asking questions. Ask only blocking questions, and ask no more than three of them before producing the first useful result. Extract the initial profile, targets, preferences, and material gaps from the available content. Do not overwrite the imported original unless the user explicitly requests replacement.

## Conversation

Ask one adaptive question at a time. Create a usable partial profile early from the answers already available instead of waiting for a completed questionnaire.

## Direct from scratch

Follow the user's direct instructions and create the requested working profile. Do not require documents or proof.

## Use the canonical resources

When creating or mutating state, read [the state schema](../schemas/hunter-state.schema.json) and [the state template](../assets/hunter-state.template.yaml) first.

When producing a human-readable profile, use [the profile template](../assets/profile-template.md).

## Create the first state

Set `schema_version: "0.1"` and the root revision to `1`. Generate a unique workspace ID and a unique profile ID. Set the first profile's `record_revision: 1`, and set `workspace.default_profile_id` to the first profile unless the user requests otherwise. Initialize every other required collection empty.

Use the canonical `profile.data` keys and initial collection shapes:

```yaml
profiles:
  <profile-id>:
    id: <profile-id>
    record_revision: 1
    name: <working-profile-name>
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
    artifacts: []
opportunities: {}
pursuits: {}
relationships: {}
activities: []
tasks: []
```

Use the same generated profile ID as the `profiles` map key and the profile's `id`.

## Return the first result

For ordinary document-led onboarding, return an initial profile, targets and working preferences, a state artifact or complete replacement YAML, material gaps or ambiguities, and exactly three recommended next actions.
