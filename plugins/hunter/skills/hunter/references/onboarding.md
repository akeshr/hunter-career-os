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

## Activate execution channels

In the first session, surface one concise, optional activation question after
the first useful result, or earlier when a channel is needed for the user's
immediate task:

> Which channels do you want Hunter to activate now—professional networks such
> as LinkedIn, job or contract portals, email, calendar, portfolio/code/file
> sources, or none for now?

Treat this as an opt-in choice, not a blocker or a request to configure every
channel. Skip the question when the user already selected or declined channels.
For each selected channel:

1. Check whether the current host exposes a relevant capability and whether the
   user is already authenticated. Do not infer account access merely because a
   browser, connector, or app exists.
2. If authentication is needed, open or identify the host's official login flow
   one channel at a time. Have the user enter credentials and one-time codes in
   that flow; never ask them to provide secrets in chat.
3. Record the user's selection and only observed access: authenticated, logged
   out, unavailable, or blocked. Never store passwords, cookies, tokens, or
   one-time codes. Continue useful work through other channels when one is
   blocked.
4. Follow the host's normal confirmation model for messages, invitations,
   applications, profile edits, submissions, and other consequential actions.

When portable state is available, record activation under
`workspace.preferences.execution_channels`, including each selected channel's
observed access status and optional last-check time. If an existing state file
lacks this record, offer activation at the next natural pause without restarting
onboarding. Respect `none for now` or a deferred choice and do not repeatedly ask
unless the user reopens setup or a requested task needs a channel.

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
high-value next actions. Include the activation result only when channels were
offered, selected, checked, or deferred, and identify the next login step when
one is needed.
