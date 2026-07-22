import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import test from "node:test";

import {
  loadScenario,
  validateScenarioShape,
} from "./helpers/scenario.mjs";

const scenarioNames = [
  "02-document-onboarding",
  "02-conversation-onboarding",
  "02-existing-state",
  "02-existing-workspace-import",
  "02-clone-isolation",
  "02-malformed-recovery",
];

const fixturesRoot = fileURLToPath(
  new URL("./fixtures/", import.meta.url),
);

const validTemporaryScenario = () => ({
  id: "temporary",
  title: "Temporary scenario",
  workflow: "onboarding",
  capability_profile: "full",
  capabilities: {
    available: ["files.read", "state.write"],
    unavailable: ["connected.sources"],
    failures: [],
  },
  fixtures: ["../fixtures/state/valid/two-profiles.yaml"],
  capability_bindings: {
    "files.read": ["../fixtures/state/valid/two-profiles.yaml"],
  },
  prompt: "Perform the temporary scenario.",
  expected: {
    must: ["Return an observable result."],
    must_not: ["Claim an unavailable capability."],
    state: [],
  },
});

test("core pressure scenarios satisfy the frozen contract", async (t) => {
  const loaded = await Promise.all(
    scenarioNames.map(async (name) => ({
      name,
      filename: `${name}.yaml`,
      scenario: await loadScenario(
        new URL(`./scenarios/${name}.yaml`, import.meta.url),
      ),
    })),
  );

  assert.equal(
    new Set(loaded.map(({ scenario }) => scenario.id)).size,
    scenarioNames.length,
  );

  for (const { name, filename, scenario } of loaded) {
    await t.test(name, () => {
      assert.equal(scenario.id, name);
      assert.deepEqual(validateScenarioShape(scenario, filename), []);
    });
  }
});

test("document onboarding binds an existing generic career source", async () => {
  const scenario = await loadScenario(
    new URL("./scenarios/02-document-onboarding.yaml", import.meta.url),
  );
  const expectedFixture = "../fixtures/career/profile-source.md";

  assert.deepEqual(scenario.fixtures, [expectedFixture]);
  assert.deepEqual(scenario.capability_bindings["files.read"], [
    expectedFixture,
  ]);

  const source = await readFile(
    new URL(`./scenarios/${expectedFixture}`, import.meta.url),
    "utf8",
  );
  assert.match(source, /^# Generic Career Source$/m);
  assert.match(source, /^## Experience$/m);
  assert.doesNotMatch(
    source,
    /^(?:schema_version|revision|workspace|profiles|opportunities|pursuits|relationships|activities|tasks):/m,
  );
});

test("existing workspace import binds state and career material explicitly", async () => {
  const scenario = await loadScenario(
    new URL(
      "./scenarios/02-existing-workspace-import.yaml",
      import.meta.url,
    ),
  );
  const stateFixture = "../fixtures/state/valid/two-profiles.yaml";
  const careerFixture = "../fixtures/career/profile-source.md";

  assert.deepEqual(scenario.capabilities.available, [
    "files.read",
    "state.read",
    "state.write",
  ]);
  assert.deepEqual(scenario.fixtures, [stateFixture, careerFixture]);
  assert.deepEqual(scenario.capability_bindings, {
    "files.read": [careerFixture],
    "state.read": [stateFixture],
  });
});

test("a binding must target an available capability", () => {
  const scenario = validTemporaryScenario();
  scenario.capability_bindings["connected.sources"] = [scenario.fixtures[0]];

  assert.deepEqual(validateScenarioShape(scenario, "temporary.yaml"), [
    {
      path: "/capability_bindings/connected.sources",
      message: "Capability binding must target an available capability",
    },
  ]);
});

test("a binding path must be declared as a fixture", () => {
  const scenario = validTemporaryScenario();
  scenario.capability_bindings["files.read"] = [
    "../fixtures/state/valid/empty.yaml",
  ];

  assert.deepEqual(validateScenarioShape(scenario, "temporary.yaml"), [
    {
      path: "/capability_bindings/files.read/0",
      message: "Capability binding path must be listed in fixtures",
    },
  ]);
});

test("a fixture traversal may not escape the canonical fixture root", () => {
  const scenario = validTemporaryScenario();
  scenario.fixtures = [
    "../fixtures/../../../docs/superpowers/specs/2026-07-21-hunter-guided-v0.1-design.md",
  ];
  scenario.capability_bindings = {};

  assert.deepEqual(validateScenarioShape(scenario, "temporary.yaml"), [
    {
      path: "/fixtures/0",
      message: "Fixture path must resolve inside tests/hunter/fixtures",
    },
  ]);
});

test("a fixture path must identify an existing file", () => {
  const scenario = validTemporaryScenario();
  scenario.fixtures = ["../fixtures/nonexistent-scenario-fixture.yaml"];
  scenario.capability_bindings = {};

  assert.deepEqual(validateScenarioShape(scenario, "temporary.yaml"), [
    {
      path: "/fixtures/0",
      message: "Fixture path must reference an existing file",
    },
  ]);
});

test("a directory cannot be used as a fixture or capability binding", () => {
  const scenario = validTemporaryScenario();
  const directoryPath = "../fixtures/state/valid";
  scenario.fixtures = [directoryPath];
  scenario.capability_bindings["files.read"] = [directoryPath];

  assert.deepEqual(validateScenarioShape(scenario, "temporary.yaml"), [
    {
      path: "/fixtures/0",
      message: "Fixture path must reference a regular file",
    },
    {
      path: "/capability_bindings/files.read/0",
      message: "Fixture path must reference a regular file",
    },
  ]);
});

test("a symlinked fixture cannot escape the canonical fixture root", async (t) => {
  const fixturePrefix = ".scenario-containment-";
  const fixtureDirectory = await mkdtemp(join(fixturesRoot, fixturePrefix));
  const externalPrefix = "hunter-scenario-external-";
  const externalDirectory = await mkdtemp(join(tmpdir(), externalPrefix));

  t.after(async () => {
    assert.equal(basename(fixtureDirectory).startsWith(fixturePrefix), true);
    assert.equal(basename(externalDirectory).startsWith(externalPrefix), true);
    await rm(fixtureDirectory, { recursive: true, force: true });
    await rm(externalDirectory, { recursive: true, force: true });
  });

  const externalFile = join(externalDirectory, "outside.md");
  const fixtureLink = join(fixtureDirectory, "escape.md");
  await writeFile(externalFile, "outside the fixture root\n", "utf8");
  await symlink(externalFile, fixtureLink);

  const fixturePath = `../fixtures/${basename(fixtureDirectory)}/escape.md`;
  const scenario = validTemporaryScenario();
  scenario.fixtures = [fixturePath];
  scenario.capability_bindings["files.read"] = [fixturePath];

  assert.deepEqual(validateScenarioShape(scenario, "temporary.yaml"), [
    {
      path: "/fixtures/0",
      message: "Fixture path must resolve inside tests/hunter/fixtures",
    },
    {
      path: "/capability_bindings/files.read/0",
      message: "Fixture path must resolve inside tests/hunter/fixtures",
    },
  ]);
});

test("available and unavailable capabilities must be disjoint", () => {
  const scenario = validTemporaryScenario();
  scenario.capabilities.unavailable = ["files.read"];

  assert.deepEqual(validateScenarioShape(scenario, "temporary.yaml"), [
    {
      path: "/capabilities/unavailable/0",
      message: "Capability must not be both available and unavailable",
    },
  ]);
});

test("a failure schedule must target an available capability", () => {
  const scenario = validTemporaryScenario();
  scenario.capabilities.failures = [
    {
      capability: "connected.sources",
      times: 1,
      error: "Source is unavailable",
    },
  ];

  assert.deepEqual(validateScenarioShape(scenario, "temporary.yaml"), [
    {
      path: "/capabilities/failures/0/capability",
      message: "Failure capability must be available",
    },
  ]);
});

test("a capability may have at most one failure schedule", () => {
  const scenario = validTemporaryScenario();
  scenario.capabilities.failures = [
    { capability: "files.read", times: 1, error: "First failure" },
    { capability: "files.read", times: 2, error: "Second failure" },
  ];

  assert.deepEqual(validateScenarioShape(scenario, "temporary.yaml"), [
    {
      path: "/capabilities/failures/1/capability",
      message: "Failure capability must have at most one schedule",
    },
  ]);
});
