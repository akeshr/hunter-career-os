# Hunter Strict Skills Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Hunter Guided v0.1 unambiguously skills-only at installation and in its public product surface while retaining deterministic repository regression tests.

**Architecture:** The only distributable product remains `plugins/hunter`, containing one Agent Skill plus its references, schemas, and assets. Node.js state helpers and their CLI stay under `tests/hunter/support/` as test infrastructure, are not exposed through package scripts or user documentation, and are excluded from the plugin marketplace source.

**Tech Stack:** Agent Skills Markdown, JSON Schema, Node.js 20+, `node:test`, YAML 2.x, Ajv 8.x, Codex skills-only plugin packaging.

## Global Constraints

- Do not add an app, MCP server, hook, hosted service, database, account, API key, authentication layer, connector, or portal adapter.
- Do not change Hunter workflow behavior or the `hunter-state.yaml` schema.
- Keep deterministic state, transition, merge, and recovery regression coverage.
- Keep all fixtures generic and free of user-specific data.
- Do not expose repository validators as an end-user Hunter command or runtime dependency.

---

### Task 1: Lock the strict repository boundary

**Files:**
- Modify: `tests/hunter/package.test.mjs`

**Interfaces:**
- Consumes: repository root, plugin manifest, `package.json`, and `README.md`.
- Produces: a regression test requiring no root `tools/`, no public `validate:state` script, and test-only state support under `tests/hunter/support/`.

- [x] **Step 1: Write a failing package-boundary test**

Add a test that rejects a root `tools/` directory, rejects the `validate:state` package script and README wording, and requires the six state helper modules plus CLI under `tests/hunter/support/`.

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="state helpers are test-only" tests/hunter/package.test.mjs`

Expected: FAIL because the root `tools/hunter-state/` directory exists and the public validation script is present.

- [x] **Step 3: Add mutation coverage for renamed CLI and plugin-runtime leaks**

Require exactly one `hunter` skill, allow only manifest and skill-owned file
categories inside the distributed plugin, and reject test-support references
from every package script value and the README.

### Task 2: Move deterministic helpers behind the test boundary

**Files:**
- Move: `tools/hunter-state/*.mjs` to `tests/hunter/support/state/*.mjs`
- Move: `tests/hunter/validate-state.mjs` to `tests/hunter/support/validate-state-cli.mjs`
- Modify: `tests/hunter/**/*.test.mjs`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: the existing state helper exports unchanged.
- Produces: identical regression behavior with no product-facing executable tool surface.

- [x] **Step 1: Move files without changing their exported interfaces**
- [x] **Step 2: Update only test/support imports and the CLI usage string**
- [x] **Step 3: Remove the public `validate:state` script and README section**
- [x] **Step 4: Run the focused boundary test and verify GREEN**

Run: `node --test --test-name-pattern="state helpers are test-only" tests/hunter/package.test.mjs`

Expected: PASS.

- [x] **Step 5: Run state and CLI regression tests**

Run: `node --test tests/hunter/state/*.test.mjs`

Expected: all pass.

### Task 3: Align normative and implementation documentation

**Files:**
- Modify: `docs/superpowers/specs/2026-07-21-hunter-guided-v0.1-design.md`
- Modify: `docs/superpowers/plans/2026-07-21-hunter-*.md`
- Modify: `docs/superpowers/verification/2026-07-22-hunter-*.md`

**Interfaces:**
- Consumes: the strict test-support paths from Task 2.
- Produces: documentation that never presents a custom Hunter tool or public runtime CLI as part of Guided v0.1.

- [x] **Step 1: Replace obsolete root-tool paths with test-support paths**
- [x] **Step 2: Mark historical validation commands as repository-only evidence or replace them with direct test-support CLI invocations**
- [x] **Step 3: Search for obsolete paths and public CLI references**

Run: `rg -n "tools[/]hunter-state|npm run validate[:]state|tests/hunter/validate-state[.]mjs" README.md docs package.json tests plugins --glob '!tests/hunter/package.test.mjs' --glob '!docs/superpowers/plans/2026-07-22-hunter-strict-skills-boundary.md'`

Expected: no matches.

### Task 4: Verify and publish the cleanup

**Files:**
- Verify: entire repository and plugin tree

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: one reviewed commit on `feature/hunter-guided-v0.1`.

- [x] **Step 1: Run `npm test`**
- [x] **Step 2: Verify the plugin tree contains one skill and no runtime extension surface**
- [x] **Step 3: Review `git diff --check`, `git status`, and the complete diff**
- [x] **Step 4: Resolve independent strict-boundary review findings**
- [ ] **Step 5: Commit the focused cleanup and publish the feature branch**
