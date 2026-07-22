// Repository test support; not part of the distributed Hunter plugin.
import {
  isAlias,
  isMap,
  isScalar,
  isSeq,
  parseDocument,
  stringify,
} from "yaml";
import { appendPointer } from "./pointer.mjs";

const diagnostic = (message, path = "", code = "parse") => ({
  code,
  path,
  message,
});

function findUnsupportedNode(node) {
  if (!node || typeof node !== "object") return null;
  if (isAlias(node)) return "YAML aliases are not supported";
  if (node.anchor) return "YAML anchors are not supported";
  if (node.tag) return "YAML tags are not supported";

  if (isMap(node)) {
    for (const pair of node.items) {
      const keyProblem = findUnsupportedNode(pair.key);
      if (keyProblem) return keyProblem;
      if (!isScalar(pair.key) || typeof pair.key.value !== "string") {
        return "Mapping keys must resolve to strings";
      }
      const valueProblem = findUnsupportedNode(pair.value);
      if (valueProblem) return valueProblem;
    }
  }

  if (isSeq(node)) {
    for (const item of node.items) {
      const problem = findUnsupportedNode(item);
      if (problem) return problem;
    }
  }

  return null;
}

function validateValue(value, path = "") {
  if (typeof value === "number" && !Number.isFinite(value)) {
    return diagnostic("Non-finite numbers are not supported", path);
  }
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    !Number.isSafeInteger(value)
  ) {
    return diagnostic(
      "Integers must be safe integers",
      path,
      "unsafe_integer",
    );
  }

  if (value === null || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const problem = validateValue(item, appendPointer(path, index));
      if (problem) return problem;
    }
    return null;
  }

  if (Object.getPrototypeOf(value) !== Object.prototype) {
    return diagnostic("Only plain objects are supported", path);
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const problem = validateValue(nestedValue, appendPointer(path, key));
    if (problem) return problem;
  }

  return null;
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortKeys(value[key])]),
  );
}

export function parseStateYaml(text, sourceName = "<memory>") {
  try {
    const document = parseDocument(text, { uniqueKeys: true });
    if (document.errors.length > 0) {
      return {
        ok: false,
        diagnostics: document.errors.map((error) => diagnostic(error.message)),
      };
    }

    const unsupported = findUnsupportedNode(document.contents);
    if (unsupported) {
      return { ok: false, diagnostics: [diagnostic(unsupported)] };
    }

    const state = document.toJS();
    const invalidValue = validateValue(state);
    if (invalidValue) {
      return { ok: false, diagnostics: [invalidValue] };
    }

    return { ok: true, state };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [diagnostic(`${sourceName}: ${error.message}`)],
    };
  }
}

export function serializeState(state) {
  return stringify(sortKeys(state), { lineWidth: 0 });
}
