# Hunter 07: Qualification and Installation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Qualify Hunter Guided v0.1 through reproducible package/scenario validation, an actual clean local installation, fresh-chat behavioral evaluation, cache-refresh verification, and explicit release evidence.

**Architecture:** Repository Node validators provide deterministic evidence for package, paths, state, fixtures, and scenario structure. Real plugin installation and host behavior remain separate evidence surfaces. Missing CLI/Plugins Directory access, stale installed content, or unavailable full/reduced capability hosts is a blocking result, never a simulated pass.

**Tech Stack:** Node.js 20+, `node:test`, YAML/Ajv development dependencies, Agent Skills, Codex/ChatGPT plugin marketplace, ChatGPT Work, Markdown acceptance records, and Git.

## Global Constraints

- Plans 1–6 and their gates must pass before this plan begins.
- The canonical plugin is `plugins/hunter`; the canonical skill is `plugins/hunter/skills/hunter`.
- Plugin/skill ID remains `hunter` for local v0.1; marketplace remains `hunter-career-os`; release baseline is `0.1.0`.
- The plugin contains one skill and no app, MCP server, hook, hosted service, database, account, API key, authentication secret, or paid Hunter dependency.
- Deterministic validation and host-executed evaluation are separate. Neither substitutes for the other.
- A static pass does not prove installation, activation, browser use, artifact rendering, fallback behavior, or cache refresh.
- Run each activation and behavioral evaluation in a new ChatGPT Work chat using the installed copy.
- A missing Codex CLI/Plugins Directory, already-installed non-clean environment, unavailable reduced-capability host, or missing acceptance evidence is a blocking `NO-GO`.
- Do not bypass installation by creating a second editable skill source.
- Do not publish or submit publicly in this plan. A Git-backed route is claimed only after a real remote exists and is tested separately.
- Public-name clearance for `hunter` remains a future public-distribution blocker, not a local v0.1 blocker.
- Commit only generic fixtures and factual evaluation evidence.
- Final status is `GO` only if every critical deterministic, install, activation, capability, isolation, state, artifact, cache, and end-to-end gate passes.
- Use `apply_patch`, explicit `git add` paths, and focused commits.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `tests/hunter/validate-package.mjs` | Deterministic distributable-package validator |
| `tests/hunter/package-digest.mjs` | Stable digest of marketplace plus plugin bytes |
| `tests/hunter/validate-scenarios.mjs` | Deterministic scenario corpus validator |
| `tests/hunter/package-validator.test.mjs` | Package validator TDD |
| `tests/hunter/scenario-validator.test.mjs` | Scenario validator TDD |
| `tests/hunter/verify-clean-install.mjs` | Actual CLI clean-install verifier |
| `tests/hunter/clean-install.test.mjs` | Blocking absent-CLI behavior |
| `tests/hunter/eval-rubric.md` | Fresh-chat scoring protocol |
| `tests/hunter/scenarios/07-guided-e2e.yaml` | Full Guided journey |
| `tests/hunter/check-release-gate.mjs` | Acceptance evidence gate |
| `tests/hunter/release-gate.test.mjs` | NO-GO/GO tests |
| `tests/hunter/verify-installed-copy.mjs` | Installed-cache version and digest verifier |
| `tests/hunter/installed-copy.test.mjs` | Cache-verifier tests |
| `docs/guides/install-hunter.md` | Exact local installation/update instructions |
| `docs/guides/getting-started.md` | Day-one user workflow |
| `docs/acceptance/guided-v0.1-clean-install.md` | Factual install record |
| `docs/acceptance/guided-v0.1-e2e.md` | Factual host/E2E record |
| `README.md` | Verified project entry point |

## Locked Validator Interfaces

~~~js
validatePackage(repoRoot)
// Promise<string[]>; [] means valid

computePackageDigest(repoRoot)
// Promise<string>; lowercase sha256 hex

listPluginFiles(pluginRoot)
// Promise<string[]>; sorted canonical POSIX paths, rejects symlinks

computePluginDigest(pluginRoot, relativePaths?)
// Promise<string>; lowercase sha256 hex

validateScenarioDirectory({ scenarioDir, schemaPath })
// Promise<string[]>; [] means valid

checkReleaseGate(repoRoot)
// Promise<string[]>; [] means every critical acceptance field is pass
~~~

Validator CLI exit codes are 0 for valid, 1 for validation failure/NO-GO, and 2 for usage or I/O inability. The clean-install verifier uses exit 2 for an environment that cannot prove a clean install.

---

### Task 1: Add deterministic package and scenario qualification

**Files:**
- Create: `tests/hunter/validate-package.mjs`
- Create: `tests/hunter/package-digest.mjs`
- Create: `tests/hunter/validate-scenarios.mjs`
- Create: `tests/hunter/package-validator.test.mjs`
- Create: `tests/hunter/scenario-validator.test.mjs`
- Create: `tests/hunter/scenarios/07-guided-e2e.yaml`
- Modify: `package.json`
- Modify only if dependency metadata changes: `package-lock.json`

- [ ] **Step 1: Write RED package-validator tests**

Test the real repository returns `[]`. Build each temporary validation root
with `plugins/`, `.agents/`, and `tests/hunter/fixtures/`. Change the plugin
name and assert an error containing `plugin name must be hunter`. Add isolated
mutations for any source symlink, missing direct reference, `.mcp.json`,
non-example email, machine-specific user path, a neutral sentinel
`VendorSpecificExample`, and a high-entropy assignment such as
`api_key = 7f3...`.

- [ ] **Step 2: Run RED**

~~~bash
node --test tests/hunter/package-validator.test.mjs
~~~

Expected: `ERR_MODULE_NOT_FOUND` for `validate-package.mjs`.

- [ ] **Step 3: Implement exact package checks**

`validatePackage` checks:

- plugin/folder/skill/marketplace names all equal `hunter` where applicable;
- manifest version `0.1.0`, skills path, approved metadata, `defaultPrompt` array, and no unsupported component fields;
- marketplace source `./plugins/hunter` and `AVAILABLE`/`ON_INSTALL` metadata;
- exactly one skill;
- `SKILL.md` frontmatter, description length ≤1024, body below 500 lines and a conservative 3,500-word cap;
- the frontmatter description equals the final Plan 6 trigger description;
- `agents/openai.yaml` display/description/default prompt, with no `policy` or mandatory dependency block; implicit invocation is behavioral evidence;
- all eight references, three templates, schema, state template, and metadata files exist;
- every relative link resolves inside the skill and every reference is directly linked from `SKILL.md`;
- no `.app.json`, `.mcp.json`, hooks, missing visual paths, scaffold publisher copy, TODO/TBD markers, or placeholder manifest values;
- the source plugin contains no symlink of any kind;
- the distributable plugin and generic fixtures contain no absolute user
  path, generic-fixture identity email or scenario identity URL on a
  non-example domain, high-entropy credential assignment,
  or neutral `VendorSpecificExample` sentinel; and
- example identity/organization fixtures use documented Example names,
  `@example.com` addresses, and example.com scenario URLs, with
  profession/vendor neutrality confirmed manually. Manifest, repository,
  installation, and official technical documentation URLs are validated as
  HTTPS metadata/link targets and are not subjected to the fixture-domain
  rule.

Do not broadly reject words such as password/token that legitimately appear
in integrity instructions; detect assignment-like secret values. Automated
genericity is a defense, not proof. The final gate also requires manual
review.

- [ ] **Step 4: Implement and test the package digest**

`listPluginFiles(pluginRoot)` rejects every symlink and returns the sorted
POSIX relative paths of regular source files. `computePluginDigest` hashes
that canonical list by framing each UTF-8 path, a NUL byte, the raw bytes, and
a NUL byte with SHA-256. It also accepts an optional already-validated
relative-path list so installed-copy verification can hash exactly the source
package file set. `computePackageDigest` applies the same framing to
`.agents/plugins/marketplace.json` plus the canonical plugin source files.
Assert identical trees produce the same digest, a one-byte plugin change
changes both applicable digests, and any source symlink is rejected.

The module CLI `node tests/hunter/package-digest.mjs [repo-root]` prints only
the current package digest and exits 2 on usage/I/O failure.

- [ ] **Step 5: Write RED scenario-validator tests**

Test the real scenario directory returns `[]`. In temporary directories assert failures for ID/filename mismatch, duplicate ID, schema error, missing fixture, fixture escaping `tests/hunter`, empty `must`/`must_not`, and invalid workflow/capability profile.

- [ ] **Step 6: Run RED**

~~~bash
node --test tests/hunter/scenario-validator.test.mjs
~~~

Expected: `ERR_MODULE_NOT_FOUND` for `validate-scenarios.mjs`.

- [ ] **Step 7: Implement scenario validation**

Import and reuse Plan 2’s `loadScenario` and `validateScenarioShape`; do not
create a second YAML/schema parser. Add only corpus checks: globally unique
IDs, stable sorted diagnostics, every `fixtures[]` entry exists and remains
inside `tests/hunter`, and at least one scenario covers every workflow enum.
Ignore only `scenario.schema.json` itself.

Create `07-guided-e2e.yaml` with `workflow: end-to-end`, the full capability
surface, generic fixtures, and the journey onboarding → second profile →
current discovery → profile comparison → editable resume → relationship
path/prepared outreach → pursuit → pipeline/interview/next action → saved
state → new-chat continuation. This makes end-to-end workflow coverage real
before the corpus validator runs.

- [ ] **Step 8: Add exact CLI scripts**

Add without removing earlier scripts:

~~~json
{
  "test:qualification": "node --test tests/hunter/package-validator.test.mjs tests/hunter/scenario-validator.test.mjs",
  "validate:package": "node tests/hunter/validate-package.mjs",
  "validate:scenarios": "node tests/hunter/validate-scenarios.mjs",
  "qualify:deterministic": "npm test && node tests/hunter/support/validate-state-cli.mjs plugins/hunter/skills/hunter/assets/hunter-state.template.yaml && npm run validate:package && npm run validate:scenarios"
}
~~~

Run `npm install --package-lock-only` only if package dependency metadata changed; otherwise leave the lockfile byte-identical.

- [ ] **Step 9: Run GREEN**

~~~bash
npm run qualify:deterministic
python3 /root/.codex/skills/oai/skill-creator/scripts/quick_validate.py \
  plugins/hunter/skills/hunter
python3 /root/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  plugins/hunter
~~~

Expected: all pass and both CLIs print one `PASS` line.

- [ ] **Step 10: Commit**

~~~bash
git add package.json \
  tests/hunter/package-digest.mjs \
  tests/hunter/validate-package.mjs \
  tests/hunter/validate-scenarios.mjs \
  tests/hunter/package-validator.test.mjs \
  tests/hunter/scenario-validator.test.mjs \
  tests/hunter/scenarios/07-guided-e2e.yaml
git add package-lock.json
git commit -m "test: add deterministic Hunter qualification"
~~~

Omit `package-lock.json` from the second `git add` when it is unchanged.

### Task 2: Add clean-install verification and user guides

**Files:**
- Create: `tests/hunter/verify-clean-install.mjs`
- Create: `tests/hunter/clean-install.test.mjs`
- Create: `docs/guides/install-hunter.md`
- Create: `docs/guides/getting-started.md`
- Modify: `package.json`

**Clean-install contract:**

~~~text
node tests/hunter/verify-clean-install.mjs [repo-root]
0 = clean install proven
1 = CLI exists but installation/list verification failed
2 = environment cannot prove clean install, including absent CLI or Hunter already installed
~~~

- [ ] **Step 1: Write clean-install RED tests with a fake CLI**

Spawn `process.execPath` with the verifier and an environment whose `PATH` cannot resolve `codex`. Assert exit 2 and stderr:

~~~text
BLOCKED clean-install: Codex CLI is unavailable
~~~

Create a temporary executable fake CLI and select it through
`HUNTER_CODEX_BIN`. It logs every argument vector and emits configured
stdout/stderr/exit codes. Add tests for:

- success and exact order: version → plugin list → marketplace add → plugin
  add → plugin list;
- marketplace already configured at the same resolved repository root;
- same marketplace name configured at a different root, which exits 1;
- plugin-add failure, which exits 1; and
- post-install list missing Hunter, which exits 1.

- [ ] **Step 2: Run RED**

~~~bash
node --test tests/hunter/clean-install.test.mjs
~~~

Expected: `MODULE_NOT_FOUND` for the verifier.

- [ ] **Step 3: Implement the verifier**

1. Resolve `HUNTER_CODEX_BIN` or `codex`.
2. Probe `--version`; ENOENT exits 2.
3. Run `codex plugin list`; if Hunter is already present, exit 2 and demand a clean plugin environment.
4. Run `codex plugin marketplace add <absolute-repo-root>`.
5. If add reports an existing marketplace, verify
   `codex plugin marketplace list` contains both `hunter-career-os` and the
   same real repository root; a same-name different-root marketplace exits 1.
6. Run `codex plugin add hunter@hunter-career-os`.
7. Run `codex plugin list` and require Hunter.
8. Print `PASS clean local Hunter installation` and instruct the evaluator to open a new Work chat.

Never remove an existing plugin/marketplace automatically; clean-environment preparation is explicit user/host setup.

- [ ] **Step 4: Create the installation guide**

`install-hunter.md` contains:

~~~bash
npm ci
npm run qualify:deterministic
npm run verify:install
~~~

It documents exit codes, the equivalent ChatGPT Work Plugins Directory flow, new-chat requirement, and update loop:

~~~bash
python3 /root/.codex/skills/.system/plugin-creator/scripts/update_plugin_cachebuster.py \
  /absolute/path/to/hunter-career-os/plugins/hunter
codex plugin add hunter@hunter-career-os
~~~

It states Hunter itself needs no server, database, account, API key, or subscription. It does not claim Git-backed installation.

- [ ] **Step 5: Create the first-run guide**

`getting-started.md` covers existing state, career files/connected context, conversation, and from-scratch entry. Include explicit and natural prompts for profile creation, job/contract discovery, resume, relationships, interview, and next action. Explain portable state continuity and Guided v0.1’s non-execution boundary.

- [ ] **Step 6: Add scripts and run GREEN**

~~~json
{
  "test:install": "node --test tests/hunter/clean-install.test.mjs",
  "verify:install": "node tests/hunter/verify-clean-install.mjs"
}
~~~

~~~bash
npm run test:install
npm run qualify:deterministic
git diff --check
~~~

Expected: unit and deterministic gates pass.

- [ ] **Step 7: Commit**

~~~bash
git add package.json \
  tests/hunter/verify-clean-install.mjs \
  tests/hunter/clean-install.test.mjs \
  docs/guides/install-hunter.md \
  docs/guides/getting-started.md
git commit -m "docs: add Hunter clean installation flow"
~~~

### Task 3: Build host-evaluation, cache, and release-gate infrastructure

**Files:**
- Create: `tests/hunter/eval-rubric.md`
- Create: `tests/hunter/check-release-gate.mjs`
- Create: `tests/hunter/release-gate.test.mjs`
- Create: `tests/hunter/verify-installed-copy.mjs`
- Create: `tests/hunter/installed-copy.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add the rubric and verify the end-to-end scenario**

Revalidate that `07-guided-e2e.yaml` uses the frozen Plan 2 shape, explicit
full capabilities, generic fixture paths, and the complete journey defined in
Task 1.

The rubric requires one fresh chat per scenario and records ID, host/model,
installed version/digest, exact prompt/fixtures, declared and observed
capabilities, tools/results, must/must-not/state scores, artifact inspection,
and pass/fail/blocked. A simulated missing capability is never a reduced-host
pass.

- [ ] **Step 2: Write RED release-gate tests**

Cover missing records, malformed frontmatter, blocked clean install, one
failed critical field, mismatched candidate commits, mismatched plugin
versions, mismatched package digests, digest differing from the current tree,
invalid/non-ancestor candidate hash, and a complete passing fixture.

- [ ] **Step 3: Implement `checkReleaseGate`**

Parse both acceptance records. Require:

- both `status: pass`;
- identical real ancestor `candidate_commit` values;
- identical `plugin_version` and `package_digest` values;
- `package_digest` equals `computePackageDigest` for the current tree;
- valid host/time/environment fields; and
- these E2E fields equal `pass`:
  `explicit_activation_result`, `implicit_activation_result`,
  `full_tool_result`, `reduced_capability_result`,
  `profile_isolation_result`, `state_result`, `artifact_result`,
  `end_to_end_result`, `deterministic_result`,
  `official_validators_result`, `cache_refresh_result`,
  `final_reinstall_result`, and `genericity_review_result`.

The CLI prints exactly `GO Hunter Guided v0.1 release gate` on success or
`NO-GO Hunter Guided v0.1` plus stable diagnostics on failure.

- [ ] **Step 4: Write RED installed-copy tests**

Create a temporary `CODEX_HOME` containing
`plugins/cache/hunter-career-os/hunter/local/`. Cover a matching installed
plugin, missing copy, wrong version, multiple ambiguous manifests, and one-byte
digest mismatch. Also prove an extra file inside the resolved plugin root and
a missing canonical source file both fail, while a stale copy with a different
version is ignored and two copies matching `expectedVersion` fail.

- [ ] **Step 5: Implement installed-copy verification**

~~~js
verifyInstalledCopy({ repoRoot, codexHome, expectedVersion })
// Promise<string[]>; [] means exactly one matching installed copy
~~~

Search under
`$CODEX_HOME/plugins/cache/hunter-career-os/hunter/` for plugin manifests,
filter by plugin name plus the exact `expectedVersion`, and require exactly one
matching plugin root. Ignore stale manifests with a different version, but
fail on zero or multiple roots matching the expected version. Compare
the installed bytes against the canonical source package file set: obtain
relative paths from `listPluginFiles(sourceRoot)`, require every path to be a
regular installed file contained under the installed root, and call
`computePluginDigest(installedRoot, sourceRelativePaths)`. Require the complete
installed-root file set to equal the canonical source list: reject every extra
file or symlink inside the resolved plugin root as well as every missing,
replaced, non-regular, or byte-different source path. Host cache metadata must
live outside the resolved plugin root; if a real host violates that assumption,
record `NO-GO` and revise the verifier only with a separately reviewed exact
metadata-path allowlist. Never treat the source tree itself as installed
evidence.

CLI:

~~~text
node tests/hunter/verify-installed-copy.mjs <expected-version> [repo-root]
~~~

It uses `CODEX_HOME` or the current user’s `.codex` directory and follows the
common 0/1/2 exit-code contract.

- [ ] **Step 6: Add scripts and run GREEN**

~~~json
{
  "test:release-gate": "node --test tests/hunter/release-gate.test.mjs tests/hunter/installed-copy.test.mjs",
  "verify:installed-copy": "node tests/hunter/verify-installed-copy.mjs",
  "gate:release": "node tests/hunter/check-release-gate.mjs"
}
~~~

~~~bash
node --test tests/hunter/release-gate.test.mjs \
  tests/hunter/installed-copy.test.mjs
npm run validate:scenarios
npm run qualify:deterministic
~~~

Expected: all infrastructure tests pass; `npm run gate:release` still prints
`NO-GO` because acceptance evidence does not exist yet.

- [ ] **Step 7: Commit unconditional qualification infrastructure**

~~~bash
git add package.json \
  tests/hunter/eval-rubric.md \
  tests/hunter/check-release-gate.mjs \
  tests/hunter/release-gate.test.mjs \
  tests/hunter/verify-installed-copy.mjs \
  tests/hunter/installed-copy.test.mjs
git commit -m "test: add Hunter release qualification infrastructure"
~~~

### Task 4: Execute the actual clean-install gate

**Files:**
- Create with observed values: `docs/acceptance/guided-v0.1-clean-install.md`

- [ ] **Step 1: Record the candidate**

Run `git rev-parse HEAD`, `node --version`, `codex --version` where
available, and:

~~~bash
node tests/hunter/package-digest.mjs
~~~

The acceptance record stores the actual 40-character candidate hash, package
digest, ISO 8601 time, host description, plugin version, marketplace,
commands, and observed output.

- [ ] **Step 2: Run the real verifier**

~~~bash
npm run verify:install
~~~

- [ ] **Step 3: Handle exit 2 honestly**

Create a factual `status: blocked` record containing the exact command/output
and required environment change, then stop environment-dependent execution.
Task 3 infrastructure is already complete. Run `npm run qualify:deterministic`
and `npm run gate:release`; the expected result is `NO-GO`. Do not run Tasks
5–6, create a passing E2E record, or claim v0.1 qualification. The current
workspace is known not to expose `codex`; therefore this is the expected local
outcome unless execution moves to ChatGPT desktop/Codex CLI.

- [ ] **Step 4: Handle exit 1 honestly**

Create `status: fail` with the exact failing subcommand/output and stop. Use `superpowers:systematic-debugging` before making a separate fix plan.

- [ ] **Step 5: Handle exit 0**

Create `status: pass` with evidence that Hunter was absent before installation, marketplace add/list succeeded, plugin add/list succeeded, version is correct, and exactly one Hunter skill is visible. No inferred or placeholder result may remain.

The record frontmatter requires `status`, `candidate_commit`,
`package_digest`, `host`, `plugin_version`, `marketplace`, and `executed_at`.

### Task 5: Run fresh-chat activation and end-to-end qualification

**Files:**
- Create with observed values: `docs/acceptance/guided-v0.1-e2e.md`

- [ ] **Step 1: Test explicit activation in a new chat**

~~~text
@hunter Set me up from these career files. Create an initial profile and return a portable hunter-state.yaml.
~~~

Require skill activation, relevant file tools, at most three blocking questions, first profile/state/gaps/three actions, and valid downloaded state.

- [ ] **Step 2: Test implicit activation in a separate new chat**

~~~text
Using my active career profile, find current job and contract opportunities, compare the strongest options, and tell me what to pursue.
~~~

Require implicit Hunter activation, actual browser/search use when present, sourced current opportunities, deduplication, profile decisions, and no premature request for manual links.

- [ ] **Step 3: Run every committed scenario**

Use one new chat per case. Run full cases in a genuinely capable host and reduced cases in a genuinely reduced/failing host. Any unavailable required host becomes `blocked` and stops release.

- [ ] **Step 4: Run the full Guided journey**

Use only generic candidate data. Inspect generated editable files and actual renders. Validate the final and continued state:

~~~bash
node tests/hunter/support/validate-state-cli.mjs /absolute/path/to/final/hunter-state.yaml
~~~

Expected: exit 0. Confirm the pursuit references the selected profile/opportunity, artifacts have correct ownership/availability, unknown fields persist, and the next chat continues without relying on memory.

- [ ] **Step 5: Create the factual E2E record**

Use the exact `candidate_commit`, `package_digest`, and `plugin_version` from
the passing clean-install record. Record actual values for all host results.
After host evaluation, `deterministic_result`,
`official_validators_result`, and `genericity_review_result` may be `pass`
only from observed checks; `cache_refresh_result` and
`final_reinstall_result` remain factual `not-run` until Task 6. Overall status
therefore remains `pending` until Task 6.

The body contains one row per scenario, exact prompts/tools, validator output,
artifact structural/render results, noncritical observations, and final
recommendation. Any critical fail/block changes overall status accordingly and
stops release.

- [ ] **Step 6: Commit factual host evidence**

~~~bash
git add docs/acceptance/guided-v0.1-clean-install.md \
  docs/acceptance/guided-v0.1-e2e.md
git commit -m "test: record Hunter host qualification"
~~~

### Task 6: Verify cache refresh and enforce the release gate

**Files:**
- Modify after commands are verified: `README.md`
- Modify with observed final results: `docs/acceptance/guided-v0.1-e2e.md`
- Temporarily modify, then restore with `apply_patch`: `plugins/hunter/.codex-plugin/plugin.json`

- [ ] **Step 1: Run the cachebuster test after clean install passes**

~~~bash
python3 /root/.codex/skills/.system/plugin-creator/scripts/update_plugin_cachebuster.py \
  plugins/hunter
python3 /root/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  plugins/hunter
codex plugin add hunter@hunter-career-os
~~~

Read back the helper’s observed version and require it to match its actual
format, `^0\\.1\\.0\\+codex\\.[0-9]{14}$`, then run:

~~~bash
version="$(node -p \
  "require('./plugins/hunter/.codex-plugin/plugin.json').version")"
npm run verify:installed-copy -- "$version"
~~~

The CLI receives the observed exact version, uses `CODEX_HOME` when set, and
requires matching installed version plus plugin digest. Run a passing explicit
activation scenario in a new chat. If CLI/cache inspection is unavailable,
record blocked and keep `NO-GO`.

- [ ] **Step 2: Restore and reinstall final `0.1.0`**

Use `apply_patch` to restore only `"version": "0.1.0"`, validate, reinstall,
then run `npm run verify:installed-copy -- "0.1.0"`. Do not use
reset/checkout/restore.

- [ ] **Step 3: Finalize acceptance fields**

Run deterministic qualification, both official validators, and manual
genericity review against the current digest. After the cachebuster and final
`0.1.0` reinstall are both verified with
`verify:installed-copy`, update the E2E record’s five final gate fields to
`pass` and set overall `status: pass`. Any failure/block remains factual and
keeps overall status non-pass.

- [ ] **Step 4: Update README only with verified commands**

Add the proven install command/flow, day-one prompts, deterministic verification command, v0.1 boundaries, Apache-2.0 license, and links to vision/design/guides. Do not advertise Git-backed/public installation or a GO status that was not observed.

- [ ] **Step 5: Run the final gate**

~~~bash
npm ci
npm run test:release-gate
npm run qualify:deterministic
npm run gate:release
python3 /root/.codex/skills/oai/skill-creator/scripts/quick_validate.py \
  plugins/hunter/skills/hunter
python3 /root/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  plugins/hunter
git diff --check
git status --short
~~~

Expected for a qualified release:

~~~text
GO Hunter Guided v0.1 release gate
~~~

If install/evaluation evidence is missing, blocked, or failed, the correct output is `NO-GO`. Implementation infrastructure may be complete, but Guided v0.1 is not qualified.

- [ ] **Step 6: Commit only on GO**

~~~bash
git add package.json README.md \
  plugins/hunter/.codex-plugin/plugin.json \
  tests/hunter/check-release-gate.mjs \
  tests/hunter/release-gate.test.mjs \
  docs/acceptance/guided-v0.1-clean-install.md \
  docs/acceptance/guided-v0.1-e2e.md
git commit -m "test: qualify Hunter Guided v0.1"
~~~

- [ ] **Step 7: Re-run final verification**

~~~bash
npm ci
npm run qualify:deterministic
npm run gate:release
python3 /root/.codex/skills/oai/skill-creator/scripts/quick_validate.py \
  plugins/hunter/skills/hunter
python3 /root/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  plugins/hunter
git diff --check
git status --short
git log -1 --oneline
~~~

Expected: all validators pass, release gate prints GO, worktree is clean, and latest commit is `test: qualify Hunter Guided v0.1`.

## Plan Gate

Guided v0.1 is complete only when clean installation is actually proven; explicit/implicit activation work in new chats; full and genuinely reduced capability scenarios pass; the end-to-end install→onboard→discover→asset→relationship→pursuit→continuity journey passes; profile isolation, merge/repair, injection, false-success, and rendered-artifact checks pass; cache refresh and final reinstall are proven; deterministic and official validators pass; manual genericity review finds no user-specific data; no Hunter infrastructure is required; release gate prints GO; and `git status --short` is empty.
