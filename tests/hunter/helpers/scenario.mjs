import { realpathSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import { parseDocument } from "yaml";

const schema = JSON.parse(
  await readFile(
    new URL("../scenarios/scenario.schema.json", import.meta.url),
    "utf8",
  ),
);

const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(
  schema,
);

const scenariosDirectory = realpathSync(
  fileURLToPath(new URL("../scenarios/", import.meta.url)),
);
const fixturesDirectory = realpathSync(
  fileURLToPath(new URL("../fixtures/", import.meta.url)),
);

const pointerToken = (value) =>
  String(value).replaceAll("~", "~0").replaceAll("/", "~1");

const diagnostic = (path, message) => ({ path, message });

function validateFixturePath(path, diagnosticPath) {
  let canonicalPath;
  try {
    canonicalPath = realpathSync(resolve(scenariosDirectory, path));
  } catch {
    return diagnostic(
      diagnosticPath,
      "Fixture path must reference an existing file",
    );
  }

  const fixtureRelativePath = relative(fixturesDirectory, canonicalPath);
  if (
    fixtureRelativePath === ".." ||
    fixtureRelativePath.startsWith(`..${sep}`) ||
    isAbsolute(fixtureRelativePath)
  ) {
    return diagnostic(
      diagnosticPath,
      "Fixture path must resolve inside tests/hunter/fixtures",
    );
  }

  if (!statSync(canonicalPath).isFile()) {
    return diagnostic(
      diagnosticPath,
      "Fixture path must reference a regular file",
    );
  }

  return undefined;
}

export async function loadScenario(url) {
  const document = parseDocument(await readFile(url, "utf8"), {
    uniqueKeys: true,
  });

  if (document.errors.length > 0) {
    throw new SyntaxError(
      document.errors.map(({ message }) => message).join("\n"),
    );
  }

  return document.toJS();
}

export function validateScenarioShape(scenario, filename) {
  if (!validateSchema(scenario)) {
    return (validateSchema.errors ?? []).map(({ instancePath, message }) =>
      diagnostic(instancePath, message ?? "Invalid scenario value"),
    );
  }

  const diagnostics = [];
  const expectedId = basename(filename, ".yaml");
  if (scenario.id !== expectedId) {
    diagnostics.push(
      diagnostic("/id", "Scenario id must match its YAML filename"),
    );
  }

  for (const [index, path] of (scenario.fixtures ?? []).entries()) {
    const fixtureDiagnostic = validateFixturePath(path, `/fixtures/${index}`);
    if (fixtureDiagnostic) diagnostics.push(fixtureDiagnostic);
  }

  const available = new Set(scenario.capabilities.available);
  for (const [index, capability] of
    scenario.capabilities.unavailable.entries()) {
    if (available.has(capability)) {
      diagnostics.push(
        diagnostic(
          `/capabilities/unavailable/${index}`,
          "Capability must not be both available and unavailable",
        ),
      );
    }
  }

  const scheduledFailures = new Set();
  for (const [index, failure] of scenario.capabilities.failures.entries()) {
    if (!available.has(failure.capability)) {
      diagnostics.push(
        diagnostic(
          `/capabilities/failures/${index}/capability`,
          "Failure capability must be available",
        ),
      );
    }
    if (scheduledFailures.has(failure.capability)) {
      diagnostics.push(
        diagnostic(
          `/capabilities/failures/${index}/capability`,
          "Failure capability must have at most one schedule",
        ),
      );
    }
    scheduledFailures.add(failure.capability);
  }

  const fixtures = new Set(scenario.fixtures ?? []);
  for (const [capability, paths] of Object.entries(
    scenario.capability_bindings ?? {},
  )) {
    const capabilityPath = pointerToken(capability);
    if (!available.has(capability)) {
      diagnostics.push(
        diagnostic(
          `/capability_bindings/${capabilityPath}`,
          "Capability binding must target an available capability",
        ),
      );
    }
    for (const [index, path] of paths.entries()) {
      if (!fixtures.has(path)) {
        diagnostics.push(
          diagnostic(
            `/capability_bindings/${capabilityPath}/${index}`,
            "Capability binding path must be listed in fixtures",
          ),
        );
      }
      const fixtureDiagnostic = validateFixturePath(
        path,
        `/capability_bindings/${capabilityPath}/${index}`,
      );
      if (fixtureDiagnostic) diagnostics.push(fixtureDiagnostic);
    }
  }

  return diagnostics;
}
