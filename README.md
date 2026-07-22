# Hunter

Hunter is a free, open-source, platform-neutral career agent. It uses the
context and tools already available on an agentic platform to help users
manage profiles, opportunities, recruiters, relationships, applications,
interviews, offers, and contract work.

> **Project status:** Hunter Guided v0.1 has an approved conversational design.
> The written specification is awaiting final review; implementation has not
> started.

## Start here

- [Vision](VISION.md)
- [Hunter Guided v0.1 Design](docs/superpowers/specs/2026-07-21-hunter-guided-v0.1-design.md)
- [Adversarial Review of the Initial Architecture](docs/reviews/2026-07-21-hunter-adversarial-design-review.md)

## Guided v0.1

The first product slice is a reusable Agent Skill packaged in a thin
skills-only ChatGPT plugin. It will:

- onboard from documents, existing state, or conversation;
- maintain any number of independent career profiles;
- use every relevant capability available in the current host;
- discover jobs, contracts, recruiters, firms, referrals, and connections;
- create resumes, application materials, proposals, and outreach;
- manage opportunities, pursuits, relationships, interviews, and follow-ups;
- preserve portable state in one user-owned `hunter-state.yaml` file; and
- remain useful when rich tools or persistent writes are unavailable.

Guided v0.1 researches, analyzes, creates artifacts, and tracks work. External
applications, messages, and profile updates are a later execution phase.

## Core commitments

- useful from the first session;
- free Hunter baseline with no Hunter server, subscription, or API key;
- natural-language operation rather than command memorization;
- isolated profiles with no forced identity or profile classification;
- maximum use of relevant host tools and context;
- portable, inspectable, user-owned state;
- platform-neutral career logic and thin distribution adapters;
- generic public code and fixtures with no user-specific career data.

ChatGPT Work is the first reference experience. The underlying skill remains
portable to other Agent Skills-compatible hosts and can later be paired with
MCP or native connectors without rewriting Hunter's career workflows.

## Repository hygiene

Do not commit real resumes, credentials, application records, private contact
data, or personal Hunter state. Public examples and test fixtures must remain
generic and non-user-specific.

## License

Apache License 2.0. See [LICENSE](LICENSE).
