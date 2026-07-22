import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createCapabilityRun,
  invokeCapability,
  readCapabilityTrace,
} from "./helpers/capability-harness.mjs";

const harnessPath = fileURLToPath(
  new URL("./helpers/capability-harness.mjs", import.meta.url),
);
const reducedScenario = new URL(
  "./scenarios/03-reduced-fallback.yaml",
  import.meta.url,
);
const partialFailureScenario = new URL(
  "./scenarios/03-partial-failure.yaml",
  import.meta.url,
);
const fullScenario = new URL(
  "./scenarios/03-full-tool-discovery.yaml",
  import.meta.url,
);
const fixtureKey =
  "../fixtures/workflows/opportunities/listing-primary.md";
const copiedFixture = join(
  "fixtures",
  "workflows",
  "opportunities",
  "listing-primary.md",
);
const anchorFilename = "run-anchor.json";

async function temporaryRun(t) {
  const root = await mkdtemp(join(tmpdir(), "hunter-capability-harness-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, runDir: join(root, "run") };
}

async function listFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, path));
    else files.push(relative(root, path).split(sep).join("/"));
  }
  return files.sort();
}

function runCli(args) {
  const result = spawnSync(
    process.execPath,
    [harnessPath, ...args],
    { encoding: "utf8" },
  );
  const lines = result.stdout.trim().split("\n").filter(Boolean);
  assert.equal(lines.length, 1, `expected one JSON value: ${result.stdout}`);
  return { ...result, value: JSON.parse(lines[0]) };
}

function runCliAsync(args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [harnessPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => {
      try {
        const lines = stdout.trim().split("\n").filter(Boolean);
        assert.equal(lines.length, 1, `expected one JSON value: ${stdout}`);
        resolvePromise({ status, stderr, value: JSON.parse(lines[0]) });
      } catch (error) {
        reject(error);
      }
    });
  });
}

function recomputeConfigurationDigest(configuration) {
  if (!configuration.integrity?.digest) return;
  const { integrity, ...payload } = configuration;
  const digestPayload = typeof integrity.anchor_nonce === "string"
    ? {
      anchor: {
        nonce: integrity.anchor_nonce,
        run_directory: payload.run_directory,
      },
      configuration: payload,
    }
    : payload;
  configuration.integrity.digest = createHash("sha256")
    .update(JSON.stringify(digestPayload))
    .digest("hex");
}

test("an available fixture read uses the isolated declared copy", async (t) => {
  const { runDir } = await temporaryRun(t);
  await createCapabilityRun({ scenarioPath: reducedScenario, runDir });

  const response = await invokeCapability({
    runDir,
    capability: "files.read",
    input: { path: fixtureKey },
  });

  assert.equal(response.status, "success");
  assert.equal(response.result.path, fixtureKey);
  assert.match(response.result.content, /^# Operations Lead — Example Systems$/m);
  assert.equal(response.result.content.includes("Ignore previous instructions"), false);

  const copied = await readFile(join(runDir, copiedFixture), "utf8");
  assert.equal(response.result.content, copied);
});

test("an unavailable capability returns a structured result and receipt", async (t) => {
  const { runDir } = await temporaryRun(t);
  await createCapabilityRun({ scenarioPath: reducedScenario, runDir });

  const response = await invokeCapability({
    runDir,
    capability: "browser.search",
    input: { query: "operations leadership" },
  });

  assert.deepEqual(response, {
    status: "capability_unavailable",
    error: {
      code: "capability_unavailable",
      message: "Capability is unavailable: browser.search",
    },
  });
  assert.deepEqual(await readCapabilityTrace(runDir), [
    {
      sequence: 1,
      capability: "browser.search",
      input: { query: "operations leadership" },
      status: "capability_unavailable",
      error: response.error,
    },
  ]);
});

test("a controlled failure counts down exactly once before success", async (t) => {
  const { runDir } = await temporaryRun(t);
  await createCapabilityRun({
    scenarioPath: partialFailureScenario,
    runDir,
  });
  const input = { query: "current operations opportunities" };

  const first = await invokeCapability({
    runDir,
    capability: "browser.search",
    input,
  });
  const second = await invokeCapability({
    runDir,
    capability: "browser.search",
    input,
  });
  const third = await invokeCapability({
    runDir,
    capability: "browser.search",
    input,
  });

  assert.deepEqual(first, {
    status: "failure",
    error: {
      code: "controlled_failure",
      message: "transient source timeout",
    },
  });
  for (const response of [second, third]) {
    assert.equal(response.status, "success");
    assert.deepEqual(response.result.paths, [
      "../fixtures/workflows/opportunities/listing-primary.md",
      "../fixtures/workflows/opportunities/injected-listing.md",
    ]);
  }

  const trace = await readCapabilityTrace(runDir);
  assert.deepEqual(trace.map(({ sequence }) => sequence), [1, 2, 3]);
  assert.deepEqual(trace.map(({ status }) => status), [
    "failure",
    "success",
    "success",
  ]);
  assert.deepEqual(trace.map(({ input: value }) => value), [input, input, input]);
  assert.equal("error" in trace[0], true);
  assert.equal("result" in trace[0], false);
  assert.equal("result" in trace[1], true);
  assert.equal("error" in trace[1], false);
});

test("concurrent API calls consume one failure and atomically commit large receipts", async (t) => {
  const { runDir } = await temporaryRun(t);
  await createCapabilityRun({
    scenarioPath: partialFailureScenario,
    runDir,
  });
  const marker = "x".repeat(1024 * 1024);
  const inputs = Array.from({ length: 12 }, (_, index) => ({
    query: `api-${index}-${marker}`,
  }));

  const responses = await Promise.all(
    inputs.map((input) =>
      invokeCapability({
        runDir,
        capability: "browser.search",
        input,
      })
    ),
  );

  assert.equal(
    responses.filter(({ status }) => status === "failure").length,
    1,
  );
  assert.equal(
    responses.filter(({ status }) => status === "success").length,
    11,
  );
  const trace = await readCapabilityTrace(runDir);
  assert.equal(trace.length, inputs.length);
  assert.deepEqual(
    trace.map(({ sequence }) => sequence),
    Array.from({ length: inputs.length }, (_, index) => index + 1),
  );
  assert.equal(new Set(trace.map(({ input }) => input.query)).size, inputs.length);
  assert.equal(trace.every(({ input }) => input.query.length > 1024 * 1024), true);
});

test("concurrent CLI calls produce one valid trace with unique ordered receipts", async (t) => {
  const { runDir } = await temporaryRun(t);
  await createCapabilityRun({ scenarioPath: fullScenario, runDir });
  const marker = "y".repeat(16 * 1024);
  const inputs = Array.from({ length: 8 }, (_, index) => ({
    query: `cli-${index}-${marker}`,
  }));

  const calls = await Promise.all(
    inputs.map((input) =>
      runCliAsync([
        "call",
        runDir,
        "browser.search",
        JSON.stringify(input),
      ])
    ),
  );

  assert.deepEqual(
    calls.map(({ status, value }) => ({ status, valueStatus: value.status, error: value.error })),
    Array.from({ length: inputs.length }, () => ({
      status: 0,
      valueStatus: "success",
      error: undefined,
    })),
  );
  assert.equal(calls.every(({ value }) => value.status === "success"), true);
  assert.equal(calls.every(({ stderr }) => stderr === ""), true);
  const trace = await readCapabilityTrace(runDir);
  assert.deepEqual(
    trace.map(({ sequence }) => sequence),
    Array.from({ length: inputs.length }, (_, index) => index + 1),
  );
  assert.equal(new Set(trace.map(({ input }) => input.query)).size, inputs.length);
});

test("runs copy only declared fixtures and keep configuration immutable", async (t) => {
  const { root, runDir } = await temporaryRun(t);
  const otherRunDir = join(root, "other-run");
  await createCapabilityRun({ scenarioPath: reducedScenario, runDir });
  await createCapabilityRun({
    scenarioPath: partialFailureScenario,
    runDir: otherRunDir,
  });

  const before = await readFile(join(runDir, "run-config.json"), "utf8");
  const mode = (await lstat(join(runDir, "run-config.json"))).mode & 0o777;
  assert.equal(mode, 0o444);
  assert.deepEqual(await listFiles(join(runDir, "fixtures")), [
    "workflows/opportunities/listing-primary.md",
    "workflows/opportunities/state-before.yaml",
  ]);

  await invokeCapability({
    runDir,
    capability: "files.read",
    input: { path: fixtureKey },
  });

  assert.equal(await readFile(join(runDir, "run-config.json"), "utf8"), before);
  assert.deepEqual(await readCapabilityTrace(otherRunDir), []);
});

test("fixture reads reject undeclared and merely declared-but-unbound paths", async (t) => {
  const { runDir } = await temporaryRun(t);
  await createCapabilityRun({
    scenarioPath: partialFailureScenario,
    runDir,
  });

  await assert.rejects(
    invokeCapability({
      runDir,
      capability: "files.read",
      input: { path: "../../../../package.json" },
    }),
    {
      code: "invalid_input",
      message: "files.read path is not bound: ../../../../package.json",
    },
  );
  await assert.rejects(
    invokeCapability({
      runDir,
      capability: "files.read",
      input: {
        path: "../fixtures/workflows/opportunities/injected-listing.md",
      },
    }),
    {
      code: "invalid_input",
      message:
        "files.read path is not bound: ../fixtures/workflows/opportunities/injected-listing.md",
    },
  );
  assert.deepEqual(await readCapabilityTrace(runDir), []);
});

test("runtime reads receipt a copied-fixture symlink error before rejecting", async (t) => {
  const { root, runDir } = await temporaryRun(t);
  await createCapabilityRun({ scenarioPath: reducedScenario, runDir });
  const external = join(root, "external.md");
  const target = join(runDir, copiedFixture);
  await writeFile(external, "outside\n", "utf8");
  await rm(target);
  await symlink(external, target);

  await assert.rejects(
    invokeCapability({
      runDir,
      capability: "files.read",
      input: { path: fixtureKey },
    }),
    {
      code: "io_error",
      message: `Harness path must be a regular file inside the run directory: ${fixtureKey}`,
    },
  );
  assert.deepEqual(await readCapabilityTrace(runDir), [
    {
      sequence: 1,
      capability: "files.read",
      input: { path: fixtureKey },
      status: "error",
      error: {
        code: "io_error",
        message: `Harness path must be a regular file inside the run directory: ${fixtureKey}`,
      },
    },
  ]);
});

test("trace appends reject symlink substitution without writing outside", async (t) => {
  const { root, runDir } = await temporaryRun(t);
  await createCapabilityRun({ scenarioPath: reducedScenario, runDir });
  const external = join(root, "external-trace.jsonl");
  const tracePath = join(runDir, "trace.jsonl");
  await writeFile(external, "sentinel\n", "utf8");
  await rm(tracePath);
  await symlink(external, tracePath);

  await assert.rejects(
    invokeCapability({
      runDir,
      capability: "browser.search",
      input: { query: "operations" },
    }),
    {
      code: "io_error",
      message: "Harness trace must be a regular file inside the run directory",
    },
  );
  assert.equal(await readFile(external, "utf8"), "sentinel\n");
});

test("state.write receipts a candidate symlink error without writing outside", async (t) => {
  const { root, runDir } = await temporaryRun(t);
  await createCapabilityRun({ scenarioPath: reducedScenario, runDir });
  const external = join(root, "external-state.yaml");
  const candidate = join(runDir, "candidate-state.yaml");
  await writeFile(external, "sentinel\n", "utf8");
  await symlink(external, candidate);

  await assert.rejects(
    invokeCapability({
      runDir,
      capability: "state.write",
      input: { content: "schema_version: \"0.1\"\n" },
    }),
    {
      code: "io_error",
      message: "candidate-state.yaml already exists",
    },
  );
  assert.equal(await readFile(external, "utf8"), "sentinel\n");
  assert.deepEqual(await readCapabilityTrace(runDir), [
    {
      sequence: 1,
      capability: "state.write",
      input: { content: "schema_version: \"0.1\"\n" },
      status: "error",
      error: {
        code: "io_error",
        message: "candidate-state.yaml already exists",
      },
    },
  ]);
});

test("a second state.write is receipted before its I/O error is propagated", async (t) => {
  const { runDir } = await temporaryRun(t);
  await createCapabilityRun({ scenarioPath: reducedScenario, runDir });
  const firstInput = { content: "schema_version: \"0.1\"\nrevision: 1\n" };
  const secondInput = { content: "schema_version: \"0.1\"\nrevision: 2\n" };

  assert.equal(
    (await invokeCapability({
      runDir,
      capability: "state.write",
      input: firstInput,
    })).status,
    "success",
  );
  await assert.rejects(
    invokeCapability({
      runDir,
      capability: "state.write",
      input: secondInput,
    }),
    {
      code: "io_error",
      message: "candidate-state.yaml already exists",
    },
  );

  const trace = await readCapabilityTrace(runDir);
  assert.deepEqual(trace.map(({ sequence }) => sequence), [1, 2]);
  assert.deepEqual(trace.map(({ status }) => status), ["success", "error"]);
  assert.deepEqual(trace[1].error, {
    code: "io_error",
    message: "candidate-state.yaml already exists",
  });
  assert.equal(
    await readFile(join(runDir, "candidate-state.yaml"), "utf8"),
    firstInput.content,
  );
});

test("a same-shaped replaced run configuration cannot alter bindings", async (t) => {
  const { runDir } = await temporaryRun(t);
  await createCapabilityRun({ scenarioPath: reducedScenario, runDir });
  const configPath = join(runDir, "run-config.json");
  const replacementPath = join(runDir, "replacement-config.json");
  const configuration = JSON.parse(await readFile(configPath, "utf8"));
  const bindings = configuration.capability_bindings["files.read"];
  bindings[1] = { ...bindings[1], copy: bindings[0].copy };
  recomputeConfigurationDigest(configuration);
  await writeFile(
    replacementPath,
    `${JSON.stringify(configuration, null, 2)}\n`,
    { mode: 0o444 },
  );
  await rename(replacementPath, configPath);

  await assert.rejects(
    invokeCapability({
      runDir,
      capability: "files.read",
      input: { path: fixtureKey },
    }),
    {
      code: "invalid_configuration",
      message: "Harness configuration failed integrity validation",
    },
  );
  assert.equal(await readFile(join(runDir, "trace.jsonl"), "utf8"), "");
});

test("a donor configuration cannot replace a victim run identity or consume its failure", async (t) => {
  const { root, runDir: victimRunDir } = await temporaryRun(t);
  const donorRunDir = join(root, "donor-run");
  await createCapabilityRun({
    scenarioPath: partialFailureScenario,
    runDir: victimRunDir,
  });
  await createCapabilityRun({
    scenarioPath: fullScenario,
    runDir: donorRunDir,
  });

  const victimConfigPath = join(victimRunDir, "run-config.json");
  const victimConfigurationText = await readFile(victimConfigPath, "utf8");
  const victimConfiguration = JSON.parse(victimConfigurationText);
  const donorConfiguration = JSON.parse(
    await readFile(join(donorRunDir, "run-config.json"), "utf8"),
  );
  donorConfiguration.run_directory = victimConfiguration.run_directory;
  recomputeConfigurationDigest(donorConfiguration);
  const substitutedConfigPath = join(victimRunDir, "donor-config.json");
  await writeFile(
    substitutedConfigPath,
    `${JSON.stringify(donorConfiguration, null, 2)}\n`,
    { mode: 0o444 },
  );
  await rename(substitutedConfigPath, victimConfigPath);

  const input = { query: "victim failure remains scheduled" };
  await assert.rejects(
    invokeCapability({
      runDir: victimRunDir,
      capability: "browser.search",
      input,
    }),
    {
      code: "invalid_configuration",
      message: "Harness configuration failed integrity validation",
    },
  );
  assert.equal(
    await readFile(join(victimRunDir, "trace.jsonl"), "utf8"),
    "",
  );

  const restoredConfigPath = join(victimRunDir, "restored-config.json");
  await writeFile(restoredConfigPath, victimConfigurationText, { mode: 0o444 });
  await rename(restoredConfigPath, victimConfigPath);
  assert.deepEqual(
    await invokeCapability({
      runDir: victimRunDir,
      capability: "browser.search",
      input,
    }),
    {
      status: "failure",
      error: {
        code: "controlled_failure",
        message: "transient source timeout",
      },
    },
  );
  assert.deepEqual(
    (await readCapabilityTrace(victimRunDir)).map(
      ({ sequence, status }) => ({ sequence, status }),
    ),
    [{ sequence: 1, status: "failure" }],
  );
});

test("a missing fixed run anchor rejects capability calls", async (t) => {
  const { runDir } = await temporaryRun(t);
  await createCapabilityRun({ scenarioPath: fullScenario, runDir });
  await rm(join(runDir, anchorFilename), { force: true });

  await assert.rejects(
    invokeCapability({
      runDir,
      capability: "browser.search",
      input: { query: "missing anchor" },
    }),
    {
      code: "invalid_configuration",
      message: "Harness configuration failed integrity validation",
    },
  );
  assert.equal(await readFile(join(runDir, "trace.jsonl"), "utf8"), "");
});

test("a symlinked fixed run anchor rejects capability calls", async (t) => {
  const { root, runDir } = await temporaryRun(t);
  await createCapabilityRun({ scenarioPath: fullScenario, runDir });
  const anchorPath = join(runDir, anchorFilename);
  const externalAnchor = join(root, "external-anchor.json");
  await writeFile(externalAnchor, "{}\n", "utf8");
  await rm(anchorPath, { force: true });
  await symlink(externalAnchor, anchorPath);

  await assert.rejects(
    invokeCapability({
      runDir,
      capability: "browser.search",
      input: { query: "symlinked anchor" },
    }),
    {
      code: "invalid_configuration",
      message: "Harness configuration failed integrity validation",
    },
  );
  assert.equal(await readFile(externalAnchor, "utf8"), "{}\n");
  assert.equal(await readFile(join(runDir, "trace.jsonl"), "utf8"), "");
});

test("init rejects an existing run directory without modifying it", async (t) => {
  const { runDir } = await temporaryRun(t);
  await writeFile(runDir, "sentinel\n", "utf8");

  await assert.rejects(
    createCapabilityRun({ scenarioPath: reducedScenario, runDir }),
    {
      code: "io_error",
      message: `Run directory already exists: ${resolve(runDir)}`,
    },
  );
  assert.equal(await readFile(runDir, "utf8"), "sentinel\n");
});

test("CLI emits one JSON value and uses exit codes 0, 1, and 2", async (t) => {
  const { root, runDir } = await temporaryRun(t);

  const initialized = runCli([
    "init",
    reducedScenario.pathname,
    runDir,
  ]);
  assert.equal(initialized.status, 0);
  assert.equal(initialized.value.status, "success");

  const unavailable = runCli([
    "call",
    runDir,
    "browser.search",
    JSON.stringify({ query: "operations" }),
  ]);
  assert.equal(unavailable.status, 1);
  assert.equal(unavailable.value.status, "capability_unavailable");

  const trace = runCli(["trace", runDir]);
  assert.equal(trace.status, 0);
  assert.equal(trace.value.status, "success");
  assert.equal(trace.value.result.length, 1);

  const usage = runCli([]);
  assert.equal(usage.status, 2);
  assert.deepEqual(usage.value, {
    status: "error",
    error: {
      code: "usage",
      message:
        "node tests/hunter/helpers/capability-harness.mjs init <scenario.yaml> <run-dir> | call <run-dir> <capability> <json-input> | trace <run-dir>",
    },
  });

  const invalidJson = runCli([
    "call",
    runDir,
    "files.read",
    "{",
  ]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(invalidJson.value, {
    status: "error",
    error: {
      code: "invalid_input",
      message: "json-input must be valid JSON",
    },
  });

  assert.equal(dirname(resolve(runDir)), resolve(root));
});
