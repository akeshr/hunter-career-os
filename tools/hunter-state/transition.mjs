import { isDeepStrictEqual } from "node:util";
import { validateStateObject } from "./validate.mjs";
import { pointer } from "./pointer.mjs";

const objectEntries = (value) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.entries(value)
    : [];

const arrayItems = (value) => (Array.isArray(value) ? value : []);

const transitionError = (code, path, message) => ({ code, path, message });

const withoutRevision = (record) => {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return record;
  }

  const { record_revision, ...content } = record;
  if (Array.isArray(content.artifacts)) {
    content.artifacts = Object.fromEntries(
      content.artifacts
        .filter((artifact) => typeof artifact?.id === "string")
        .map((artifact) => [artifact.id, withoutRevision(artifact)]),
    );
  }
  return content;
};

const mapRecords = (state, collection) =>
  new Map(objectEntries(state?.[collection]));

const arrayRecords = (records) =>
  new Map(
    arrayItems(records)
      .filter((record) => typeof record?.id === "string")
      .map((record) => [record.id, record]),
  );

const artifactRecords = (state) => {
  const profiles = new Map();
  for (const [profileId, profile] of objectEntries(state?.profiles)) {
    const artifacts = new Map();
    for (const artifact of arrayItems(profile?.artifacts)) {
      if (typeof artifact?.id === "string") {
        artifacts.set(artifact.id, artifact);
      }
    }
    profiles.set(profileId, artifacts);
  }
  return profiles;
};

const recordCollections = (state) => [
  ["profiles", mapRecords(state, "profiles")],
  ["opportunities", mapRecords(state, "opportunities")],
  ["pursuits", mapRecords(state, "pursuits")],
  ["relationships", mapRecords(state, "relationships")],
  ["activities", arrayRecords(state?.activities)],
  ["tasks", arrayRecords(state?.tasks)],
];

const recordPath = (collection, id) =>
  pointer(collection, id, "record_revision");

const artifactPath = (profileId, artifactId) =>
  pointer(
    "profiles",
    profileId,
    "artifacts",
    artifactId,
    "record_revision",
  );

const stableIdPath = (collection, id) => pointer(collection, id, "id");

const validateNewRecords = (after) => {
  const errors = [];
  for (const [collection, records] of recordCollections(after)) {
    for (const [id, record] of records) {
      if (record?.record_revision !== 1) {
        errors.push(
          transitionError(
            "record_revision",
            recordPath(collection, id),
            "new records must start at record revision 1",
          ),
        );
      }
    }
  }
  for (const [profileId, artifacts] of artifactRecords(after)) {
    for (const [artifactId, artifact] of artifacts) {
      if (artifact?.record_revision !== 1) {
        errors.push(
          transitionError(
            "record_revision",
            artifactPath(profileId, artifactId),
            "new records must start at record revision 1",
          ),
        );
      }
    }
  }
  return errors;
};

const validateExistingRecords = (before, after) => {
  const errors = [];
  const beforeCollections = new Map(recordCollections(before));

  for (const [collection, afterRecords] of recordCollections(after)) {
    const beforeRecords = beforeCollections.get(collection);
    for (const [id, afterRecord] of afterRecords) {
      const beforeRecord = beforeRecords.get(id);
      if (!beforeRecord) {
        if (afterRecord?.record_revision !== 1) {
          errors.push(
            transitionError(
              "record_revision",
              recordPath(collection, id),
              "new records must start at record revision 1",
            ),
          );
        }
        continue;
      }

      if (
        ["profiles", "opportunities", "pursuits", "relationships"].includes(
          collection,
        ) &&
        beforeRecord.id !== afterRecord?.id
      ) {
        errors.push(
          transitionError(
            "stable_id",
            stableIdPath(collection, id),
            "stable IDs cannot change",
          ),
        );
      }

      const changed = !isDeepStrictEqual(
        withoutRevision(beforeRecord),
        withoutRevision(afterRecord),
      );
      const expectedRevision = changed
        ? beforeRecord?.record_revision + 1
        : beforeRecord?.record_revision;
      if (afterRecord?.record_revision !== expectedRevision) {
        errors.push(
          transitionError(
            "record_revision",
            recordPath(collection, id),
            changed
              ? "changed records must increment record revision exactly once"
              : "unchanged records must retain their record revision",
          ),
        );
      }
    }
  }

  return errors;
};

const validateExistingArtifacts = (before, after) => {
  const errors = [];
  const beforeProfiles = artifactRecords(before);

  for (const [profileId, afterArtifacts] of artifactRecords(after)) {
    const beforeArtifacts = beforeProfiles.get(profileId);
    for (const [artifactId, afterArtifact] of afterArtifacts) {
      const beforeArtifact = beforeArtifacts?.get(artifactId);
      const path = artifactPath(profileId, artifactId);
      if (!beforeArtifact) {
        if (afterArtifact?.record_revision !== 1) {
          errors.push(
            transitionError(
              "record_revision",
              path,
              "new records must start at record revision 1",
            ),
          );
        }
        continue;
      }

      const changed = !isDeepStrictEqual(
        withoutRevision(beforeArtifact),
        withoutRevision(afterArtifact),
      );
      const expectedRevision = changed
        ? beforeArtifact.record_revision + 1
        : beforeArtifact.record_revision;
      if (afterArtifact?.record_revision !== expectedRevision) {
        errors.push(
          transitionError(
            "record_revision",
            path,
            changed
              ? "changed records must increment record revision exactly once"
              : "unchanged records must retain their record revision",
          ),
        );
      }
    }
  }

  return errors;
};

export function validateStateTransition(before, after) {
  const afterValidation = validateStateObject(after);
  const errors = [...afterValidation.errors];

  if (before === null) {
    if (after?.revision !== 1) {
      errors.push(
        transitionError(
          "root_revision",
          "/revision",
          "new states must start at root revision 1",
        ),
      );
    }
    errors.push(...validateNewRecords(after));
  } else {
    if (after?.revision !== before?.revision + 1) {
      errors.push(
        transitionError(
          "root_revision",
          "/revision",
          "saved mutations must increment root revision exactly once",
        ),
      );
    }
    if (before?.workspace?.id !== after?.workspace?.id) {
      errors.push(
        transitionError(
          "stable_id",
          "/workspace/id",
          "stable IDs cannot change",
        ),
      );
    }
    errors.push(...validateExistingRecords(before, after));
    errors.push(...validateExistingArtifacts(before, after));
  }

  return {
    valid: afterValidation.valid && errors.length === 0,
    errors,
    warnings: afterValidation.warnings,
  };
}
