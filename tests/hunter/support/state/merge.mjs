// Repository test support; not part of the distributed Hunter plugin.
import { validateStateObject } from "./validate.mjs";
import { appendPointer, pointer, pointerSegments } from "./pointer.mjs";

const MISSING = Symbol("missing");

const LOCATION = Object.freeze({
  normal: "normal",
  root: "root",
  profileMap: "profile_map",
  recordMap: "record_map",
  recordArray: "record_array",
  profileRecord: "profile_record",
  record: "record",
  artifactArray: "artifact_array",
});

const ROOT_RECORD_MAPS = new Set([
  "opportunities",
  "pursuits",
  "relationships",
]);

const clone = (value) => structuredClone(value);

const isPlainObject = (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const idMap = (array) => {
  if (!Array.isArray(array)) return null;
  const records = new Map();
  for (const record of array) {
    if (!isPlainObject(record) || typeof record.id !== "string" || records.has(record.id)) {
      return null;
    }
    records.set(record.id, record);
  }
  return records;
};

const areIdArrays = (values) => {
  const arrays = values.filter((value) => value !== MISSING);
  if (!arrays.every(Array.isArray) || arrays.every((array) => array.length === 0)) {
    return false;
  }
  return arrays.every((array) => idMap(array) !== null);
};

function semanticEqual(left, right) {
  if (left === MISSING || right === MISSING) return left === right;
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) && Array.isArray(right)) {
    if (areIdArrays([left, right])) {
      const leftById = idMap(left);
      const rightById = idMap(right);
      if (leftById.size !== rightById.size) return false;
      for (const [id, value] of leftById) {
        if (!rightById.has(id) || !semanticEqual(value, rightById.get(id))) {
          return false;
        }
      }
      return true;
    }
    return left.length === right.length
      && left.every((value, index) => semanticEqual(value, right[index]));
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length
      && leftKeys.every(
        (key, index) => key === rightKeys[index] && semanticEqual(left[key], right[key]),
      );
  }

  return false;
}

const isKnownRecord = (location) =>
  location === LOCATION.profileRecord || location === LOCATION.record;

const childLocation = (location, key) => {
  if (location === LOCATION.root) {
    if (key === "profiles") return LOCATION.profileMap;
    if (ROOT_RECORD_MAPS.has(key)) return LOCATION.recordMap;
    if (key === "activities" || key === "tasks") return LOCATION.recordArray;
  }
  if (location === LOCATION.profileMap) return LOCATION.profileRecord;
  if (location === LOCATION.recordMap) return LOCATION.record;
  if (location === LOCATION.profileRecord && key === "artifacts") {
    return LOCATION.artifactArray;
  }
  return LOCATION.normal;
};

const itemLocation = (location) =>
  location === LOCATION.recordArray || location === LOCATION.artifactArray
    ? LOCATION.record
    : LOCATION.normal;

const revisionKey = (location) => {
  if (location === LOCATION.root) return "revision";
  if (isKnownRecord(location)) return "record_revision";
  return null;
};

function logicalEqual(left, right, location) {
  if (left === MISSING || right === MISSING) return left === right;
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) && Array.isArray(right)) {
    if (areIdArrays([left, right])) {
      const leftById = idMap(left);
      const rightById = idMap(right);
      if (leftById.size !== rightById.size) return false;
      for (const [id, value] of leftById) {
        if (
          !rightById.has(id)
          || !logicalEqual(value, rightById.get(id), itemLocation(location))
        ) {
          return false;
        }
      }
      return true;
    }
    return left.length === right.length
      && left.every((value, index) =>
        logicalEqual(value, right[index], LOCATION.normal));
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const ignoredKey = revisionKey(location);
    const leftKeys = Object.keys(left).filter((key) => key !== ignoredKey).sort();
    const rightKeys = Object.keys(right).filter((key) => key !== ignoredKey).sort();
    return leftKeys.length === rightKeys.length
      && leftKeys.every(
        (key, index) =>
          key === rightKeys[index]
          && logicalEqual(left[key], right[key], childLocation(location, key)),
      );
  }

  return false;
}

const childPath = appendPointer;

const defineOwn = (object, key, value) => {
  Object.defineProperty(object, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
};

const snapshot = (value) => value === MISSING
  ? { present: false }
  : { present: true, value: clone(value) };

const chosen = (value, usedLeft = false, usedRight = false) => ({
  present: value !== MISSING,
  value: value === MISSING ? undefined : clone(value),
  usedLeft,
  usedRight,
});

const valueAt = (object, key) => Object.hasOwn(object, key) ? object[key] : MISSING;

function dedupeLogical(left, right, location) {
  if (Array.isArray(left) && Array.isArray(right) && areIdArrays([left, right])) {
    const leftById = idMap(left);
    const rightById = idMap(right);
    return [...leftById.keys()].sort().map((id) =>
      dedupeLogical(leftById.get(id), rightById.get(id), itemLocation(location)));
  }
  if (Array.isArray(left)) return clone(left);
  if (!isPlainObject(left) || !isPlainObject(right)) return clone(left);

  const output = {};
  const ignoredKey = revisionKey(location);
  for (const key of Object.keys(left).filter((key) => key !== ignoredKey).sort()) {
    defineOwn(
      output,
      key,
      dedupeLogical(left[key], right[key], childLocation(location, key)),
    );
  }
  if (location === LOCATION.root) {
    defineOwn(output, "revision", Math.max(left.revision, right.revision) + 1);
  } else if (isKnownRecord(location)) {
    defineOwn(
      output,
      "record_revision",
      Math.max(left.record_revision, right.record_revision),
    );
  }
  return output;
}

function mergeNode(
  base,
  left,
  right,
  path,
  conflicts,
  { location = LOCATION.normal } = {},
) {
  if (semanticEqual(left, right)) return chosen(left);
  if (
    revisionKey(location) !== null
    && logicalEqual(left, right, location)
    && !logicalEqual(left, base, location)
  ) {
    return {
      present: true,
      value: dedupeLogical(left, right, location),
      usedLeft: true,
      usedRight: true,
    };
  }
  if (semanticEqual(left, base)) return chosen(right, false, true);
  if (semanticEqual(right, base)) return chosen(left, true, false);

  const leftMissing = left === MISSING;
  const rightMissing = right === MISSING;
  if (leftMissing || rightMissing) {
    conflicts.push({
      path,
      kind: "delete_edit",
      base: snapshot(base),
      left: snapshot(left),
      right: snapshot(right),
    });
    return chosen(base);
  }

  const baseCanRecurse = base === MISSING || isPlainObject(base);
  if (baseCanRecurse && isPlainObject(left) && isPlainObject(right)) {
    const output = {};
    let usedLeft = false;
    let usedRight = false;
    const skippedRevision = revisionKey(location);
    const keys = new Set([
      ...(base === MISSING ? [] : Object.keys(base)),
      ...Object.keys(left),
      ...Object.keys(right),
    ]);

    if (skippedRevision !== null) keys.delete(skippedRevision);
    for (const key of [...keys].sort()) {
      const merged = mergeNode(
        base === MISSING ? MISSING : valueAt(base, key),
        valueAt(left, key),
        valueAt(right, key),
        childPath(path, key),
        conflicts,
        { location: childLocation(location, key) },
      );
      if (merged.present) defineOwn(output, key, merged.value);
      usedLeft ||= merged.usedLeft;
      usedRight ||= merged.usedRight;
    }

    if (location === LOCATION.root) {
      defineOwn(output, "revision", Math.max(left.revision, right.revision) + 1);
    } else if (isKnownRecord(location)) {
      const maximumRevision = Math.max(
        left.record_revision,
        right.record_revision,
      );
      const matchesBranch =
        logicalEqual(output, left, location) ||
        logicalEqual(output, right, location);
      defineOwn(
        output,
        "record_revision",
        matchesBranch ? maximumRevision : maximumRevision + 1,
      );
    }

    return { present: true, value: output, usedLeft, usedRight };
  }

  if (Array.isArray(left) && Array.isArray(right) && areIdArrays([base, left, right])) {
    const baseById = base === MISSING ? new Map() : idMap(base);
    const leftById = idMap(left);
    const rightById = idMap(right);
    const ids = new Set([...baseById.keys(), ...leftById.keys(), ...rightById.keys()]);
    const output = [];
    let usedLeft = false;
    let usedRight = false;

    for (const id of [...ids].sort()) {
      const merged = mergeNode(
        baseById.has(id) ? baseById.get(id) : MISSING,
        leftById.has(id) ? leftById.get(id) : MISSING,
        rightById.has(id) ? rightById.get(id) : MISSING,
        childPath(path, id),
        conflicts,
        { location: itemLocation(location) },
      );
      if (merged.present) output.push(merged.value);
      usedLeft ||= merged.usedLeft;
      usedRight ||= merged.usedRight;
    }

    return { present: true, value: output, usedLeft, usedRight };
  }

  conflicts.push({
    path,
    kind: "concurrent_edit",
    base: snapshot(base),
    left: snapshot(left),
    right: snapshot(right),
  });
  return chosen(base);
}

const diagnostic = (code, message) => ({ code, path: "/workspace/id", message });

const validateInput = (input, state) => {
  try {
    const report = validateStateObject(state);
    return report.valid
      ? []
      : report.errors.map((error) => ({ input, ...error }));
  } catch (error) {
    return [{
      input,
      code: "invalid_input",
      path: "",
      message: error instanceof Error ? error.message : "input could not be validated",
    }];
  }
};

const recordById = (state, collection, id) => {
  const records = state?.[collection];
  if (!Array.isArray(records)) return MISSING;
  return records.find((record) => record?.id === id) ?? MISSING;
};

const artifactById = (state, profileId, artifactId) => {
  const profile = state?.profiles?.[profileId];
  if (!Array.isArray(profile?.artifacts)) return MISSING;
  return profile.artifacts.find((artifact) => artifact?.id === artifactId) ?? MISSING;
};

const ownerForValidationError = (error, candidate) => {
  const segments = pointerSegments(error.path);
  const collection = segments[0];

  if (["opportunities", "pursuits", "relationships"].includes(collection)) {
    const id = segments[1];
    if (typeof id === "string") {
      return {
        kind: "map_record",
        collection,
        id,
        path: pointer(collection, id),
      };
    }
  }

  if (collection === "profiles") {
    const profileId = segments[1];
    if (typeof profileId === "string") {
      if (segments[2] === "artifacts") {
        const index = Number(segments[3]);
        const artifact = Number.isInteger(index)
          ? candidate?.profiles?.[profileId]?.artifacts?.[index]
          : undefined;
        if (typeof artifact?.id === "string") {
          return {
            kind: "artifact",
            profileId,
            id: artifact.id,
            path: pointer("profiles", profileId, "artifacts", artifact.id),
          };
        }
      }
      return {
        kind: "map_record",
        collection,
        id: profileId,
        path: pointer("profiles", profileId),
      };
    }
  }

  if (["activities", "tasks"].includes(collection)) {
    const index = Number(segments[1]);
    const record = Number.isInteger(index) ? candidate?.[collection]?.[index] : undefined;
    if (typeof record?.id === "string") {
      return {
        kind: "array_record",
        collection,
        id: record.id,
        path: pointer(collection, record.id),
      };
    }
  }

  if (collection === "workspace") {
    return { kind: "workspace", path: "/workspace" };
  }

  return { kind: "root", path: "" };
};

const ownerValue = (state, owner) => {
  if (owner.kind === "root") return state;
  if (owner.kind === "workspace") return state?.workspace ?? MISSING;
  if (owner.kind === "map_record") {
    const records = state?.[owner.collection];
    return isPlainObject(records) && Object.hasOwn(records, owner.id)
      ? records[owner.id]
      : MISSING;
  }
  if (owner.kind === "array_record") {
    return recordById(state, owner.collection, owner.id);
  }
  return artifactById(state, owner.profileId, owner.id);
};

const postMergeConflict = (owner, base, left, right) => ({
  path: owner.path,
  kind: "concurrent_edit",
  base: snapshot(ownerValue(base, owner)),
  left: snapshot(ownerValue(left, owner)),
  right: snapshot(ownerValue(right, owner)),
});

const revertOwnerToBase = (partial, base, owner) => {
  if (owner.kind === "workspace") {
    defineOwn(partial, "workspace", clone(base.workspace));
    return;
  }

  const baseValue = ownerValue(base, owner);
  if (owner.kind === "map_record") {
    if (baseValue === MISSING) {
      delete partial[owner.collection]?.[owner.id];
    } else {
      defineOwn(partial[owner.collection], owner.id, clone(baseValue));
    }
    return;
  }

  if (owner.kind === "array_record") {
    const records = idMap(partial[owner.collection]);
    if (baseValue === MISSING) records.delete(owner.id);
    else records.set(owner.id, clone(baseValue));
    partial[owner.collection] = [...records.values()].sort((first, second) =>
      first.id < second.id ? -1 : first.id > second.id ? 1 : 0);
    return;
  }

  if (owner.kind === "artifact") {
    const artifacts = idMap(partial.profiles?.[owner.profileId]?.artifacts);
    if (!artifacts) return;
    if (baseValue === MISSING) artifacts.delete(owner.id);
    else artifacts.set(owner.id, clone(baseValue));
    partial.profiles[owner.profileId].artifacts = [...artifacts.values()].sort(
      (first, second) => (first.id < second.id ? -1 : first.id > second.id ? 1 : 0),
    );
  }
};

const sortConflicts = (conflicts) => {
  conflicts.sort((first, second) => {
    if (first.path < second.path) return -1;
    if (first.path > second.path) return 1;
    if (first.kind < second.kind) return -1;
    if (first.kind > second.kind) return 1;
    return 0;
  });
};

export function mergeStateCopies(options = {}) {
  const inputOptions = isPlainObject(options) ? options : {};
  const { base, left, right } = inputOptions;
  const hasBase = base !== null && base !== undefined;
  const diagnostics = [
    ...(hasBase ? validateInput("base", base) : []),
    ...validateInput("left", left),
    ...validateInput("right", right),
  ];

  if (diagnostics.length > 0) return { kind: "invalid_input", diagnostics };

  const workspaceIds = new Set([
    ...(hasBase ? [base.workspace.id] : []),
    left.workspace.id,
    right.workspace.id,
  ]);
  if (workspaceIds.size !== 1) {
    return {
      kind: "workspace_mismatch",
      diagnostics: [
        diagnostic("workspace_mismatch", "state copies must have the same workspace id"),
      ],
    };
  }

  if (!hasBase) {
    if (semanticEqual(left, right)) return { kind: "merged", state: clone(left) };
    return {
      kind: "base_required",
      diagnostics: [
        diagnostic("base_required", "divergent state copies require an explicit base"),
      ],
    };
  }

  if (semanticEqual(left, right)) return { kind: "merged", state: clone(left) };
  if (semanticEqual(left, base)) return { kind: "merged", state: clone(right) };
  if (semanticEqual(right, base)) return { kind: "merged", state: clone(left) };

  const conflicts = [];
  const merged = mergeNode(base, left, right, "", conflicts, {
    location: LOCATION.root,
  });
  const candidateValidation = validateStateObject(merged.value);
  if (candidateValidation.valid) {
    sortConflicts(conflicts);
    return conflicts.length === 0
      ? { kind: "merged", state: merged.value }
      : { kind: "conflict", conflicts, partial: merged.value };
  }

  const ownersByPath = new Map();
  for (const error of candidateValidation.errors) {
    const owner = ownerForValidationError(error, merged.value);
    if (!ownersByPath.has(owner.path)) ownersByPath.set(owner.path, owner);
  }
  const owners = [...ownersByPath.values()];
  const existingConflictPaths = new Set(
    conflicts.map((conflict) => conflict.path),
  );
  for (const owner of owners) {
    if (!existingConflictPaths.has(owner.path)) {
      conflicts.push(postMergeConflict(owner, base, left, right));
    }
  }
  sortConflicts(conflicts);

  let partial = clone(merged.value);
  if (owners.some(({ kind }) => kind === "root")) {
    partial = clone(base);
  } else {
    for (const owner of owners) revertOwnerToBase(partial, base, owner);
    if (!validateStateObject(partial).valid) partial = clone(base);
  }

  return { kind: "conflict", conflicts, partial };
}
