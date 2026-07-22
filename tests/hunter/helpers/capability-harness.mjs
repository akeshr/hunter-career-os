#!/usr/bin/env node

import { constants } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { loadScenario, validateScenarioShape } from "./scenario.mjs";

const modulePath = fileURLToPath(import.meta.url);
const scenariosDirectory = await realpath(
  fileURLToPath(new URL("../scenarios/", import.meta.url)),
);
const fixturesDirectory = await realpath(
  fileURLToPath(new URL("../fixtures/", import.meta.url)),
);
const anchorFilename = "run-anchor.json";
const configFilename = "run-config.json";
const traceFilename = "trace.jsonl";
const candidateFilename = "candidate-state.yaml";
const lockFilename = ".capability-harness.lock";
const anchorVersion = 1;
const configurationVersion = 3;
const lockRetryDelayMilliseconds = 5;
const lockRetryLimit = 4000;
const usage =
  "node tests/hunter/helpers/capability-harness.mjs init <scenario.yaml> <run-dir> | call <run-dir> <capability> <json-input> | trace <run-dir>";
const readableCapabilities = new Set([
  "files.read",
  "state.read",
  "browser.search",
  "browser.navigate",
  "connected.sources.read",
]);
const supportedCapabilities = new Set([
  ...readableCapabilities,
  "state.write",
]);

class CapabilityHarnessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CapabilityHarnessError";
    this.code = code;
  }
}

const harnessError = (code, message) =>
  new CapabilityHarnessError(code, message);

const configurationIntegrityError = () =>
  harnessError(
    "invalid_configuration",
    "Harness configuration failed integrity validation",
  );

const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, expectedKeys) {
  if (!isPlainObject(value)) return false;
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index]);
}

function isContained(root, path) {
  const pathFromRoot = relative(root, path);
  return pathFromRoot !== ".." &&
    !pathFromRoot.startsWith(`..${sep}`) &&
    !isAbsolute(pathFromRoot);
}

async function pathStatus(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

function scenarioFilePath(scenarioPath) {
  if (scenarioPath instanceof URL) {
    if (scenarioPath.protocol !== "file:") {
      throw harnessError("invalid_input", "scenarioPath must be a file path");
    }
    return fileURLToPath(scenarioPath);
  }
  if (typeof scenarioPath !== "string" || scenarioPath.length === 0) {
    throw harnessError("invalid_input", "scenarioPath must be a file path");
  }
  return resolve(scenarioPath);
}

async function canonicalScenario(scenarioPath) {
  const requestedPath = scenarioFilePath(scenarioPath);
  let canonicalPath;
  try {
    canonicalPath = await realpath(requestedPath);
  } catch {
    throw harnessError(
      "io_error",
      `Scenario must be an existing file inside tests/hunter/scenarios: ${requestedPath}`,
    );
  }
  const status = await lstat(canonicalPath);
  if (!status.isFile() || !isContained(scenariosDirectory, canonicalPath)) {
    throw harnessError(
      "io_error",
      `Scenario must be an existing file inside tests/hunter/scenarios: ${requestedPath}`,
    );
  }
  return canonicalPath;
}

function normalizedRunDirectory(runDir) {
  if (typeof runDir !== "string" || runDir.length === 0) {
    throw harnessError("invalid_input", "runDir must be a nonempty path");
  }
  return resolve(runDir);
}

function configurationError(diagnostics) {
  return harnessError(
    "invalid_configuration",
    `Invalid capability scenario: ${JSON.stringify(diagnostics)}`,
  );
}

function validateHarnessBindings(scenario) {
  const diagnostics = [];
  const available = new Set(scenario.capabilities.available);
  const unavailable = new Set(scenario.capabilities.unavailable);
  for (const capability of [...available, ...unavailable]) {
    if (!supportedCapabilities.has(capability)) {
      diagnostics.push({
        path: "/capabilities",
        message: `Unsupported harness capability: ${capability}`,
      });
    }
  }
  for (const capability of readableCapabilities) {
    if (available.has(capability)) {
      const paths = scenario.capability_bindings?.[capability];
      if (!Array.isArray(paths) || paths.length === 0) {
        diagnostics.push({
          path: `/capability_bindings/${capability.replaceAll("~", "~0").replaceAll("/", "~1")}`,
          message: "Available readable capability must have an explicit binding",
        });
      }
    }
  }
  if (
    available.has("state.read") &&
    scenario.capability_bindings?.["state.read"]?.length !== 1
  ) {
    diagnostics.push({
      path: "/capability_bindings/state.read",
      message: "state.read must bind exactly one fixture",
    });
  }
  if (scenario.capability_bindings?.["state.write"] !== undefined) {
    diagnostics.push({
      path: "/capability_bindings/state.write",
      message: "state.write must not bind an input fixture",
    });
  }
  return diagnostics;
}

async function declaredFixture(fixtureKey) {
  const sourcePath = resolve(scenariosDirectory, fixtureKey);
  const canonicalSource = await realpath(sourcePath);
  if (!isContained(fixturesDirectory, canonicalSource)) {
    throw configurationError([
      {
        path: "/fixtures",
        message: `Fixture escapes the canonical fixture directory: ${fixtureKey}`,
      },
    ]);
  }
  const fixtureRelativePath = relative(fixturesDirectory, canonicalSource);
  const destinationRelativePath = ["fixtures", fixtureRelativePath]
    .join("/")
    .split(sep)
    .join("/");
  return { canonicalSource, destinationRelativePath };
}

async function copyDeclaredFixture({ fixtureKey, runDirectory }) {
  const { canonicalSource, destinationRelativePath } =
    await declaredFixture(fixtureKey);
  const destinationPath = resolve(runDirectory, destinationRelativePath);
  if (!isContained(runDirectory, destinationPath)) {
    throw configurationError([
      {
        path: "/fixtures",
        message: `Fixture destination escapes the run directory: ${fixtureKey}`,
      },
    ]);
  }
  await mkdir(dirname(destinationPath), { recursive: true, mode: 0o700 });
  await copyFile(canonicalSource, destinationPath, constants.COPYFILE_EXCL);
  await chmod(destinationPath, 0o444);
  return destinationRelativePath;
}

function configurationPayload({
  scenario,
  scenarioPathname,
  scenarioHash,
  runDirectory,
  copiedFixtures,
}) {
  const bindings = {};
  for (const [capability, fixtureKeys] of Object.entries(
    scenario.capability_bindings ?? {},
  )) {
    bindings[capability] = fixtureKeys.map((fixtureKey) => ({
      path: fixtureKey,
      copy: copiedFixtures[fixtureKey],
    }));
  }
  return {
    version: configurationVersion,
    scenario_id: scenario.id,
    run_directory: runDirectory,
    source: {
      scenario_path: scenarioPathname,
      scenario_sha256: scenarioHash,
    },
    capabilities: {
      available: [...scenario.capabilities.available],
      unavailable: [...scenario.capabilities.unavailable],
      failures: scenario.capabilities.failures.map((failure) => ({ ...failure })),
    },
    fixtures: Object.entries(copiedFixtures).map(([path, copy]) => ({
      path,
      copy,
    })),
    capability_bindings: bindings,
  };
}

function createRunAnchor({ scenarioPathname, scenarioHash, runDirectory }) {
  return {
    version: anchorVersion,
    run_directory: runDirectory,
    source: {
      scenario_path: scenarioPathname,
      scenario_sha256: scenarioHash,
    },
    nonce: randomUUID(),
  };
}

function configurationDigest(payload, anchor) {
  return sha256(JSON.stringify({
    anchor: {
      nonce: anchor.nonce,
      run_directory: anchor.run_directory,
    },
    configuration: payload,
  }));
}

function sealConfiguration(payload, anchor) {
  return {
    ...payload,
    integrity: {
      algorithm: "sha256",
      anchor_nonce: anchor.nonce,
      digest: configurationDigest(payload, anchor),
    },
  };
}

async function writeFixedImmutableJson(path, value) {
  let handle;
  try {
    handle = await open(
      path,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o400,
    );
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.chmod(0o444);
  } finally {
    if (handle) await handle.close();
  }
}

async function expectedCopiedFixtures(scenario) {
  const copiedFixtures = {};
  for (const fixtureKey of scenario.fixtures ?? []) {
    const { destinationRelativePath } = await declaredFixture(fixtureKey);
    copiedFixtures[fixtureKey] = destinationRelativePath;
  }
  return copiedFixtures;
}

export async function createCapabilityRun({ scenarioPath, runDir } = {}) {
  const scenarioPathname = await canonicalScenario(scenarioPath);
  const runDirectory = normalizedRunDirectory(runDir);
  if (await pathStatus(runDirectory)) {
    throw harnessError(
      "io_error",
      `Run directory already exists: ${runDirectory}`,
    );
  }

  const scenario = await loadScenario(scenarioPathname);
  const scenarioHash = sha256(await readFile(scenarioPathname));
  const diagnostics = [
    ...validateScenarioShape(scenario, scenarioPathname),
    ...validateHarnessBindings(scenario),
  ];
  if (diagnostics.length > 0) throw configurationError(diagnostics);

  await mkdir(runDirectory, { recursive: false, mode: 0o700 });
  try {
    const canonicalRunDirectory = await realpath(runDirectory);
    const copiedFixtures = {};
    for (const fixtureKey of scenario.fixtures ?? []) {
      copiedFixtures[fixtureKey] = await copyDeclaredFixture({
        fixtureKey,
        runDirectory: canonicalRunDirectory,
      });
    }
    const payload = configurationPayload({
      scenario,
      scenarioPathname,
      scenarioHash,
      runDirectory: canonicalRunDirectory,
      copiedFixtures,
    });
    const anchor = createRunAnchor({
      scenarioPathname,
      scenarioHash,
      runDirectory: canonicalRunDirectory,
    });
    const configuration = sealConfiguration(payload, anchor);
    await writeFixedImmutableJson(
      resolve(canonicalRunDirectory, anchorFilename),
      anchor,
    );
    const configPath = resolve(canonicalRunDirectory, configFilename);
    await writeFixedImmutableJson(configPath, configuration);
    await writeFile(resolve(canonicalRunDirectory, traceFilename), "", {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    return {
      status: "success",
      result: {
        scenario_id: scenario.id,
        run_dir: canonicalRunDirectory,
        capabilities: configuration.capabilities,
        fixtures: configuration.fixtures.map(({ path }) => path),
      },
    };
  } catch (error) {
    await rm(runDirectory, { recursive: true, force: true });
    if (error instanceof CapabilityHarnessError) throw error;
    throw harnessError("io_error", error.message);
  }
}

async function openContainedRegularFile({
  root,
  path,
  label,
  displayPath,
  flags = constants.O_RDONLY | constants.O_NOFOLLOW,
}) {
  const suffix = displayPath === null
    ? ""
    : `: ${displayPath ?? relative(root, path)}`;
  let canonicalPath;
  try {
    const status = await lstat(path);
    canonicalPath = await realpath(path);
    if (!status.isFile() || !isContained(root, canonicalPath)) throw new Error();
  } catch {
    throw harnessError(
      "io_error",
      `${label}${suffix}`,
    );
  }
  try {
    return await open(path, flags);
  } catch {
    throw harnessError(
      "io_error",
      `${label}${suffix}`,
    );
  }
}

async function resolveRunDirectory(runDir) {
  const requestedRunDirectory = normalizedRunDirectory(runDir);
  let canonicalRunDirectory;
  try {
    const status = await lstat(requestedRunDirectory);
    if (!status.isDirectory()) throw new Error();
    canonicalRunDirectory = await realpath(requestedRunDirectory);
  } catch {
    throw harnessError(
      "io_error",
      `Run directory must be an existing directory: ${requestedRunDirectory}`,
    );
  }
  return canonicalRunDirectory;
}

async function acquireRunLock(runDirectory) {
  const lockPath = resolve(runDirectory, lockFilename);
  for (let attempt = 0; attempt < lockRetryLimit; attempt += 1) {
    let handle;
    try {
      handle = await open(
        lockPath,
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW,
        0o600,
      );
      const identity = await handle.stat();
      return async () => {
        await handle.close();
        let current;
        try {
          current = await lstat(lockPath);
        } catch {
          throw harnessError(
            "io_error",
            "Harness run lock changed before release",
          );
        }
        if (
          !current.isFile() ||
          current.dev !== identity.dev ||
          current.ino !== identity.ino
        ) {
          throw harnessError(
            "io_error",
            "Harness run lock changed before release",
          );
        }
        await rm(lockPath);
      };
    } catch (error) {
      if (handle) await handle.close();
      if (error.code !== "EEXIST") {
        if (error instanceof CapabilityHarnessError) throw error;
        throw harnessError("io_error", "Harness run lock could not be acquired");
      }
      if (attempt + 1 === lockRetryLimit) break;
      await delay(lockRetryDelayMilliseconds);
    }
  }
  throw harnessError("io_error", "Timed out waiting for harness run lock");
}

async function withRunLock(runDir, operation) {
  const runDirectory = await resolveRunDirectory(runDir);
  const release = await acquireRunLock(runDirectory);
  try {
    return await operation(runDirectory);
  } finally {
    await release();
  }
}

async function readFixedIntegrityJson(runDirectory, filename) {
  let handle;
  try {
    handle = await openContainedRegularFile({
      root: runDirectory,
      path: resolve(runDirectory, filename),
      label: "Harness integrity file must be a regular file inside the run directory",
      displayPath: filename,
    });
    const text = await handle.readFile("utf8");
    await handle.close();
    handle = undefined;
    return JSON.parse(text);
  } catch {
    if (handle) {
      try {
        await handle.close();
      } catch {
        // Preserve the stable integrity failure below.
      }
    }
    throw configurationIntegrityError();
  }
}

async function loadAuthoritativeConfiguration(runDirectory) {
  const anchor = await readFixedIntegrityJson(runDirectory, anchorFilename);
  if (
    !hasExactKeys(anchor, ["version", "run_directory", "source", "nonce"]) ||
    anchor.version !== anchorVersion ||
    anchor.run_directory !== runDirectory ||
    !hasExactKeys(anchor.source, ["scenario_path", "scenario_sha256"]) ||
    typeof anchor.source.scenario_path !== "string" ||
    !/^[0-9a-f]{64}$/.test(anchor.source.scenario_sha256) ||
    typeof anchor.nonce !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      anchor.nonce,
    )
  ) {
    throw configurationIntegrityError();
  }

  let scenarioPathname;
  let scenario;
  let scenarioHash;
  let copiedFixtures;
  try {
    scenarioPathname = await canonicalScenario(anchor.source.scenario_path);
    if (scenarioPathname !== anchor.source.scenario_path) {
      throw new Error("scenario path changed");
    }
    scenarioHash = sha256(await readFile(scenarioPathname));
    if (scenarioHash !== anchor.source.scenario_sha256) {
      throw new Error("scenario content changed");
    }
    scenario = await loadScenario(scenarioPathname);
    const diagnostics = [
      ...validateScenarioShape(scenario, scenarioPathname),
      ...validateHarnessBindings(scenario),
    ];
    if (diagnostics.length > 0) throw new Error("scenario became invalid");
    copiedFixtures = await expectedCopiedFixtures(scenario);
  } catch {
    throw configurationIntegrityError();
  }

  const configuration = await readFixedIntegrityJson(
    runDirectory,
    configFilename,
  );
  if (
    !isPlainObject(configuration) ||
    configuration.version !== configurationVersion ||
    configuration.run_directory !== runDirectory ||
    typeof configuration.scenario_id !== "string" ||
    !isPlainObject(configuration.source) ||
    typeof configuration.source.scenario_path !== "string" ||
    typeof configuration.source.scenario_sha256 !== "string" ||
    !isPlainObject(configuration.capabilities) ||
    !Array.isArray(configuration.capabilities.available) ||
    !Array.isArray(configuration.capabilities.unavailable) ||
    !Array.isArray(configuration.capabilities.failures) ||
    !Array.isArray(configuration.fixtures) ||
    !isPlainObject(configuration.capability_bindings) ||
    !hasExactKeys(configuration.integrity, [
      "algorithm",
      "anchor_nonce",
      "digest",
    ]) ||
    configuration.integrity.algorithm !== "sha256" ||
    configuration.integrity.anchor_nonce !== anchor.nonce ||
    !/^[0-9a-f]{64}$/.test(configuration.integrity.digest)
  ) {
    throw configurationIntegrityError();
  }
  const { integrity, ...payload } = configuration;
  if (
    !isDeepStrictEqual(payload.source, anchor.source) ||
    integrity.digest !== configurationDigest(payload, anchor)
  ) {
    throw configurationIntegrityError();
  }

  const expectedPayload = configurationPayload({
    scenario,
    scenarioPathname,
    scenarioHash,
    runDirectory,
    copiedFixtures,
  });
  if (!isDeepStrictEqual(payload, expectedPayload)) {
    throw configurationIntegrityError();
  }
  return expectedPayload;
}

async function traceFileHandle(runDirectory, flags = constants.O_RDONLY) {
  return openContainedRegularFile({
    root: runDirectory,
    path: resolve(runDirectory, traceFilename),
    label: "Harness trace must be a regular file inside the run directory",
    displayPath: null,
    flags: flags | constants.O_NOFOLLOW,
  });
}

async function readTraceFromRun(runDirectory) {
  const handle = await traceFileHandle(runDirectory);
  let text;
  try {
    text = await handle.readFile("utf8");
  } finally {
    await handle.close();
  }
  if (text.length === 0) return [];
  if (!text.endsWith("\n")) {
    throw harnessError("invalid_configuration", "Harness trace is not valid JSONL");
  }
  let trace;
  try {
    trace = text
      .slice(0, -1)
      .split("\n")
      .map((line) => JSON.parse(line));
  } catch {
    throw harnessError("invalid_configuration", "Harness trace is not valid JSONL");
  }
  if (
    trace.some(
      (receipt, index) =>
        !isPlainObject(receipt) || receipt.sequence !== index + 1,
    )
  ) {
    throw harnessError(
      "invalid_configuration",
      "Harness trace sequence must be contiguous",
    );
  }
  return trace;
}

export async function readCapabilityTrace(runDir) {
  return withRunLock(runDir, async (runDirectory) => {
    await loadAuthoritativeConfiguration(runDirectory);
    return readTraceFromRun(runDirectory);
  });
}

async function commitReceipt(runDirectory, trace, receipt) {
  if (receipt.sequence !== trace.length + 1) {
    throw harnessError(
      "invalid_configuration",
      "Harness trace sequence must be contiguous",
    );
  }
  const existingHandle = await traceFileHandle(runDirectory);
  try {
    await existingHandle.close();
  } catch (error) {
    throw error;
  }

  const tracePath = resolve(runDirectory, traceFilename);
  const temporaryPath = resolve(
    runDirectory,
    `.trace-${process.pid}-${randomUUID()}.tmp`,
  );
  let handle;
  try {
    handle = await open(
      temporaryPath,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
    const nextTrace = [...trace, receipt]
      .map((value) => JSON.stringify(value))
      .join("\n");
    await handle.writeFile(`${nextTrace}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, tracePath);
  } finally {
    if (handle) await handle.close();
    await rm(temporaryPath, { force: true });
  }
}

function requireObjectInput(capability, input) {
  if (!isPlainObject(input)) {
    throw harnessError(
      "invalid_input",
      `${capability} input must be a JSON object`,
    );
  }
}

function requireExactKeys(capability, input, expectedKeys) {
  requireObjectInput(capability, input);
  const actualKeys = Object.keys(input).sort();
  const sortedExpected = [...expectedKeys].sort();
  if (
    actualKeys.length !== sortedExpected.length ||
    actualKeys.some((key, index) => key !== sortedExpected[index])
  ) {
    throw harnessError(
      "invalid_input",
      `${capability} input must contain exactly: ${expectedKeys.join(", ") || "no fields"}`,
    );
  }
}

function boundEntries(configuration, capability) {
  return configuration.capability_bindings[capability] ?? [];
}

function boundEntry(configuration, capability, path) {
  const entry = boundEntries(configuration, capability).find(
    ({ path: boundPath }) => boundPath === path,
  );
  if (!entry) {
    throw harnessError(
      "invalid_input",
      `${capability} path is not bound: ${path}`,
    );
  }
  return entry;
}

async function readFixture(runDirectory, entry) {
  const fixturePath = resolve(runDirectory, entry.copy);
  const handle = await openContainedRegularFile({
    root: runDirectory,
    path: fixturePath,
    label: "Harness path must be a regular file inside the run directory",
    displayPath: entry.path,
  });
  try {
    return await handle.readFile("utf8");
  } finally {
    await handle.close();
  }
}

function validateAdapterInput(capability, input, configuration) {
  switch (capability) {
    case "files.read":
    case "browser.navigate":
      requireExactKeys(capability, input, ["path"]);
      if (typeof input.path !== "string" || input.path.length === 0) {
        throw harnessError("invalid_input", `${capability} path must be a nonempty string`);
      }
      boundEntry(configuration, capability, input.path);
      break;
    case "state.read":
    case "connected.sources.read":
      requireExactKeys(capability, input, []);
      break;
    case "browser.search":
      requireExactKeys(capability, input, ["query"]);
      if (typeof input.query !== "string" || input.query.length === 0) {
        throw harnessError("invalid_input", "browser.search query must be a nonempty string");
      }
      break;
    case "state.write":
      requireExactKeys(capability, input, ["content"]);
      if (typeof input.content !== "string" || input.content.length === 0) {
        throw harnessError("invalid_input", "state.write content must be a nonempty string");
      }
      break;
    default:
      throw harnessError(
        "invalid_configuration",
        `Unsupported harness capability: ${capability}`,
      );
  }
}

async function invokeAdapter({
  runDirectory,
  configuration,
  capability,
  input,
}) {
  switch (capability) {
    case "files.read":
    case "browser.navigate": {
      const entry = boundEntry(configuration, capability, input.path);
      return {
        path: entry.path,
        content: await readFixture(runDirectory, entry),
      };
    }
    case "state.read": {
      const [entry] = boundEntries(configuration, capability);
      return {
        path: entry.path,
        content: await readFixture(runDirectory, entry),
      };
    }
    case "browser.search":
      return {
        query: input.query,
        paths: boundEntries(configuration, capability).map(({ path }) => path),
      };
    case "connected.sources.read": {
      const entries = boundEntries(configuration, capability);
      return {
        paths: entries.map(({ path }) => path),
        sources: await Promise.all(
          entries.map(async (entry) => ({
            path: entry.path,
            content: await readFixture(runDirectory, entry),
          })),
        ),
      };
    }
    case "state.write": {
      const candidatePath = resolve(runDirectory, candidateFilename);
      if (await pathStatus(candidatePath)) {
        throw harnessError("io_error", `${candidateFilename} already exists`);
      }
      let handle;
      try {
        handle = await open(
          candidatePath,
          constants.O_WRONLY |
            constants.O_CREAT |
            constants.O_EXCL |
            constants.O_NOFOLLOW,
          0o600,
        );
        await handle.writeFile(input.content, "utf8");
      } catch (error) {
        if (error instanceof CapabilityHarnessError) throw error;
        throw harnessError("io_error", `${candidateFilename} could not be written`);
      } finally {
        if (handle) await handle.close();
      }
      return {
        path: candidateFilename,
        bytes: Buffer.byteLength(input.content),
      };
    }
  }
}

export async function invokeCapability({ runDir, capability, input } = {}) {
  if (typeof capability !== "string" || capability.length === 0) {
    throw harnessError("invalid_input", "capability must be a nonempty string");
  }
  requireObjectInput(capability, input);
  return withRunLock(runDir, async (runDirectory) => {
    const configuration = await loadAuthoritativeConfiguration(runDirectory);
    const available = new Set(configuration.capabilities.available);
    const unavailable = new Set(configuration.capabilities.unavailable);
    if (!available.has(capability) && !unavailable.has(capability)) {
      throw harnessError(
        "invalid_input",
        `Capability is not declared by this run: ${capability}`,
      );
    }

    const trace = await readTraceFromRun(runDirectory);
    const sequence = trace.length + 1;
    if (unavailable.has(capability)) {
      const response = {
        status: "capability_unavailable",
        error: {
          code: "capability_unavailable",
          message: `Capability is unavailable: ${capability}`,
        },
      };
      await commitReceipt(runDirectory, trace, {
        sequence,
        capability,
        input,
        ...response,
      });
      return response;
    }

    validateAdapterInput(capability, input, configuration);
    const failure = configuration.capabilities.failures.find(
      ({ capability: scheduledCapability }) =>
        scheduledCapability === capability,
    );
    const priorControlledFailures = trace.filter(
      (receipt) =>
        receipt.capability === capability &&
        receipt.status === "failure" &&
        receipt.error?.code === "controlled_failure",
    ).length;
    if (failure && priorControlledFailures < failure.times) {
      const response = {
        status: "failure",
        error: {
          code: "controlled_failure",
          message: failure.error,
        },
      };
      await commitReceipt(runDirectory, trace, {
        sequence,
        capability,
        input,
        ...response,
      });
      return response;
    }

    let result;
    try {
      result = await invokeAdapter({
        runDirectory,
        configuration,
        capability,
        input,
      });
    } catch (error) {
      const operationalError = error instanceof CapabilityHarnessError
        ? error
        : harnessError(
          "io_error",
          error instanceof Error ? error.message : String(error),
        );
      const response = {
        status: "error",
        error: {
          code: operationalError.code,
          message: operationalError.message,
        },
      };
      await commitReceipt(runDirectory, trace, {
        sequence,
        capability,
        input,
        ...response,
      });
      throw operationalError;
    }

    const response = { status: "success", result };
    await commitReceipt(runDirectory, trace, {
      sequence,
      capability,
      input,
      ...response,
    });
    return response;
  });
}

function outputJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function runCli(args) {
  try {
    if (args[0] === "init" && args.length === 3) {
      outputJson(
        await createCapabilityRun({ scenarioPath: args[1], runDir: args[2] }),
      );
      return 0;
    }
    if (args[0] === "call" && args.length === 4) {
      let input;
      try {
        input = JSON.parse(args[3]);
      } catch {
        throw harnessError("invalid_input", "json-input must be valid JSON");
      }
      const response = await invokeCapability({
        runDir: args[1],
        capability: args[2],
        input,
      });
      outputJson(response);
      return response.status === "success" ? 0 : 1;
    }
    if (args[0] === "trace" && args.length === 2) {
      outputJson({
        status: "success",
        result: await readCapabilityTrace(args[1]),
      });
      return 0;
    }
    throw harnessError("usage", usage);
  } catch (error) {
    const code = error instanceof CapabilityHarnessError
      ? error.code
      : "io_error";
    const message = error instanceof Error ? error.message : String(error);
    outputJson({ status: "error", error: { code, message } });
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  process.exitCode = await runCli(process.argv.slice(2));
}
