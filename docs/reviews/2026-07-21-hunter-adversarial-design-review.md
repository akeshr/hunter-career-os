# Hunter Adversarial Design Review

| Field | Value |
| --- | --- |
| Review date | 2026-07-21 |
| Reviewed specification | Hunter Product and Technical Architecture Specification 1.0.0-review |
| Reviewed commit | 9d6175a |
| Review mode | Product, architecture, security, privacy, operations, distribution, and channel red-team |
| Verdict | No-go for implementation as currently sliced |

## 1. Executive verdict

Hunter has an unusually strong product vision and several excellent safety
ideas. It is not yet an implementation-ready architecture.

The design currently tries to make all of the following true at once:

- universal for every profession and geography on public Day 1;
- free and open source;
- no server, database, CLI, or Hunter API key;
- platform-neutral;
- persistent and proactive;
- able to authenticate to external systems;
- able to update profiles, send outreach, and submit applications;
- governed by one enforceable policy kernel;
- portable across platforms;
- privately owned and erasable;
- eventually highly autonomous.

Those properties do not compose without trade-offs. In particular, skills-only
operation can be free and zero-infrastructure, but cannot provide deterministic
policy enforcement, durable cross-platform state, OAuth-backed actions, or
reliable background execution. An MCP-backed action plane can provide those
things, but it is a service that must be deployed, secured, operated, and paid
for by someone.

If implementation starts with Slice 0 as written, the most likely failure is a
well-designed protocol, schema set, and vault framework with no validated
end-to-end career workflow and no reliable public action surface.

The correct response is not to shrink the ultimate vision. It is to separate:

1. universal guided usefulness;
2. locally enforced operations;
3. remotely connected operations;
4. channel-specific automation;
5. future bounded autonomy.

## 2. Scorecard

Scores measure current specification maturity, not the value of the vision.

| Dimension | Score | Assessment |
| --- | ---: | --- |
| Problem selection and product vision | 9/10 | Real, valuable, differentiated, and broad enough to matter |
| User sovereignty and ethical intent | 8/10 | Strong boundaries; several enforcement details are missing |
| Modular conceptual architecture | 7/10 | Good module separation, but too many contracts precede validation |
| Current platform feasibility | 4/10 | Skills, plugins, MCP, storage, and schedules are treated as more interchangeable than they are |
| V1 scope discipline | 2/10 | Public V1 is several products and infrastructure layers combined |
| Privacy and data lifecycle | 4/10 | Good principles; append-only state conflicts with erasure and minimization |
| Action safety | 5/10 | Excellent intent; no guaranteed mediation boundary yet |
| Channel feasibility and compliance | 3/10 | Dedicated adapters are plausible; generic automation is unsafe and frequently prohibited |
| Global and profession generality | 4/10 | Generic schemas are possible; universal operational competence is not proven |
| Distribution and installation | 4/10 | Plugin packaging is plausible; public review and action hosting break the current promise |
| Testing and evaluation | 6/10 | Strong categories, weak proof for universality and real-world side effects |
| Open ecosystem strategy | 6/10 | Attractive, but trust, signing, governance, and maintenance are unfunded |

**Overall:** strong thesis, credible long-term architecture direction, no-go for
implementation without a 1.1 redesign.

## 3. Review method and permutation coverage

Literal enumeration of all scenario permutations would be performative rather
than useful. Ten relevant axes already produce 2,880,000 raw combinations:

| Axis | Values considered |
| --- | --- |
| Starting data | Rich, single resume, conflicting, sparse, none |
| Persona topology | One, adjacent multiple, divergent multiple, delegated multi-candidate |
| Funnel | Employment, contract, mixed |
| Locale risk | Familiar, cross-border, regulated, unsupported |
| Runtime | Skills-only, local, connected, scheduled |
| Channel | Official read, official write, browser-assisted, prohibited |
| Autonomy | Observe, Draft, Batch, Whitelisted, Bounded |
| Failure | None, auth, quota, timeout, partial action, channel change |
| Threat | Injection, scam, malicious extension, compromised adapter, vault theft |
| Storage | Ephemeral, host file, local vault, remote vault, concurrent replicas |

This review therefore used:

- pairwise coverage across all axes;
- every high-risk boundary pair;
- high-risk triples involving action plus uncertainty plus irreversibility;
- lifecycle transitions and failure recovery;
- privacy deletion, migration, and compromise cases;
- current platform and channel constraints.

## 4. P0 blockers

P0 means the issue blocks implementation of the current slice or makes a public
promise materially false.

### P0-1: The execution-plane contradiction

**Prosecution**

The specification says a normal user needs no server while also promising
authenticated profile updates, messages, applications, scheduling, receipts,
and policy-enforced side effects. Agent Skills are instructions with optional
scripts whose runtime support varies by agent. They are not a durable action
service. OpenAI's current app model assigns authentication and authoritative
tool behavior to an MCP server reachable over HTTP.

There is no free architectural magic that removes OAuth callbacks, token
storage, webhook handling, rate limiting, reconciliation, and uptime.

**Strongest defense**

Platform-native connectors may supply authentication and actions. Guided mode
remains useful without them. The design already includes capability
negotiation and assurance levels.

**Judgment**

The defense saves the vision, not the current product contract. The deployment
profiles must be explicit. "No server required" may apply to Guided mode, not
to all connected operations.

**Required change**

Define three first-class products:

| Profile | Infrastructure | Valid promise |
| --- | --- | --- |
| Guided | Skill plus user/host files | On-demand analysis, drafts, packets, manual handoff |
| Local Enforced | Local runtime and encrypted local vault; device available | Deterministic policy, local schedules, user-present computer assistance |
| Connected Enforced | Hosted or user-hosted MCP action plane and durable store | OAuth, remote schedules, webhooks, connected writes, reconciliation |

### P0-2: The policy kernel is not yet an enforcement boundary

**Prosecution**

The design says no module or adapter can bypass policy, but it does not prevent
the host model from calling a connected write tool directly. A skill can tell a
model to use a policy kernel; it cannot make the instruction unbypassable.
Platform approval prompts are valuable but are not equivalent to Hunter's
candidate, claim, persona, collision, and channel policies.

Calling the auditor "independent" is also inaccurate if it uses the same model,
context, tools, and mutable instructions as the planner.

**Strongest defense**

The assurance-level model correctly avoids claiming autonomous enforcement in
Guided mode. Adapters can reject authorization that is expired or does not
match a target and payload.

**Judgment**

The conceptual policy contract is strong. The topology is missing.

**Required change**

- Treat the model and every skill as untrusted planners.
- Expose no consequential write tool directly to the planner.
- Put all writes behind one deterministic Hunter Action Gateway.
- Bind authorization to canonical target, persona, claim set, payload,
  expiry, and idempotency key.
- Re-run deterministic validation inside the gateway immediately before the
  side effect.
- Rename Independent Auditor to Safety Verifier unless it has a genuinely
  separate trust boundary.
- Use a separate model only as an additional critic, never as the enforcement
  mechanism.

### P0-3: The Career Vault cannot be append-only, private, portable, concurrent,
and erasable in its current form

**Prosecution**

The canonical vault stores career facts, relationships, actions, approvals, and
outcomes in append-only JSONL. The same specification promises deletion,
redaction, portability, deterministic replay, and platform transfer.

Unresolved contradictions include:

- deleting a sensitive claim while retaining old events, snapshots, exports,
  hashes, and receipts;
- storing third-party contact data about recruiters and relationships;
- encryption and key ownership;
- cross-stream ordering for deterministic replay;
- partial JSONL appends;
- atomic action plus receipt recording;
- concurrent edits from two platforms or devices;
- large-file compaction and indexing;
- user revocation after an advisor has exported data;
- host-provider logs outside the vault.

An integrity hash detects change only if a trusted expected value exists. It
does not establish authenticity by itself.

**Strongest defense**

Event sourcing is well suited to audit, migration, debugging, causal history,
and outcome evaluation. The specification permits a transaction-safe native
store and treats JSONL as interchange.

**Judgment**

Keep logical events. Do not use the current JSONL layout as the reference live
store.

**Required change**

Create Vault v2 with:

- an encrypted mutable fact store for candidate and third-party personal data;
- an immutable audit journal containing minimal metadata, hashes, and opaque
  references rather than raw sensitive payloads;
- separate encrypted artifacts;
- per-record or per-subject encryption keys for cryptographic erasure;
- explicit retention and deletion semantics;
- single-writer V1 semantics;
- portable canonical export generated from the live store;
- merge and multi-device sync deferred until separately designed;
- a third-party data policy for contacts, messages, and inferred relationship
  attributes.

### P0-4: Channel automation is not a generic capability

**Prosecution**

The Channel Registry presents apply, connect, message, update-profile, and
read-status as adapter operations. In reality:

- some networks explicitly prohibit unauthorized bots;
- many public job APIs are employer-facing, not candidate-facing;
- candidate submission endpoints may require an employer's API key;
- browser forms change without notice;
- platform approval from the user does not override channel terms;
- a receipt may be unavailable or unverifiable;
- duplicate submissions may happen despite a local idempotency key;
- automated outreach can trigger spam, privacy, or account-health problems.

LinkedIn's current User Agreement, for example, prohibits unauthorized bots for
access, contacts, and messages. Greenhouse exposes public job reads, but its
application POST requires a Job Board API key held by the organization.

**Strongest defense**

The design already conditions generic browser use on channel rules and provides
manual fallback. Dedicated adapters and capability declarations can prevent
overclaiming.

**Judgment**

"Generic browser fallback" remains too permissive for consequential actions.
User authorization is necessary but not sufficient.

**Required change**

Every channel and operation must have one explicit status:

- Official Read;
- Official Write;
- Assisted Human Action;
- Manual Handoff;
- Prohibited.

Unknown write operations default to Manual Handoff, not browser automation.
Computer assistance should require the user to be present and channel policy to
permit it. Add right-to-represent, recruiter ownership, agency submission, and
duplicate-source rules.

### P0-5: Slice 0 optimizes architecture before proving the product

**Prosecution**

The specification has 34 major sections, roughly 90 component-level headings,
and more than forty normative terms. Slice 0 alone contains repository
boundaries, schemas, events, a vault, projections, import/export, evidence,
disclosure, policy, capabilities, adapters, conformance, migrations, replay,
and fixtures.

No real user receives a career outcome from that slice.

The design risks building a universal protocol for workflows that have not yet
been observed in a complete reference journey.

**Strongest defense**

Career actions are consequential. Retrofitting truth, permission, audit, and
idempotency after building automation would be reckless.

**Judgment**

The deterministic safety spine must come first, but it should be built inside a
walking skeleton, not as a platform project in isolation.

**Required change**

The first implementation slice should complete exactly one journey:

1. ingest a resume or guided interview;
2. create a minimal claim graph;
3. create one or more user-approved personas;
4. import or read one opportunity;
5. qualify it with an explanation;
6. tailor one artifact;
7. create an immutable application packet;
8. hand off submission to the user;
9. record outcome and export the vault.

Implement only the schemas, events, policy rules, and storage needed by that
journey. Generalize after the flow survives real use.

### P0-6: Portable proactivity has no portable state substrate

**Prosecution**

The design defines portable schedules and triggers, but scheduling behavior is
platform-specific. Current ChatGPT web schedules can use uploads and connected
services but do not retain a local folder. Local project schedules require the
device and desktop app to remain available. A local vault therefore cannot
support reliable web proactivity, while a remote vault reintroduces service
infrastructure.

Event triggers also require webhooks, polling, or connectors. None are free in
the architectural sense.

**Strongest defense**

The automation definition is portable even when execution is not. Capability
negotiation can report schedules as unavailable.

**Judgment**

The definition can remain, but "proactive" must be scoped per deployment
profile. Guided mode is on-demand. Local schedules are best-effort. Connected
schedules can be durable.

### P0-7: Universal architecture is being marketed as universal competence

**Prosecution**

Generic schemas can represent many professions. They do not make the system
competent in regulated credentials, union rules, portfolios, auditions,
clearances, academic hiring, public-sector applications, medical licensing,
cross-border contracting, local resumes, visas, tax, or accessibility.

Thirty golden journeys across six profession families and three countries
cannot prove "any profession and geography." The statement is structurally
unfalsifiable.

**Strongest defense**

Hunter can always fall back to advisory help, guided intake, current research,
and manual handoff. Domain and locale packs improve depth without becoming
eligibility gates.

**Judgment**

Universal access is valid. Universal operational competence is not.

**Required change**

Use explicit competence levels:

- Generic Advisory;
- Locale-Aware;
- Domain-Validated;
- Channel-Operational.

Every high-stakes recommendation shows its current level. Unsupported legal,
licensing, immigration, tax, and regulated-profession work remains research
assistance plus human review.

## 5. P1 risks

P1 means resolve before public beta or before enabling the affected capability.

| Risk | Brutal finding | Minimum response |
| --- | --- | --- |
| Brand collision | "Hunter" is already used by a direct AI job-search product and by a major outreach product | Treat Hunter as a codename; complete naming and trademark clearance before creating a public identity |
| Third-party privacy | The Relationship Graph stores data and inferences about people who are not the candidate | Add lawful-purpose, minimization, provenance, retention, objection, and deletion handling |
| Identity semantics | "Verified human identity" is undefined and could imply KYC | Define it as a stable candidate anchor unless a channel separately performs identity verification |
| Protected attributes | Fit and probability models may learn proxies for age, disability, ethnicity, family status, or other protected traits | Prohibit discriminatory optimization; separate accommodation preferences from ranking; add fairness evals |
| Right-to-represent | Recruiters can submit a candidate to the same employer and create ownership disputes | Model agency representation, consent window, requisition scope, and expiration |
| Application state | The linear state machine does not model parallel interviews, regression, reopening, multiple offers, or referrals added after submission | Use stage instances and an event graph, not one linear enum |
| Idempotency claim | A local key cannot guarantee a third-party platform will not duplicate an action | State the guarantee as local duplicate suppression plus remote reconciliation |
| Receipt trust | An adapter can return a false or incomplete receipt | Grade receipt evidence and independently read back when possible |
| Experiment validity | One user's career funnel is sparse and highly confounded; live A/B tests consume reputation | V1 uses versioning, user corrections, and observational learning; no autonomous live experiments |
| Autonomy promotion | Conversion quality is slow, biased, and not a safety measure | Separate safety reliability from business outcomes; require per-capability evidence |
| Outreach law | Opt-out tracking alone does not establish a lawful basis or channel permission | Add locale/channel outreach policy and default to drafts |
| Data ownership wording | The candidate does not exclusively own provider logs, third-party source data, or copies held by recipients | Promise user control and portability, not exclusive ownership of every copy |
| Host privacy | "Private" depends on the host, model, connected apps, and their retention | Show a data-flow disclosure and provider-specific privacy statement |
| Supply-chain trust | Signed releases do not define who holds keys, how keys rotate, or how compromised extensions are revoked | Define root of trust, revocation, update transparency, and reproducible builds |
| Community verification | Verified Community status implies a security review program and ongoing maintenance | Do not launch the label until governance and review capacity exist |
| Sustainability | Free core does not fund OAuth hosting, adapter repairs, security response, or public review work | Publish a sustainability model without gating export or core use |
| Accessibility | A language field is not an accessible onboarding experience | Test keyboard, screen reader, cognitive load, low-literacy, and mobile-only journeys |
| Scam confidence | A false "safe" label could create harm | Use risk signals and uncertainty; never certify an opportunity as safe |
| Secrets outside vault | Saying where secrets do not live does not define where they do live | Specify platform secret stores, token scopes, rotation, revocation, and incident response |
| Approval fatigue | Batch approval can hide material differences across actions | Show diffs, grouped risk, exceptions, and per-item removal before execution |

## 6. Dialectical review of major choices

| Choice | Best argument for it | Best argument against it | Judgment |
| --- | --- | --- | --- |
| Platform-neutral core | Prevents lock-in and makes the product durable | Lowest common denominator can erase useful platform guarantees | Keep the protocol narrow; allow capability-specific extensions |
| Agent Skills portability | Open, inspectable, easy to distribute | Skills are instructions, not deterministic runtime or security | Keep for guided workflows only |
| MCP adapter | Open tool boundary with auth and structured results | Requires a deployed security-sensitive service | Make it the Connected profile, not a free/no-infra assumption |
| Event sourcing | Excellent audit, replay, migration, and learning substrate | Dangerous for PII erasure and overcomplicated for early product validation | Keep minimal audit events; separate sensitive mutable data |
| Multi-persona portfolio | Reflects how real careers work and is genuinely differentiated | Can fragment a brand and create contradictory employer interactions | Keep, with organization-level coherence and user confirmation |
| Adaptive opportunity value | Better than one universal fit score | Unobservable inputs and bias can create false precision | Use explainable decision vectors; avoid probability theater |
| Relationship graph | Finds hidden opportunities and compounds over time | Stores third-party personal data and invites spam automation | Keep minimal and consent-aware; draft-first outreach |
| Batch execution | Practical bridge to autonomy | Approval is not compliance and can conceal differences | Keep only behind deterministic gateway and channel permission |
| Independent auditor | A second check is essential | Same-model self-review is not independent | Replace with deterministic verifier plus optional secondary critic |
| Optional dashboard | Chat makes onboarding natural | Multi-funnel state, diffs, approvals, and audit become unreadable in chat | Chat-first; structured UI becomes required for connected operations |
| Global-by-design | Correct schema decision and prevents later lock-in | Global Day-1 quality is impossible to prove | Keep global data model; publish competence levels |
| Open-source core | Trust, portability, community, and adoption | Maintainer burden and malicious forks/extensions | Keep Apache-2.0; invest in trust and release governance later |
| No central service | Privacy, resilience, and zero lock-in | Breaks sync, remote schedules, OAuth, webhooks, and easy multi-device use | No mandatory service; allow user-chosen connected service |
| Live learning | Can improve strategy for the individual | Sparse, confounded outcomes and reputational experiment cost | Observational learning only in V1 |
| Conformance suite | Essential for trustworthy portability | Premature before one adapter and flow are proven | Build tests for the walking skeleton, then extract conformance |

## 7. Scenario stress matrix

Legend:

- **Green:** coherent under the current contract;
- **Amber:** possible only with explicit degradation or human control;
- **Red:** unsafe, contradictory, or undefined today.

| Scenario | Status | Finding |
| --- | --- | --- |
| One resume, one persona, skills-only platform, draft request | Green | Core guided value is credible |
| No documents, guided interview, first diagnostic in fifteen minutes | Amber | Useful hypothesis is possible; verified graph is not |
| Conflicting resumes and profile dates | Amber | Claim statuses help, but resolution UX is unspecified |
| Two adjacent personas with separate resumes | Green | Strong use case if shared claims remain coherent |
| Divergent personas targeting the same organization | Red | Needs organization-level persona selection and contact collision rules |
| Employment and consulting funnels in parallel | Amber | Model is sound; availability, conflict, and disclosure rules need depth |
| Skills-only platform asked to submit applications | Red | No enforceable action plane |
| No persistent writable storage | Red | Portable continuity promise fails; only ephemeral mode is possible |
| Web-scheduled task with a local filesystem vault | Red | Current web scheduler cannot retain the local folder |
| Desktop local schedule while the device is off | Red | Best-effort local automation cannot meet durable proactive expectations |
| Official read-only job API | Green | Good discovery source with provenance |
| Candidate tries to use employer-authenticated ATS submission API | Red | Credentials and authorization model do not match the candidate |
| Unknown portal with browser automation | Red | Must default to manual handoff |
| User-present computer assistance on a permitted site | Amber | Feasible with per-step confirmation and reconciliation |
| Channel explicitly prohibits bots | Red | Deny automation even if the user approves it |
| Submission times out after final click | Amber | Reconcile before retry; may remain Unknown permanently |
| Two recruiters request right-to-represent for the same employer | Red | Missing representation and ownership model |
| Malicious prompt hidden in a job description | Amber | Typed parsing helps; skills-only execution still lacks a hard boundary |
| Malicious community extension | Red | Signing without trust-root and revocation design is insufficient |
| Compromised adapter fabricates a receipt | Red | Receipt trust grades and independent read-back are missing |
| User requests GDPR-style erasure | Red | Current append-only payload design cannot guarantee it |
| Two devices edit one JSONL vault concurrently | Red | No merge or single-writer rule |
| User loses access to the host platform | Amber | Export helps only if the vault remains independently accessible |
| Cross-border opportunity with uncertain visa status | Amber | Explore plus authoritative research and human confirmation |
| Regulated profession in an unsupported country | Red | Must not imply operational competence |
| Voluntary demographic or accommodation questions | Amber | Needs an explicit protected-data and human-confirmation workflow |
| High-volume cold recruiter outreach | Red | Reputation, channel, privacy, and anti-spam risks |
| Contract proposal containing IP and liability terms | Amber | Draft and flag; professional review remains necessary |
| Non-Latin application language | Amber | Model capability is not validated locale competence |
| Screen-reader or low-literacy onboarding | Amber | Not covered by current acceptance matrix |
| One-user strategy A/B test | Red | Too sparse and confounded for reliable causal learning |
| Public ChatGPT plugin installation from official directory | Amber | Can meet low-friction target only after submission and review |
| GitHub marketplace installation | Amber | Viable developer path, not universal three-action onboarding |
| Public launch under the name Hunter | Red | Direct category collision exists; clearance required |
| Offline local use for resume and opportunity analysis | Green | Good guided fallback if models/tools are locally available |
| Kill switch during an in-flight remote submission | Amber | Prevents future actions but cannot undo an already accepted side effect |

## 8. What should survive unchanged

The review does not invalidate the whole design. These are strong and should
remain:

- dual-horizon Career OS rather than an auto-apply bot;
- one truthful identity with multiple legitimate personas;
- separate employment, contract, and relationship funnels;
- evidence statuses and the separation of truth from disclosure;
- capability negotiation and honest assurance levels;
- immutable application packet versions;
- idempotency intent, reconciliation, dead-letter handling, and receipts;
- sovereign human-only decisions;
- human checkpoints for legal, identity, CAPTCHA, MFA, and unsupported claims;
- channel-specific adapters rather than one universal scraper;
- chat-first onboarding and structured operational views;
- free open core, portable export, and no mandatory hosted lock-in;
- progressive autonomy based on evidence rather than time.

## 9. Recommended architecture correction

### 9.1 Correct the product promise

Use this contract:

> Hunter is universally usable in Guided mode. Connected actions and proactive
> operation are capability-, channel-, locale-, and deployment-specific.

This is honest without weakening the long-term vision.

### 9.2 Move the trust boundary

~~~mermaid
flowchart TD
    A["Model and Skills<br/>Untrusted planner"] --> B["Typed Plan"]
    B --> C["Deterministic Policy and Safety Verifier"]
    C --> D["Hunter Action Gateway"]
    D --> E["Permitted Channel Adapter"]
    E --> F["Receipt and Reconciliation"]
~~~

Read access to sensitive sources should also be purpose-checked. The current
kernel focuses too narrowly on external writes.

### 9.3 Replace the live JSONL vault

Use an encrypted, single-writer reference store for V1. Treat canonical files
as export, not the live transactional database. Separate sensitive mutable
records from minimal immutable audit records.

### 9.4 Make channel permission explicit

No operation exists merely because a browser can technically perform it.
Support is a product decision backed by terms, technical reliability, auth,
receipt quality, and account-health evidence.

### 9.5 Remove live experimentation from V1

Record strategy versions, user feedback, and outcomes. Learn descriptively.
Do not spend a user's limited job opportunities on autonomous experiments.

### 9.6 Make connected UI non-optional

Chat can remain the primary conversation surface. Connected operations need a
structured review surface for:

- persona and claim diffs;
- action-batch comparison;
- exceptions and sensitive disclosures;
- receipts and unknown outcomes;
- account and channel health;
- deletion and retention controls.

## 10. Recommended implementation order

Do not implement current Slice 0 as written.

### Slice A: Guided walking skeleton

- minimal candidate profile and claims;
- minimal persona portfolio;
- opportunity import or official read-only discovery;
- explainable qualification;
- one tailored artifact;
- immutable manual-application packet;
- local single-writer store and export;
- deterministic truth and disclosure checks;
- user outcome update.

### Slice B: ChatGPT reference packaging

- one plugin bundle;
- guided onboarding;
- capability report in plain language;
- no-write fallback;
- real installation study;
- public submission requirements.

### Slice C: Vault and privacy hardening

- encrypted mutable facts;
- minimal audit events;
- retention and erasure;
- artifact protection;
- corruption and recovery;
- third-party contact data policy.

### Slice D: First reversible connected actions

Use official connectors for low-risk, reversible operations such as creating
an email draft or calendar reminder. Validate the Action Gateway, approvals,
receipts, and kill switch without sending applications.

### Slice E: Channel-specific assisted applications

Add only channels with a documented permitted path. User-present computer
assistance comes before unattended submission.

### Slice F: Proactive connected operations

Add remote schedules, webhooks, OAuth, and durable sync only after choosing a
hosting and sustainability model.

## 11. Required gates before implementation

The architecture can return to go status when:

1. Guided, Local Enforced, and Connected Enforced profiles are specified.
2. The write-tool mediation boundary is technically enforceable.
3. Vault v2 defines encryption, retention, erasure, and single-writer behavior.
4. Unknown browser writes default to manual handoff.
5. Universal access is separated from competence levels.
6. The first slice is a complete user journey, not an infrastructure platform.
7. Live experiments are removed from V1.
8. Third-party relationship data has a privacy model.
9. Plugin distribution claims distinguish local, workspace, marketplace, and
   public-directory installation.
10. The public product name receives clearance or is replaced.

## 12. Source validation

Current external constraints were checked against primary sources:

- OpenAI's [MCP server guide](https://developers.openai.com/apps-sdk/build/mcp-server)
  assigns tool behavior and authentication enforcement to the server and
  requires an HTTP-reachable server for an app.
- OpenAI's [plugin build guide](https://learn.chatgpt.com/docs/build-plugins)
  requires submission and review for official public distribution.
- OpenAI's [scheduled-task documentation](https://learn.chatgpt.com/docs/automations)
  states that web schedules do not retain a local folder or worktree.
- The [Agent Skills specification](https://agentskills.io/specification)
  defines skills as Markdown instructions plus optional environment-dependent
  scripts.
- OpenAI's [security and privacy guidance](https://developers.openai.com/apps-sdk/guides/security-privacy)
  calls for least privilege, explicit consent, defense in depth, retention
  policy, and prompt-injection-resistant server validation.
- MCP's [security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)
  require per-client consent and careful token handling for proxy servers.
- LinkedIn's [User Agreement](https://www.linkedin.com/legal/user-agreement)
  prohibits unauthorized bots for access, contacts, and messaging.
- Greenhouse's [Job Board API](https://developers.greenhouse.io/job-board.html)
  permits public job reads, while application submission requires the
  organization's API key.
- The EU's [GDPR text](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A02016R0679-20160504)
  includes data minimization, storage limitation, and erasure obligations that
  must be reconciled with audit history.
- A current direct category collision exists with
  [Hunter AI](https://hunterai.work/); this is not a legal conclusion, but it
  makes naming clearance mandatory before public launch.

## 13. Final decision

**No-go:** do not write the current Slice 0 implementation plan.

**Go:** revise the umbrella specification to 1.1 around deployment profiles,
an enforceable Action Gateway, Vault v2, explicit channel support levels,
competence levels, and a walking-skeleton first slice.

Hunter's vision survives the review. The current implementation sequence does
not.
