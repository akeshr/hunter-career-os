#!/usr/bin/env node

import { lstat, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { repairStateYaml } from "../../tools/hunter-state/repair.mjs";

const usage =
  "node tests/hunter/validate-state.mjs <state.yaml> [--repair-output <new.yaml>]";

const diagnostic = (kind, code, path, message) => ({
  kind,
  diagnostics: [{ code, path, message }],
});

function parseArguments(args) {
  if (args.length === 1 && !args[0].startsWith("--")) {
    return { input: args[0] };
  }
  if (
    args.length === 3 &&
    !args[0].startsWith("--") &&
    args[1] === "--repair-output" &&
    args[2].length > 0
  ) {
    return { input: args[0], output: args[2] };
  }
  return null;
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!options) {
    return {
      code: 2,
      report: diagnostic("usage_error", "usage", "", usage),
    };
  }

  const inputPath = resolve(options.input);
  const outputPath = options.output === undefined ? undefined : resolve(options.output);

  try {
    if (outputPath !== undefined) {
      if (outputPath === inputPath) {
        return {
          code: 2,
          report: diagnostic(
            "io_error",
            "output_path",
            outputPath,
            "repair output must not be the input path",
          ),
        };
      }
      if (await pathExists(outputPath)) {
        return {
          code: 2,
          report: diagnostic(
            "io_error",
            "output_exists",
            outputPath,
            "repair output path already exists",
          ),
        };
      }
    }

    const text = await readFile(inputPath, "utf8");
    const result = repairStateYaml(text);

    if (result.kind === "repaired" && outputPath !== undefined) {
      await writeFile(outputPath, result.yaml, { flag: "wx" });
      return { code: 0, report: { ...result, output: outputPath } };
    }

    const valid = result.kind === "valid" || result.kind === "repaired";
    return { code: valid ? 0 : 1, report: result };
  } catch (error) {
    return {
      code: 2,
      report: diagnostic(
        "io_error",
        "io",
        error.path ?? "",
        error.message,
      ),
    };
  }
}

const { code, report } = await main();
process.stdout.write(`${JSON.stringify(report)}\n`);
process.exitCode = code;
