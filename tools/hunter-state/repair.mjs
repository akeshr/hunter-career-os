import { parseStateYaml, serializeState } from "./io.mjs";
import { validateStateObject } from "./validate.mjs";
import { appendPointer, pointer } from "./pointer.mjs";

const SUPPORTED_VERSION = "0.1";
const hasOwn = (value, key) => Object.hasOwn(value, key);
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const change = (code, path, message) => ({ code, path, message });

const revisionHistoryExists = (record) => {
  for (const key of [
    "history",
    "revision_history",
    "record_history",
    "revisions",
  ]) {
    if (!hasOwn(record, key)) continue;
    const history = record[key];
    if (Array.isArray(history) && history.length > 0) return true;
    if (isObject(history) && Object.keys(history).length > 0) return true;
    if (history !== null && history !== undefined && !isObject(history)) {
      return true;
    }
  }
  return false;
};

function addEmptyContainer(target, key, emptyValue, path, changes) {
  if (!isObject(target)) return;
  if (hasOwn(target, key) && target[key] !== null) return;

  target[key] = structuredClone(emptyValue);
  changes.push(
    change(
      "empty_container",
      path,
      `restored ${path} with its documented empty value`,
    ),
  );
}

function addRecordRevision(record, path, changes) {
  if (
    !isObject(record) ||
    hasOwn(record, "record_revision") ||
    revisionHistoryExists(record)
  ) {
    return;
  }

  record.record_revision = 1;
  changes.push(
    change(
      "record_revision",
      appendPointer(path, "record_revision"),
      "restored missing record_revision as 1",
    ),
  );
}

function repairMapRecords(state, collection, repairRecord, changes) {
  const records = state[collection];
  if (!isObject(records)) return;

  for (const [key, record] of Object.entries(records)) {
    if (!isObject(record)) continue;
    const path = pointer(collection, key);
    if (!hasOwn(record, "id")) {
      record.id = key;
      changes.push(
        change(
          "map_record_id",
          appendPointer(path, "id"),
          `restored missing embedded id from map key: ${key}`,
        ),
      );
    }
    addRecordRevision(record, path, changes);
    repairRecord?.(record, path, changes);
  }
}

function repairArrayRecords(records, path, repairRecord, changes) {
  if (!Array.isArray(records)) return;
  for (const [index, record] of records.entries()) {
    if (!isObject(record)) continue;
    const recordPath = appendPointer(path, index);
    addRecordRevision(record, recordPath, changes);
    repairRecord?.(record, recordPath, changes);
  }
}

function applySafeRepairs(state) {
  const changes = [];

  if (!isObject(state)) return changes;

  for (const [collection, emptyValue] of [
    ["profiles", {}],
    ["opportunities", {}],
    ["pursuits", {}],
    ["relationships", {}],
    ["activities", []],
    ["tasks", []],
  ]) {
    if (!hasOwn(state, collection)) {
      state[collection] = structuredClone(emptyValue);
      changes.push(
        change(
          "root_collection",
          pointer(collection),
          `restored missing root collection: ${collection}`,
        ),
      );
    }
  }

  addEmptyContainer(
    state.workspace,
    "preferences",
    {},
    "/workspace/preferences",
    changes,
  );

  repairMapRecords(
    state,
    "profiles",
    (profile, path) => {
      addEmptyContainer(
        profile,
        "data",
        {},
        appendPointer(path, "data"),
        changes,
      );
      addEmptyContainer(
        profile,
        "artifacts",
        [],
        appendPointer(path, "artifacts"),
        changes,
      );
      repairArrayRecords(
        profile.artifacts,
        appendPointer(path, "artifacts"),
        undefined,
        changes,
      );
    },
    changes,
  );

  repairMapRecords(
    state,
    "opportunities",
    (opportunity, path) => {
      addEmptyContainer(
        opportunity,
        "profile_ids",
        [],
        appendPointer(path, "profile_ids"),
        changes,
      );
      addEmptyContainer(
        opportunity,
        "sources",
        [],
        appendPointer(path, "sources"),
        changes,
      );
    },
    changes,
  );

  repairMapRecords(
    state,
    "pursuits",
    (pursuit, path) => {
      addEmptyContainer(
        pursuit,
        "event_ids",
        [],
        appendPointer(path, "event_ids"),
        changes,
      );
    },
    changes,
  );

  repairMapRecords(
    state,
    "relationships",
    (relationship, path) => {
      addEmptyContainer(
        relationship,
        "profile_ids",
        [],
        appendPointer(path, "profile_ids"),
        changes,
      );
    },
    changes,
  );

  const repairOptionalDetails = (record, path) => {
    if (hasOwn(record, "details")) {
      addEmptyContainer(
        record,
        "details",
        {},
        appendPointer(path, "details"),
        changes,
      );
    }
  };
  repairArrayRecords(
    state.activities,
    "/activities",
    repairOptionalDetails,
    changes,
  );
  repairArrayRecords(state.tasks, "/tasks", repairOptionalDetails, changes);

  return changes;
}

export function repairStateYaml(text) {
  const parsed = parseStateYaml(text);
  if (!parsed.ok) {
    return {
      kind: "unrepairable",
      original: text,
      diagnostics: parsed.diagnostics,
    };
  }

  if (
    typeof parsed.state?.schema_version === "string" &&
    parsed.state.schema_version !== SUPPORTED_VERSION
  ) {
    return {
      kind: "unsupported_version",
      original: text,
      diagnostics: [
        {
          code: "unsupported_version",
          path: "/schema_version",
          message: `unsupported schema version: ${parsed.state.schema_version}`,
        },
      ],
    };
  }

  const initialValidation = validateStateObject(parsed.state);
  if (initialValidation.valid) {
    return {
      kind: "valid",
      state: parsed.state,
      yaml: serializeState(parsed.state),
    };
  }

  const state = structuredClone(parsed.state);
  const changes = applySafeRepairs(state);
  const repairedValidation = validateStateObject(state);
  if (!repairedValidation.valid) {
    return {
      kind: "unrepairable",
      original: text,
      diagnostics: repairedValidation.errors,
    };
  }

  return {
    kind: "repaired",
    state,
    yaml: serializeState(state),
    changes,
    diagnostics: repairedValidation.warnings,
  };
}
