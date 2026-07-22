# Onboarding

Give the user a useful result in the first session. Start from whatever exists:
portable state, career files, connected context, pasted material, conversation,
or a direct request to build a profile from scratch.

## Choose the entry path

- **Existing `hunter-state.yaml`:** continue from it after a basic structure
  check. Do not restart onboarding.
- **Files or connected context:** read the relevant material before asking for
  information already available there.
- **Conversation:** ask one adaptive question at a time and create a usable
  working profile early.
- **From scratch:** follow the user's requested positioning and targets; no
  prior resume is required.
- **Immediate task:** if the user already asked for a concrete outcome, do that
  work while building only the minimum profile context it needs.

## Build the first profile

Capture the useful subset of:

- profile name and positioning;
- target roles, engagements, markets, locations, and constraints;
- experience, projects, achievements, skills, education, and stories;
- search preferences and reusable material; and
- important gaps or decisions.

Do not force every field to be complete. Ask at most three blocking questions
before producing the first useful result.

## Create continuity when helpful

Use [the state schema](../schemas/hunter-state.schema.json) and
[state template](../assets/hunter-state.template.yaml). Create one stable
workspace ID and profile ID, set the first profile as default unless the user
chooses otherwise, and initialize the other collections empty.

If the host can save or return a file, provide `hunter-state.yaml`. If it
cannot, keep working conversationally and return copy-ready state only when
continuity is useful.

## First-session result

Return the working profile, the requested deliverable or finding, the most
important gaps, state/download information when created, and a short set of
high-value next actions.
