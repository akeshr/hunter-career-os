import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = fileURLToPath(new URL("../../..", import.meta.url));
const cli = fileURLToPath(
  new URL("../support/validate-state-cli.mjs", import.meta.url),
);
const template = join(
  root,
  "plugins/hunter/skills/hunter/assets/hunter-state.template.yaml",
);
const invalid = fileURLToPath(
  new URL("../fixtures/state/repair/unrepairable.yaml", import.meta.url),
);
const reparable = fileURLToPath(
  new URL("../fixtures/state/repair/missing-collections.yaml", import.meta.url),
);

async function spawnCli(args) {
  try {
    const { stdout, stderr } = await run(process.execPath, [cli, ...args], {
      cwd: root,
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return {
      code: error.code,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
    };
  }
}

function oneJsonObject(stdout) {
  assert.equal(stdout.endsWith("\n"), true);
  assert.equal(stdout.trim().split("\n").length, 1);
  const value = JSON.parse(stdout);
  assert.equal(Array.isArray(value), false);
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  return value;
}

test("valid template exits 0 and prints exactly one JSON object", async () => {
  const result = await spawnCli([template]);

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(oneJsonObject(result.stdout).kind, "valid");
});

test("invalid state exits 1 and prints exactly one JSON object", async () => {
  const result = await spawnCli([invalid]);

  assert.equal(result.code, 1);
  assert.equal(result.stderr, "");
  assert.equal(oneJsonObject(result.stdout).kind, "unrepairable");
});

test("missing arguments exit 2 and print exactly one JSON object", async () => {
  const result = await spawnCli([]);

  assert.equal(result.code, 2);
  assert.equal(result.stderr, "");
  assert.equal(oneJsonObject(result.stdout).kind, "usage_error");
});

test("repair output creates a validated copy and preserves the source", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hunter-state-cli-"));
  const input = join(directory, "input.yaml");
  const output = join(directory, "repaired.yaml");
  const original = await readFile(reparable, "utf8");
  await writeFile(input, original);

  const result = await spawnCli([input, "--repair-output", output]);

  assert.equal(result.code, 0);
  const report = oneJsonObject(result.stdout);
  assert.equal(report.kind, "repaired");
  assert.equal(report.output, output);
  assert.equal(await readFile(input, "utf8"), original);
  assert.match(await readFile(output, "utf8"), /schema_version: "0.1"/);
});

test("repair output refuses an existing path without changing either file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hunter-state-cli-"));
  const input = join(directory, "input.yaml");
  const output = join(directory, "existing.yaml");
  const original = await readFile(reparable, "utf8");
  await writeFile(input, original);
  await writeFile(output, "sentinel\n");

  const result = await spawnCli([input, "--repair-output", output]);

  assert.equal(result.code, 2);
  assert.equal(oneJsonObject(result.stdout).kind, "io_error");
  assert.equal(await readFile(input, "utf8"), original);
  assert.equal(await readFile(output, "utf8"), "sentinel\n");
});

test("repair output refuses an input-equivalent path and preserves the source", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hunter-state-cli-"));
  const input = join(directory, "input.yaml");
  const equivalent = join(directory, "nested", "..", "input.yaml");
  const original = await readFile(reparable, "utf8");
  await writeFile(input, original);

  const result = await spawnCli([
    input,
    "--repair-output",
    normalize(equivalent),
  ]);

  assert.equal(result.code, 2);
  assert.equal(oneJsonObject(result.stdout).kind, "io_error");
  assert.equal(await readFile(input, "utf8"), original);
});

test("repair output is not written for an already-valid state", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hunter-state-cli-"));
  const output = join(directory, "unused.yaml");

  const result = await spawnCli([template, "--repair-output", output]);

  assert.equal(result.code, 0);
  assert.equal(oneJsonObject(result.stdout).kind, "valid");
  await assert.rejects(access(output));
});

test("input I/O failures exit 2", async () => {
  const result = await spawnCli([join(dirname(invalid), "missing.yaml")]);

  assert.equal(result.code, 2);
  assert.equal(oneJsonObject(result.stdout).kind, "io_error");
});
