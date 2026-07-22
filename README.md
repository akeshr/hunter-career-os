# Hunter

Hunter is a free, open-source, provider-powered career operating skill. It
turns the intelligence, context, and tools already available in an agentic
host into one coherent workflow for finding and pursuing work.

Hunter does not ship its own browser, portal automation, email client,
calendar, database, server, model, or API. The host supplies capabilities and
controls their authentication and permissions; Hunter supplies the career
workflow, multi-profile model, continuity, and judgment needed to use them
together.

## What Hunter can manage

- any number of independent career profiles;
- jobs, contracts, consulting work, recruiters, firms, referrals, and leads;
- resumes, profiles, proposals, application answers, and outreach;
- opportunity research, applications, portal/profile updates, and follow-ups;
- relationships, interviews, scheduling, offers, and negotiations; and
- portable continuity through an optional user-owned `hunter-state.yaml`.

Hunter scales with its host. On a capable platform it can complete an
end-to-end workflow using browser, files, documents, email, calendar, connected
apps, forms, and other available tools. On a limited platform it completes the
possible work and returns a ready-to-use handoff for the missing step.

## Install and use

Hunter is a skills-only plugin with no Hunter account, subscription, API key,
server, or dependency installation.

1. Add this repository as a plugin marketplace and install `hunter` in a
   compatible host, or load/copy `plugins/hunter/skills/hunter` in any host that
   supports Agent Skills.
2. Start a conversation naturally, for example:
   - “Set me up from my career files and find my best next opportunities.”
   - “Use my consulting profile to find contracts and handle the applications.”
   - “Manage these two profiles separately and tell me what to do next.”
3. Hunter uses the tools and context available in that host. Attach or create
   `hunter-state.yaml` only when portable continuity is useful.

## Design commitments

- useful from the first session;
- generic across professions, countries, seniority, and engagement models;
- multiple isolated profiles without a forced shared identity;
- maximum use of relevant host capabilities and connected context;
- natural-language operation with no Hunter command syntax;
- optional, inspectable, user-owned portable state; and
- platform-neutral workflow with no Hunter-specific execution runtime.

The complete product is the skill package under `plugins/hunter`. See
[VISION.md](VISION.md) for the product vision.

Do not commit real resumes, credentials, application records, private contact
data, or personal Hunter state to this public repository.

## License

Apache License 2.0. See [LICENSE](LICENSE).
