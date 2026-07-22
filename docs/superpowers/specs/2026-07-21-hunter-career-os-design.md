# Hunter: Universal Career Acquisition OS

> **Historical exploration — not an active implementation specification.**
> This document predates the approved skill-first Hunter Guided v0.1 design.
> Its Career Vault, evidence taxonomy, persona, policy-kernel, and autonomy
> concepts are superseded for the active product slice. Use
> [Hunter Guided v0.1 Design](2026-07-21-hunter-guided-v0.1-design.md) as the
> normative implementation contract.

## Product and Technical Architecture Specification

| Field | Value |
| --- | --- |
| Document version | 1.0.0-review |
| Date | 2026-07-21 |
| Status | Historical exploration |
| Product name | Hunter |
| Product category | User-owned Career Acquisition OS |
| First reference platform | ChatGPT Work |
| Portability targets | Agent Skills, MCP, filesystem, and other agentic platforms |
| Distribution | Free, community-first, open core |
| Core license | Apache-2.0 |

## 1. Executive summary

Hunter is a universal, platform-neutral career operating system. It helps an
individual manage the full career acquisition lifecycle: positioning,
multi-profile strategy, opportunity discovery, job and contract sourcing,
recruiter and relationship development, profile maintenance, applications,
interviews, offers, consulting deals, follow-ups, and long-term career leverage.

Hunter is not a job-board scraper, resume generator, browser macro, or a single
ChatGPT prompt. It is a portable protocol and modular runtime that:

- builds an evidence-backed understanding of a person's career;
- maintains multiple legitimate career personas without identity deception;
- finds opportunities across permanent, contract, recruiter, network, and
  direct-company channels;
- selects work using candidate-specific gates and multi-objective value;
- acts through the tools available on the current platform;
- applies one policy kernel to every external side effect;
- records portable state, approvals, receipts, outcomes, and learning;
- remains useful when a platform has few or no connectors; and
- progresses from advisory use to bounded operational autonomy only when
  measured reliability supports it.

## 2. Product thesis

The career market is fragmented across profiles, portals, applicant tracking
systems, staffing firms, recruiters, contractor marketplaces, direct
relationships, email, calendars, documents, and interviews. A person is forced
to be their own strategist, researcher, CRM operator, copywriter, coordinator,
and analyst.

Hunter acts as the person's talent agency while preserving the person's
sovereignty. It optimizes two horizons simultaneously:

1. **Immediate acquisition:** produce qualified conversations, interviews,
   offers, and consulting opportunities.
2. **Long-term leverage:** improve positioning, credibility, relationships,
   market knowledge, skill direction, and negotiating power.

Hunter optimizes career value, not activity volume. Application count,
connection count, and message count are operational measures, never the goal.

## 3. Design principles

The following principles are normative.

1. **Universal on public Day 1.** Any profession, geography, career stage, or
   starting-data condition can obtain useful assistance. Domain and locale
   packs improve results but are not eligibility gates.
2. **User-owned and portable.** The core contains no candidate data. State lives
   in an exportable Career Vault controlled by the user.
3. **Truth before persuasion.** Every externally used claim must have
   sufficient evidence or explicit user attestation. Inferences remain
   internal.
4. **One identity, many legitimate personas.** Different positioning is
   supported; contradictory or deceptive identity representation is not.
5. **Capability-based execution.** Hunter detects available capabilities and
   uses the best valid path. Missing tools cause graceful degradation, not
   product failure.
6. **Policy before side effects.** No profile update, message, application,
   scheduling action, or other external write may bypass the policy kernel.
7. **Progressive autonomy.** Trust is earned through measured performance,
   reversibility, and compliance rather than elapsed time.
8. **Open protocol, thin adapters.** Career logic is platform-neutral.
   Platform-specific code is isolated behind declared interfaces.
9. **Auditability by construction.** Decisions, approvals, external actions,
   confirmations, overrides, and failures produce inspectable records.
10. **Free and zero-infrastructure by default.** A nontechnical user does not
    need a server, database, CLI, or Hunter-specific API key.
11. **Safe degradation.** Resource limits can reduce breadth or defer work, but
    never weaken truth, permission, privacy, or safety rules.
12. **Outcome-aware learning.** Hunter may improve tactics through controlled
    experiments but may not rewrite core safety policy autonomously.

## 4. Goals and non-goals

### 4.1 Goals

Hunter must:

- support permanent employment, contract and consulting work, and the
  relationship funnel that feeds both;
- support multiple career personas for one verified human identity;
- source from job portals, company career sites, staffing and recruitment
  firms, headhunters, contractor marketplaces, professional networks,
  communities, events, inbound messages, and regional sources;
- maintain role-specific resumes, profiles, positioning, compensation or rate
  policies, and channel strategies;
- update external profiles when a compliant adapter and user policy allow it;
- discover, qualify, prepare, approve, submit, and track opportunities;
- prepare interviews, assessments, negotiations, offers, and consulting deals;
- run on demand and proactively through portable trigger definitions;
- work in chat alone and optionally expose structured dashboard views;
- import candidate context from documents, profiles, projects, repositories,
  connected sources, or a guided interview;
- preserve data separation between candidates and between personas;
- install in no more than three simple user actions on the reference platform;
- deliver a first useful result within ten minutes with a resume or within
  fifteen minutes without one; and
- permit extension without giving extensions authority to bypass policy.

### 4.2 Non-goals

Hunter V1 will not:

- guarantee employment, interviews, compensation, or contract awards;
- fabricate experience, skills, credentials, eligibility, references, or
  assessment performance;
- impersonate the user in interviews or complete prohibited assessments;
- bypass CAPTCHA, MFA, identity verification, platform controls, paywalls,
  access restrictions, or channel terms;
- accept or decline offers, resign, sign binding agreements, or make sovereign
  legal declarations for the user;
- require a centralized Hunter account or hosted backend;
- automate every portal through a dedicated adapter at launch;
- store portal passwords, recovery codes, MFA secrets, or raw long-lived
  credentials in the Career Vault;
- merge data from another account, project, or session unless the user exports
  or explicitly connects that data; or
- use aggregate user data for cross-user learning without explicit opt-in.

## 5. Actors, tenancy, and ownership

### 5.1 Core actors

| Actor | Responsibility |
| --- | --- |
| Candidate | Owns identity, vault, permissions, disclosures, and sovereign decisions |
| Hunter | Plans, drafts, recommends, executes allowed actions, records, and learns |
| Advisor | Optional delegate such as a coach or recruiter with explicit scoped access |
| Platform | Provides models, storage, tools, approvals, and runtime constraints |
| Channel | External portal, ATS, marketplace, email system, network, or service |
| Extension author | Supplies a domain pack, locale pack, workflow, or adapter |

### 5.2 Isolation model

Every state object carries a tenant identity and candidate identity. Persona
identity is included where relevant. A normal personal installation has one
candidate-owned vault. An advisor workspace can mount multiple candidate vaults,
but each remains independently permissioned, encrypted where supported, and
audited. Cross-candidate joins are prohibited unless the candidates explicitly
authorize a narrowly defined shared operation.

The candidate is the default data owner. An advisor receives only purpose-bound
scopes such as read-profile, draft-documents, or manage-pipeline. Delegation
expires and can be revoked without changing vault ownership.

## 6. System architecture

Hunter has four architectural layers.

~~~mermaid
flowchart TD
    A["Experience Layer<br/>Chat and optional dashboard"] --> B["Hunter Orchestrator<br/>Modular career workflows"]
    B --> C["Trust and State Core<br/>Vault, evidence, policy, audit, learning"]
    C --> D["Capability Adapters<br/>Platform tools and MCP"]
    D --> E["External Channels<br/>Portals, ATS, email, calendar, networks"]
~~~

### 6.1 Hunter Core and Protocol

The core defines:

- canonical schemas and event contracts;
- evidence and disclosure semantics;
- candidate, persona, opportunity, relationship, and engagement models;
- workflow state machines;
- policy decision and action receipt contracts;
- capability negotiation;
- automation definitions;
- migration rules;
- conformance tests; and
- evaluation fixtures.

These contracts are language-neutral. JSON Schema is the canonical structured
schema format, YAML is used for human-authored manifests and policies, JSONL is
the canonical event interchange format, and Markdown is used for portable
human-readable views and Agent Skills instructions.

The reference executable runtime is TypeScript. The protocol does not require
TypeScript, Node.js, or a Hunter-hosted service.

### 6.2 Modular orchestrator

Users interact with one Hunter. Internally, the orchestrator delegates to
bounded modules:

| Module | Single purpose |
| --- | --- |
| Onboarding and Career Graph | Acquire, normalize, verify, and progressively enrich candidate truth |
| Persona Portfolio | Create and govern legitimate role-specific positioning |
| Market and Opportunity Scout | Discover, normalize, deduplicate, enrich, and rank opportunities |
| Profile and Positioning | Maintain channel-specific profile projections and positioning assets |
| Network and Recruiter CRM | Map relationships, find paths, draft outreach, and manage follow-ups |
| Application Operations | Prepare immutable packets, collect approval, submit, and track |
| Contract Operations | Qualify leads, prepare scope and proposals, negotiate, and hand off wins |
| Interview and Deal | Prepare stages, capture debriefs, compare offers, and support negotiation |
| Strategy and Learning | Run dual-horizon planning and controlled experiments |
| Independent Auditor | Check truth, policy, collisions, receipts, and unsafe optimization |

On platforms that support multiple agents, modules may execute as isolated
subagents. On platforms that do not, the same contracts run as sequential
workflows. Module behavior must not depend on subagent availability.

### 6.3 Platform adapters

Adapters translate core capability calls into platform tools. They must not
contain candidate strategy. An adapter declares capabilities, authorization,
read/write scope, risk, rate limits, receipt quality, rollback support, and
human checkpoints.

Initial adapter families are:

- context and storage;
- web and search;
- browser and computer interaction;
- documents;
- messaging;
- calendar;
- notifications;
- identity checkpoints;
- audit;
- metering and resource reporting.

Initial reference adapters are:

- ChatGPT Work;
- generic Agent Skills;
- MCP;
- filesystem.

Agent-to-Agent interoperability may be added after V1 for delegating bounded
work between compatible runtimes. It is not a V1 dependency and does not
replace the Hunter protocol, vault, or policy kernel.

#### Capability call contract

Every adapter operation receives a typed capability call containing operation,
candidate and persona scope, parameters, correlation ID, deadline, sensitivity,
and the required access decision. Every external write additionally carries an
idempotency key and a valid policy authorization bound to the target and payload
hash.

The adapter returns typed data plus a result envelope containing status,
observed side effects, receipt, retryability, normalized error category, and
resource usage when available. A timeout is not interpreted as failure when a
side effect may have occurred; Hunter reconciles channel state before retrying.

### 6.4 Runtime assurance levels

Platform neutrality must not imply false security equivalence. Hunter reports an
assurance level at startup:

| Level | Guarantee |
| --- | --- |
| Guided | Skills and conversation only; advisory and draft work; no unattended external writes |
| Enforced | Platform or adapter enforces policy decisions, approval checkpoints, idempotency, and receipts |
| Autonomous | Executable policy kernel and compliant adapters support bounded unattended operations |

The capability report states both features and assurance. Hunter never claims
bounded autonomy when it only has prompt-level guidance.

## 7. Portable Career Vault

### 7.1 Canonical layout

The portable interchange representation is:

~~~text
hunter-vault/
  manifest.yaml
  candidate-profile.json
  verified-claims.jsonl
  role-portfolio.json
  opportunities.jsonl
  relationships.jsonl
  applications.jsonl
  actions-and-approvals.jsonl
  outcomes-and-experiments.jsonl
  artifacts/
  views/
~~~

The runtime may use a transaction-safe native store when necessary, but it must
export and import this canonical representation without semantic loss. Derived
indexes and caches are disposable and are never the only copy of user state.

### 7.2 Event envelope

Each append-only event contains:

- schema version;
- globally unique event ID;
- stream sequence and event type;
- occurrence and recording timestamps in UTC;
- tenant, candidate, and optional persona IDs;
- actor and source;
- correlation and causation IDs;
- payload or content-addressed payload reference;
- evidence references;
- policy decision reference when the event represents an action;
- integrity hash; and
- sensitivity classification.

Adapters use optimistic concurrency or an equivalent atomic append mechanism.
Conflicts never silently overwrite events. A deterministic projection builder
regenerates current views from the event history.

### 7.3 Event streams and projections

The approved named JSONL files are logical streams:

- verified claims and evidence lifecycle;
- normalized opportunities and decisions;
- people, organizations, interactions, and follow-ups;
- job applications and contract engagements;
- intents, decisions, approvals, external action receipts, and failures;
- outcomes, feedback, hypotheses, experiments, and results.

Candidate profile and role portfolio are stable projections. The views
directory contains human-readable summaries such as Today, Pipeline, Personas,
Approvals, and Audit. Artifacts contain resumes, cover letters, profile
snapshots, outreach packets, interview briefs, and proposal documents.

### 7.4 Portability and recovery

The vault supports:

- full export and selective export;
- import with schema validation;
- deterministic replay;
- pre-migration snapshots;
- checksum verification;
- rollback to the prior compatible version;
- deletion and reset;
- redaction of selected sensitive categories; and
- platform-to-platform transfer.

Authentication secrets remain outside the vault in platform-native secret
stores or user-controlled credential systems.

## 8. Evidence-backed Career Graph

### 8.1 Claim model

Hunter represents career knowledge as claims linked to evidence. A claim
contains subject, predicate, value, time scope, source, evidence references,
confidence, sensitivity, disclosure policy, and status.

Allowed statuses are:

- **Verified:** supported by reliable evidence;
- **User-attested:** explicitly asserted by the user but not independently
  evidenced;
- **Inferred:** generated from available context and usable only internally;
- **Conflicted:** credible sources disagree;
- **Stale:** once credible but requires freshness review;
- **Rejected:** disproven or explicitly withdrawn.

An inferred claim cannot be externally published. Conflicted claims require
resolution or explicit safe wording. Legal, eligibility, background, and other
high-impact declarations require verified evidence or just-in-time user
confirmation.

### 8.2 Truth and disclosure are separate

Truth status answers whether Hunter may believe a claim. Disclosure policy
answers whether Hunter may share it in a particular context. A verified salary,
disability, protected characteristic, client identity, or clearance detail is
not automatically disclosable.

Disclosure policy is scoped by persona, channel, recipient, purpose, and
sensitivity. External artifacts record which claims they contain.

### 8.3 Source precedence and conflicts

No source is universally authoritative. Hunter evaluates source type,
directness, recency, authenticity, and subject matter. Candidate correction
creates a new event rather than deleting history. For material conflicts,
Hunter shows the competing values, sources, downstream impact, and recommended
resolution.

## 9. Progressive onboarding

Onboarding is source-agnostic and adaptive:

1. Detect platform capabilities and explain the current assurance level.
2. Obtain consent for accessible context and external connections.
3. Ingest any available resume, profile, portfolio, repository, credential,
   project file, conversation, or connected source.
4. If documents are absent, conduct a guided career interview.
5. Extract claims, identify conflicts, classify sensitivity, and show a concise
   verification review.
6. Build the Minimum Viable Career Graph needed for immediate useful work.
7. Generate persona hypotheses and ask the user to accept, modify, or reject
   them.
8. Capture goals, hard gates, autonomy preference, quiet hours, and resource
   mode.
9. Deliver a diagnostic, initial opportunities or sourcing plan, and the next
   highest-value actions.
10. Enrich progressively as new evidence or decisions appear.

Low-confidence onboarding enters advisory mode. Hunter may analyze and draft,
but gates unsupported external claims and risky actions.

Hunter must not depend on hidden access to another ChatGPT account, project, or
local session. The user can import exported artifacts or connect an authorized
source.

## 10. Career Persona Portfolio

### 10.1 Model

One verified candidate identity may own multiple legitimate career personas.
A persona defines:

- role family and target seniority;
- positioning statement and keyword model;
- selected evidence and permitted claims;
- resume and profile variants;
- compensation or rate strategy;
- geography, work model, and availability;
- preferred channels and outreach style;
- exclusions and conflicts;
- success measures.

Personas may span role families, seniority paths, work modes, and engagement
types. No profession or career path is hard-coded.

### 10.2 Collision protection

A shared identity-level graph prevents:

- duplicate applications to the same underlying requisition;
- contradictory pitches to the same organization or contact;
- incompatible compensation, location, availability, or eligibility claims;
- accidental disclosure of one persona's private positioning;
- multiple platform accounts where channel rules prohibit them.

Relationships are shared at identity level with persona-specific interaction
context. Funnel performance is measured per persona and at portfolio level.

### 10.3 Channel projections

Each external profile is a projection of an approved persona onto a channel's
fields and rules. Profile maintenance follows:

1. read or import the current profile;
2. map it to canonical claims;
3. compute a desired persona-specific projection;
4. show material differences and collision checks;
5. obtain the required authorization;
6. write through a compliant adapter;
7. read back and store a verification receipt.

If a channel does not support separate legitimate positioning, Hunter selects
one coherent public projection and keeps other personas in channel-appropriate
documents and outreach.

## 11. Opportunity acquisition mesh

### 11.1 Channel Registry

The registry supports:

- general and regional job boards;
- company career sites and applicant tracking systems;
- staffing and recruitment agencies;
- executive search and specialist headhunters;
- contractor, freelance, and consulting marketplaces;
- professional networks and referral paths;
- communities, associations, and events;
- inbound email, messages, and recruiter contact;
- user-submitted leads.

Each channel declares support for:

- search;
- read-profile;
- update-profile;
- save-opportunity;
- apply;
- connect;
- message;
- follow-up;
- read-status.

Dedicated adapters improve reliability. A generic web or browser adapter may
handle unknown sites only when channel rules, platform policy, and user
authorization allow it.

### 11.2 Normalization and deduplication

Hunter converts channel data into a canonical opportunity model containing
organization, role or engagement, source, canonical URL, requisition identity,
location, work mode, employment type, compensation or rate signals, skills,
seniority, eligibility, dates, contacts, description provenance, and trust
signals.

Deduplication uses source IDs, canonical URLs, organization and title
similarity, location, description fingerprints, recruiter context, and time.
Potential duplicates merge evidence while preserving all source records.

### 11.3 Trust and scam screening

Before pursuit, Hunter evaluates domain and sender authenticity, organization
existence, inconsistent descriptions, payment or credential requests,
unrealistic promises, duplicate identities, known abuse indicators, and unsafe
communication demands. Uncertain opportunities are quarantined for review.

## 12. Adaptive opportunity decision model

Decision proceeds in two stages.

### 12.1 Candidate-specific hard gates

Examples include:

- geography and work authorization;
- remote, hybrid, or onsite constraints;
- employment or engagement type;
- compensation or rate floor;
- availability and notice period;
- target or excluded organizations and sectors;
- ethical, safety, conflict-of-interest, or travel constraints;
- scam and trust checks;
- truth support for required qualifications.

A failed hard gate normally rejects the opportunity. Hunter may mark Explore
when the gate itself is uncertain and clarification has positive expected
value.

### 12.2 Multi-objective value

Passing opportunities are evaluated across:

- capability and evidence fit;
- probability of qualified progress;
- compensation or economic value;
- growth and future option value;
- scope, authority, and impact;
- lifestyle fit;
- organization and role credibility;
- network leverage;
- required effort;
- risk;
- uncertainty.

Hunter does not use one universal static score. Candidate policy supplies
weights, minimums, and trade-offs. Controlled learning may adapt tactical
weights within explicit bounds. Decisions are:

- **Pursue:** prepare for action now;
- **Explore:** acquire missing information or a relationship first;
- **Hold:** valid but lower priority or wrong timing;
- **Reject:** fails policy or has insufficient value.

Every decision includes rationale, confidence, decisive factors, missing data,
and the next reversible action. An exploration budget prevents narrow
exploitation from hiding new roles, channels, or personas.

## 13. Relationship Graph and outreach

### 13.1 Relationship model

The graph records:

- canonical person and organization identity;
- role and relationship type;
- persona relevance;
- relationship strength and trust;
- shared context and introduction paths;
- specialization for recruiters or agencies;
- interactions and commitments;
- linked opportunities;
- follow-up state;
- consent, opt-out, and communication preferences.

### 13.2 Outreach engine

Hunter prioritizes warm introduction paths, relevant recruiter specialization,
credible shared context, and genuine value. It can draft or execute outreach
according to policy, channel rules, and rate limits.

Every outreach action must:

- identify a legitimate purpose and persona;
- use supported claims only;
- personalize from real context;
- avoid manipulative or mass-spam language;
- respect opt-outs and channel controls;
- stop sequences after an appropriate response or terminal state;
- record the message, approval, delivery receipt, and response.

Success is measured by qualified replies, referrals, conversations, interviews,
and opportunities, not raw connection growth.

## 14. Engagement operations

### 14.1 Permanent employment lifecycle

The canonical states are:

~~~text
Discovered -> Enriched -> Qualified -> Selected -> Prepared
-> Approved or Authorized -> Submitted -> Screening -> Interviewing
-> Offer -> Accepted or Declined or Withdrawn or Rejected or Expired
~~~

### 14.2 Contract and consulting lifecycle

The canonical states are:

~~~text
Lead -> Qualified -> Discovery -> Scope and Fit -> Proposal
-> Negotiation -> Won or Lost -> Delivery Handoff
~~~

Lifecycle transitions are events. Invalid transitions are rejected rather than
silently coerced.

### 14.3 Immutable action packets

An application or proposal packet freezes:

- opportunity version;
- persona version;
- selected claims and evidence references;
- resume, cover letter, profile, or proposal artifacts;
- answers to channel questions;
- compensation or rate policy;
- sensitive disclosures;
- approval or autonomy authorization;
- adapter and policy versions.

Changing any material item creates a new packet version. Submission uses a
stable idempotency key. Retries cannot create a second submission or message.
Successful actions store channel confirmation, timestamps, identifiers,
screenshots or returned status where permitted, and a normalized receipt.

### 14.4 Human checkpoints

Hunter pauses for:

- CAPTCHA, MFA, and identity verification;
- unsupported sensitive or legal questions;
- claims without sufficient truth status;
- material compensation or rate disclosure outside policy;
- contract scope, IP, liability, exclusivity, or conflict issues;
- a channel flow that changed beyond adapter confidence;
- final sovereign decisions.

Failures enter a retryable queue or dead-letter queue with reason, impact,
recovery action, and whether an external side effect may already have occurred.

## 15. Interview, assessment, and deal conversion

Hunter supports:

- stage-specific company, team, role, and interviewer research;
- persona-aligned positioning and evidence-backed STAR stories;
- technical, behavioral, case, system-design, and executive preparation;
- mock interviews and feedback;
- assessment planning without impersonation or prohibited assistance;
- post-stage debriefs and evidence capture;
- thank-you and follow-up communication;
- offer normalization and comparison;
- compensation, level, scope, start date, and term negotiation;
- contract rate, payment, scope, IP, termination, and risk analysis.

Offer acceptance, decline, resignation, binding contract execution, and
high-impact legal declarations remain human-only. Hunter may analyze, recommend,
draft, and track these decisions.

## 16. Autonomy, permission, and safety kernel

### 16.1 Policy decision point

Every external side effect is represented as an Action Intent containing actor,
candidate, persona, action type, target, payload hash, claims, channel,
capabilities, reversibility, urgency, expected value, estimated resources, and
risk.

The centralized policy decision point returns exactly one outcome:

- allow;
- allow with limits;
- batch approval;
- just-in-time approval;
- human-only;
- deny.

The decision considers:

- user policy and current autonomy level;
- claim confidence and disclosure scope;
- legal, financial, privacy, and reputation risk;
- channel terms and adapter assurance;
- reversibility;
- recipient trust and relationship state;
- rate and action budgets;
- collision checks;
- prior failures and account health.

No orchestrator module or adapter may bypass this decision. An adapter must
reject expired, mismatched, or insufficient authorization.

### 16.2 Autonomy ladder

| Level | Behavior |
| --- | --- |
| Observe | Read, organize, and recommend |
| Draft | Prepare artifacts and actions without external writes |
| Batch Execute | Execute a reviewed group within declared scope |
| Whitelisted Autonomy | Execute known low-risk actions for approved targets and channels |
| Bounded Full Operations | Run a complete authorized workflow inside hard policies and budgets |

V1 supports Observe, Draft, and Batch Execute. Later promotion uses measured
claim accuracy, override rate, action error rate, conversion quality, compliance,
account health, and recovery performance. Time alone never promotes autonomy.

### 16.3 Immutable sovereignty boundary

The following remain human-only at every autonomy level:

- accepting or declining an offer;
- resigning from employment;
- signing a binding legal agreement;
- completing identity verification;
- solving CAPTCHA or providing MFA;
- making unverified claims;
- completing material legal, criminal, health, immigration, or background
  declarations without explicit confirmation;
- taking an assessment as the candidate;
- disclosing compensation outside a specific approved policy.

### 16.4 Operational controls

Hunter provides:

- dry-run mode;
- versioned policies;
- approval expiry and scope;
- action and resource budgets;
- quiet hours;
- per-channel rate limits;
- pause, cancel, and global kill switch;
- failed-action recovery;
- rollback where the channel supports it;
- receipts for all attempted side effects;
- explicit explanation for denials and escalations.

## 17. Proactive runtime

Hunter supports user, scheduled, event, condition, and system triggers. The
portable execution loop is:

~~~mermaid
flowchart TD
    A["Observe"] --> B["Normalize and prioritize"]
    B --> C["Policy decision"]
    C --> D["Act or request approval"]
    D --> E["Record receipt and learn"]
~~~

An automation definition contains:

- trigger and timezone;
- conditions and stop conditions;
- required capabilities and assurance;
- workflow and persona scope;
- policy reference;
- action and resource budgets;
- notification and quiet-hour behavior;
- retry and dead-letter policy;
- human checkpoints;
- expiry.

Tasks are idempotent. Auth failures, tool absence, platform limits, or channel
changes pause only the affected task. Hunter produces concise run summaries and
does not create notification noise for unchanged low-value state.

## 18. Controlled learning and evaluation

### 18.1 Three evaluation layers

1. **Action quality:** truth, relevance, writing quality, compliance, correct
   recipient, correct artifact, and execution integrity.
2. **Funnel performance:** replies, referrals, qualified screens, interviews,
   proposals, and stage conversion.
3. **Outcome quality:** offer or engagement quality, economic value, fit,
   retention signals, network leverage, and user satisfaction.

### 18.2 Experiment model

An experiment records hypothesis, persona, treatment versions, eligible
population, sample size, start and stop rules, result, uncertainty, and
decision. Hunter may test positioning, resume framing, outreach, channels,
timing, and prioritization.

Safeguards are:

- no unsafe conclusion from a small or biased sample;
- no optimization for application or message volume;
- no uncontrolled core-policy rewrite;
- shadow-mode comparison before material strategy changes;
- user-private learning by default;
- cross-user learning only through explicit opt-in and privacy-preserving
  aggregation;
- exploration minimums so a temporarily weak persona or channel is not
  permanently starved.

Event replay supports regression evaluation and autonomy-promotion evidence.

## 19. Security, privacy, and trust model

### 19.1 Data classes

| Class | Examples | Default handling |
| --- | --- | --- |
| Public | Published portfolio, public profile | Normal processing |
| Career confidential | Resume history, pipeline, compensation preference | Candidate-only |
| Sensitive | Eligibility, protected traits, background details | Minimize and purpose-bind |
| Secret | Passwords, MFA, recovery codes, raw auth tokens | Never store in vault |
| External untrusted | Job descriptions, web pages, messages, attachments | Treat as data, never instructions |

### 19.2 Prompt-injection resistance

External pages, job descriptions, recruiter messages, attachments, and
community extensions are untrusted inputs. Text inside them cannot change
Hunter policy, request secrets, authorize tools, or redefine system
instructions.

Hunter:

- separates instructions from retrieved data;
- parses external content into typed schemas;
- ignores and flags embedded instructions aimed at the agent;
- exposes only the minimum tool scope to each workflow;
- validates action targets and payloads after generation;
- re-runs policy immediately before the side effect;
- records suspicious input and affected decisions.

### 19.3 Privacy controls

The core has no embedded user data. A central service is not a V1 dependency.
Telemetry is off by default. Users can export, delete, reset, redact, or move
their vault. Data access is least-privilege, purpose-bound, and retention-aware.

If the host cannot provide adequate protection for a requested sensitive
operation, Hunter warns the user and either uses an ephemeral flow or refuses
persistent handling.

## 20. Global localization

Hunter is global by design. Candidate and opportunity models include:

- country, region, and time zone;
- work eligibility and sponsorship context;
- conversation language and separate application language;
- currency, compensation period, rate units, and uncertainty;
- work mode and travel expectations;
- availability and notice conventions;
- localized resume, date, terminology, and interview norms;
- accessibility preferences.

Country-specific laws, visas, tax treatment, worker classification, and
regulated disclosures must be verified from current authoritative sources at
the time of use. Hunter distinguishes information from professional advice and
surfaces uncertainty. Locale packs supply terminology, channel mappings, and
conventions but cannot weaken global safety policy.

## 21. Conversational experience and optional dashboard

Natural language is the primary interface. Commands are optional. The user can
ask Hunter to find work, review positioning, update profiles, prepare a batch,
explain a rejection, pause automation, or compare offers conversationally.

Structured views are:

- Today;
- Opportunities;
- Personas;
- Profiles;
- Applications and Engagements;
- Network;
- Interviews;
- Offers and Deals;
- Automations;
- Approvals;
- Audit.

Platforms with interactive UI can render these as a dashboard. Platforms
without UI render equivalent Markdown or conversational summaries. The
dashboard is a projection of the vault and never a separate source of truth.

## 22. Resource governance

Hunter separates compute resources from reputation-bearing external actions.
Budgets may cover model usage, tool calls, browser time, storage, elapsed time,
applications, messages, connections, and follow-ups.

User modes are:

- **Balanced:** recommended default;
- **Economy;**
- **Maximum Results;**
- **Custom.**

Before material work, the planner considers expected value, urgency, cost,
risk, and available budget. It may batch, cache, deduplicate, incrementally
refresh, use an economical capability for routine classification, and reserve
stronger capabilities for consequential reasoning and artifacts.

Budget pressure reduces breadth, refresh frequency, or concurrency. It never
permits fabricated claims, weaker privacy, policy bypass, spam, or unsafe
execution. Users receive understandable daily or weekly usage and outcome
summaries. There are no hidden Hunter charges. Host subscriptions, paid portals,
and third-party services remain external costs.

## 23. Capability manifest and conformance

### 23.1 Adapter manifest

Each adapter declares:

- adapter and platform name and version;
- supported Hunter protocol range;
- capability operations;
- authentication method;
- read and write scopes;
- side-effect risk classes;
- approval and human checkpoint support;
- rate and quota behavior;
- idempotency and receipt guarantees;
- rollback support;
- metering availability;
- data residency or retention constraints where known.

At startup, Hunter negotiates capabilities and produces a Capability Report
showing available, degraded, unavailable, and approval-required workflows plus
the current assurance level.

### 23.2 Conformance suite

An adapter cannot be labeled compliant until it passes:

- canonical vault import, export, and replay;
- evidence provenance preservation;
- policy non-bypass;
- action-intent and receipt correlation;
- idempotent retry;
- failure and degraded-mode behavior;
- candidate and tenant isolation;
- persona collision protection;
- capability-report accuracy;
- kill-switch behavior;
- audit completeness;
- migration compatibility.

Official, Verified Community, Experimental, and Blocked status are distinct and
visible to users.

## 24. Packaging, installation, and updates

### 24.1 Independently versioned units

- Hunter Core and Protocol;
- vault and event schemas;
- platform adapters;
- domain packs;
- locale packs;
- evaluation suite;
- candidate vault schema version.

Semantic versioning is used for packages. Schema compatibility is declared
explicitly rather than inferred from package version.

### 24.2 Package layout

The distributable bundle contains:

~~~text
hunter/
  SKILL.md
  manifest.yaml
  skills/
  schemas/
  workflows/
  policies/
  migrations/
  packs/
  adapters/
  evals/
  examples/
~~~

The user installs one Hunter bundle. Individual skills are internal modules,
not separate onboarding tasks. Skills contain reusable product logic only;
candidate facts, credentials, applications, and relationship history remain in
the Career Vault or authorized external sources.

### 24.3 Installation routes

| Platform | Default route |
| --- | --- |
| ChatGPT Work | Add the Hunter plugin, start a chat, review permissions |
| Agent Skills platform | Import or install the Hunter skill bundle |
| MCP-capable platform | Install the skill bundle; optionally connect Hunter MCP capabilities |
| Local or minimal agent | Place the bundle and vault in an accessible filesystem location |

Normal users do not need a CLI, server, database, or Hunter API key. Advanced
deployment mechanisms remain optional.

### 24.4 First-run contract

First run:

1. detects or creates a vault;
2. negotiates platform capabilities;
3. explains data and permission defaults;
4. ingests documents or starts guided onboarding;
5. creates the Minimum Viable Career Graph;
6. proposes personas and policies;
7. generates the first diagnostic and action set;
8. defaults to Observe and Draft until authorization changes.

Acceptance targets are no more than three simple installation actions, a useful
result within ten minutes with a resume, and within fifteen minutes without one.

### 24.5 Safe update flow

1. Verify package signature and integrity.
2. Check core, schema, adapter, pack, and vault compatibility.
3. Snapshot the vault.
4. Dry-run migrations.
5. Replay representative events.
6. Run policy and adapter conformance tests.
7. Explain material policy or autonomy changes and obtain consent.
8. Activate atomically.
9. Roll back on failed health checks.

## 25. Distribution and governance

Hunter Core, protocol, schemas, SDK, official reference adapters, and baseline
career workflows are free under Apache-2.0. The specification is public and
vendor-neutral. Commercial use and independent implementations are permitted.

Community extensions declare permissions and compatibility. Official releases
are signed. Extensions cannot replace or weaken the policy kernel. Governance
begins maintainer-led and evolves through a public request-for-comments process
for protocol and schema changes.

Future paid hosted conveniences may exist, but the portable core, user-owned
vault, baseline career workflows, and reference local adapters remain free.
No hosted service may become necessary to export or operate a compatible vault.

The Hunter name is the working product identity. A naming and trademark
clearance check is a public-release gate, not a license restriction on the open
protocol.

## 26. Failure handling

Hunter uses explicit failure categories:

| Category | Required behavior |
| --- | --- |
| Missing capability | Offer the best draft, manual, or export fallback |
| Authentication expired | Pause affected actions and request reconnection |
| Rate or quota limit | Reschedule within policy; never evade the limit |
| Channel changed | Stop writes, preserve evidence, and require adapter review |
| Ambiguous external result | Mark outcome unknown and prevent blind retry |
| Partial side effect | Reconcile from channel state before any retry |
| Vault conflict | Preserve both events and run deterministic conflict resolution |
| Claim conflict | Block affected publication and request resolution |
| Policy denial | Explain the controlling rule and safe alternatives |
| Suspicious content | Quarantine input and flag injection or scam risk |
| Resource exhaustion | Reduce breadth or defer; preserve safety floors |

Dead-letter items include correlation ID, attempted action, last known external
state, risk of duplication, recovery owner, and suggested next step.

## 27. Testing and evaluation strategy

### 27.1 Test layers

- schema and policy unit tests;
- deterministic projection and migration tests;
- property tests for event replay, idempotency, and isolation;
- adapter contract tests with recorded fixtures;
- golden career journeys across professions and locales;
- adversarial prompt-injection, scam, and malicious-extension tests;
- browser and channel change simulations;
- multi-persona collision tests;
- approval expiry and kill-switch tests;
- import, export, corruption, backup, and rollback tests;
- human evaluation of recommendation and artifact quality;
- shadow-mode comparisons before autonomy promotion.

### 27.2 Representative evaluation matrix

Public V1 evaluation includes:

- early-career, experienced individual contributor, leader, career changer, and
  independent consultant;
- technical and nontechnical professions;
- permanent-only, contract-only, and mixed portfolios;
- one and multiple personas;
- resume-rich and no-document onboarding;
- multiple countries, languages, work modes, and compensation conventions;
- rich-tool and minimal-tool platforms;
- clean, conflicting, stale, and malicious source data.

The minimum release corpus contains thirty end-to-end golden journeys spanning
at least six profession families, five career-stage or engagement archetypes,
three countries, three application languages including one non-Latin script,
one- and multi-persona portfolios, and both minimal-tool and connected-tool
runtimes. No one fixture is expected to represent an entire profession or
country; this corpus proves genericity and safe degradation.

At least eighty percent of human-reviewed resumes, outreach packets, interview
briefs, and opportunity rationales must be rated usable with minor edits or
better. All material external claims in every evaluated artifact must pass
traceability checks. Any critical truth, permission, isolation, secret-handling,
or duplicate-action failure blocks release regardless of aggregate quality.

### 27.3 Non-negotiable release gates

Public V1 requires:

- every externally used claim is traceable to eligible evidence or explicit
  attestation;
- zero unauthorized external actions in the release suite;
- every side effect has a policy decision and receipt;
- zero duplicate submissions or messages under retry and reconciliation tests;
- all candidate and tenant isolation tests pass;
- vault export/import, deterministic replay, migration, and rollback pass;
- prompt-injection and malicious job-description tests pass;
- secrets are absent from vault fixtures and persistence paths;
- kill switch and failed-action recovery are verified;
- unsupported connectors produce a usable fallback;
- representative multi-profession, multi-locale, and multi-persona journeys
  meet their stated tasks;
- installation and time-to-value targets pass at the ninetieth percentile
  across at least ten representative nontechnical test users.

Quality metrics may improve over time, but security, truth, sovereignty, and
receipt gates are not averaged away by other scores.

## 28. Success metrics

Primary product outcomes are:

- qualified opportunities per unit of user effort;
- recruiter, referral, and relevant-network response quality;
- screening, interview, proposal, and offer conversion;
- offer or engagement quality;
- candidate time saved;
- evidence accuracy and freshness;
- low override, failure, duplicate, and complaint rates;
- long-term network and market-position improvement;
- vault portability and successful recovery.

Guardrails include opt-out compliance, account health, user-reported trust,
policy-denial correctness, sensitive-data minimization, and channel
compliance. Raw applications, messages, and connections are never standalone
success metrics.

## 29. Release decomposition

This document is an umbrella architecture contract. Building it as one
implementation plan would create excessive coupling and unverifiable progress.
Implementation is divided into independently testable slices that preserve the
approved boundaries.

### Slice 0: Foundation

Deliver:

- repository and package boundaries;
- public protocol and manifests;
- canonical JSON Schemas;
- event envelope and filesystem Career Vault;
- deterministic projections and export/import;
- evidence status and disclosure primitives;
- action-intent, policy-decision, and receipt contracts;
- baseline policy kernel;
- capability negotiation;
- reference filesystem adapter;
- conformance harness and golden fixtures;
- migration and replay framework.

This is the next implementation plan.

### Slice 1: Career intelligence

Deliver progressive onboarding, claim extraction review, Career Graph,
multi-persona portfolio, hard gates, opportunity model, and conversational
views using fixture and imported data.

### Slice 2: Acquisition workflows

Deliver source normalization, deduplication, adaptive decision workflow,
relationship graph, outreach packets, profile projections, job application
packets, contract proposals, and lifecycle state machines.

### Slice 3: Reference platform experience

Deliver the ChatGPT Work plugin, unified Hunter skill bundle, permissions
onboarding, document workflows, portable vault integration, and no-connector
fallback. Validate the three-action and time-to-value targets.

### Slice 4: Connected operations

Deliver selected search, browser, messaging, calendar, and MCP adapters;
batch approvals; idempotent action execution; reconciliation; notifications;
and proactive schedules.

### Slice 5: Public V1 hardening

Deliver localization baseline, community adapter controls, supply-chain
signing, threat testing, accessibility, documentation, recovery exercises,
representative journey evaluation, and release gates.

### Post-V1

Expand channel coverage, domain and locale packs, advisor mode, interactive
dashboard, privacy-preserving aggregate learning, whitelisted autonomy, and
eventually bounded full operations. Each autonomy expansion requires its own
design, threat review, evidence thresholds, and release gate.

## 30. Public V1 capability boundary

Every public V1 user can:

- onboard from documents or guided conversation;
- create an evidence-backed Career Graph;
- manage multiple personas;
- discover or import opportunities;
- qualify and prioritize them;
- tailor resumes, profiles, proposals, and outreach;
- build approval batches;
- manage job, contract, network, interview, and offer pipelines;
- export, import, audit, pause, and reset Hunter.

When suitable tools exist, Hunter can execute approved profile updates,
applications, outreach, follow-ups, and scheduling. When they do not, Hunter
produces application-ready artifacts, exact manual steps, and a tracked
handoff. Core usefulness never depends on universal portal coverage.

V1 autonomy ends at Batch Execute. The product architecture supports later
levels but does not market or silently enable them.

## 31. Day-1 user journey acceptance scenario

A new user adds Hunter and provides either a resume or answers the guided
interview. Hunter explains accessible context and permissions, builds a small
reviewable Career Graph, identifies conflicts, proposes legitimate personas,
captures goals and hard gates, and shows a capability report.

Within the target time, the user receives:

- a concise positioning and profile diagnostic;
- persona recommendations;
- prioritized immediate actions;
- either relevant starter opportunities or a concrete sourcing plan;
- an explanation of what Hunter can execute versus draft on the current
  platform;
- a portable vault initialized without credentials.

The user can then request permanent roles, contract work, recruiters,
connections, profile updates, or a mixed strategy. Hunter maintains separate
funnels and shared collision protection. External writes remain drafts until
the user approves an action batch.

## 32. Approved architectural decisions

This specification records the following settled decisions:

- universal product, not candidate-specific automation;
- platform-neutral core with ChatGPT Work as the first fully supported adapter;
- Agent Skills as the portable workflow format and MCP as an optional
  capability bridge;
- user-owned event-sourced Career Vault;
- evidence-tiered Career Graph with truth separated from disclosure;
- multi-persona support under one honest identity;
- permanent, contract, and relationship funnels;
- adaptive multi-objective opportunity decisions;
- channel registry with dedicated adapters and compliant generic fallback;
- centralized policy kernel and batch approval in V1;
- bounded full operational autonomy as a measured future target;
- conversational core with optional dashboard;
- proactive event and schedule runtime;
- global-by-design localization;
- capability manifests and conformance testing;
- free, zero-infrastructure, community-first distribution;
- Apache-2.0 open core;
- safe package versioning and vault migration;
- public V1 universal usefulness with progressive connector coverage.

## 33. Standards baseline

Hunter's portability contracts align with:

- [Agent Skills specification](https://agentskills.io/specification);
- [Model Context Protocol specification](https://modelcontextprotocol.io/specification/2025-11-25);
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12);
- [Semantic Versioning](https://semver.org/);
- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

These standards are dependencies at their declared interfaces, not permission
to inherit platform-specific assumptions into Hunter Core.

## 34. Implementation handoff rule

No production implementation begins from this umbrella document as one
unbounded task. After written-spec approval, the next artifact is a detailed,
test-driven implementation plan for **Slice 0: Foundation** only. Later slices
receive their own implementation plans and preserve the public contracts
defined here.
