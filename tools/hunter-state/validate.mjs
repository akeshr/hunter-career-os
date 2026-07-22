import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { appendPointer, pointer } from "./pointer.mjs";

const schema = JSON.parse(
  readFileSync(
    new URL(
      "../../plugins/hunter/skills/hunter/schemas/hunter-state.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const semanticError = (code, path, message) => ({ code, path, message });

const objectEntries = (value) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.entries(value)
    : [];

const arrayItems = (value) => (Array.isArray(value) ? value : []);

const referenceExists = (errors, value, records, path, description) => {
  if (typeof value === "string" && !records.has(value)) {
    errors.push(
      semanticError(
        "dangling_reference",
        path,
        `${description} does not resolve: ${value}`,
      ),
    );
  }
};

const referenceMismatch = (errors, path, message) => {
  errors.push(semanticError("dangling_reference", path, message));
};

function validateSafeIntegers(value, path = "") {
  if (typeof value === "number") {
    return Number.isInteger(value) && !Number.isSafeInteger(value)
      ? [
          semanticError(
            "unsafe_integer",
            path,
            "Integers must be safe integers",
          ),
        ]
      : [];
  }
  if (value === null || typeof value !== "object") return [];

  const errors = [];
  for (const [key, nestedValue] of Object.entries(value)) {
    errors.push(
      ...validateSafeIntegers(nestedValue, appendPointer(path, key)),
    );
  }
  return errors;
}

function validateSemantics(state) {
  const errors = [];
  const collections = ["profiles", "opportunities", "pursuits", "relationships"];

  for (const collection of collections) {
    for (const [key, record] of objectEntries(state?.[collection])) {
      if (record?.id !== key) {
        errors.push(
          semanticError(
            "map_key_id_mismatch",
            pointer(collection, key, "id"),
            `${collection} map key must match the embedded id`,
          ),
        );
      }
    }
  }

  const profiles = new Map(objectEntries(state?.profiles));
  const opportunities = new Map(objectEntries(state?.opportunities));
  const pursuits = new Map(objectEntries(state?.pursuits));
  const relationships = new Map(objectEntries(state?.relationships));
  const activities = new Map(
    arrayItems(state?.activities)
      .filter((activity) => typeof activity?.id === "string")
      .map((activity) => [activity.id, activity]),
  );

  const checkUniqueIds = (records, path) => {
    const ids = new Set();
    for (const [index, record] of arrayItems(records).entries()) {
      if (typeof record?.id !== "string") continue;
      if (ids.has(record.id)) {
        errors.push(
          semanticError(
            "duplicate_id",
            appendPointer(appendPointer(path, index), "id"),
            `duplicate id: ${record.id}`,
          ),
        );
      }
      ids.add(record.id);
    }
  };

  checkUniqueIds(state?.activities, "/activities");
  checkUniqueIds(state?.tasks, "/tasks");

  if (state?.workspace?.default_profile_id !== null) {
    referenceExists(
      errors,
      state?.workspace?.default_profile_id,
      profiles,
      pointer("workspace", "default_profile_id"),
      "default profile",
    );
  }

  for (const [profileId, profile] of objectEntries(state?.profiles)) {
    const profilePath = pointer("profiles", profileId);
    const artifactsPath = appendPointer(profilePath, "artifacts");
    checkUniqueIds(profile?.artifacts, artifactsPath);
    for (const [index, artifact] of arrayItems(profile?.artifacts).entries()) {
      const artifactPath = appendPointer(artifactsPath, index);
      const artifactProfilePath = appendPointer(artifactPath, "profile_id");
      referenceExists(
        errors,
        artifact?.profile_id,
        profiles,
        artifactProfilePath,
        "artifact profile",
      );
      const artifactProfileExists =
        typeof artifact?.profile_id === "string" &&
        profiles.has(artifact.profile_id);
      if (artifactProfileExists && artifact.profile_id !== profileId) {
        errors.push(
          semanticError(
            "dangling_reference",
            artifactProfilePath,
            "artifact profile must be its owning profile",
          ),
        );
      }
      referenceExists(
        errors,
        artifact?.pursuit_id,
        pursuits,
        appendPointer(artifactPath, "pursuit_id"),
        "artifact pursuit",
      );
      referenceExists(
        errors,
        artifact?.opportunity_id,
        opportunities,
        appendPointer(artifactPath, "opportunity_id"),
        "artifact opportunity",
      );

      const artifactPursuit = pursuits.get(artifact?.pursuit_id);
      const artifactOpportunity = opportunities.get(artifact?.opportunity_id);
      if (
        artifactProfileExists &&
        artifactPursuit &&
        artifactPursuit.profile_id !== artifact.profile_id
      ) {
        referenceMismatch(
          errors,
          appendPointer(artifactPath, "pursuit_id"),
          "artifact pursuit must share the artifact profile",
        );
      }
      if (
        artifactProfileExists &&
        artifactOpportunity &&
        Array.isArray(artifactOpportunity.profile_ids) &&
        !artifactOpportunity.profile_ids.includes(artifact.profile_id)
      ) {
        referenceMismatch(
          errors,
          appendPointer(artifactPath, "opportunity_id"),
          "artifact opportunity must include the artifact profile",
        );
      }
      if (
        artifactPursuit &&
        artifactOpportunity &&
        artifactPursuit.opportunity_id !== artifact.opportunity_id
      ) {
        referenceMismatch(
          errors,
          appendPointer(artifactPath, "opportunity_id"),
          "artifact pursuit and opportunity must agree",
        );
      }
    }
  }

  for (const [opportunityId, opportunity] of objectEntries(state?.opportunities)) {
    const profileIdsPath = pointer(
      "opportunities",
      opportunityId,
      "profile_ids",
    );
    for (const [index, profileId] of arrayItems(opportunity?.profile_ids).entries()) {
      referenceExists(
        errors,
        profileId,
        profiles,
        appendPointer(profileIdsPath, index),
        "opportunity profile",
      );
    }
  }

  for (const [pursuitId, pursuit] of objectEntries(state?.pursuits)) {
    const pursuitPath = pointer("pursuits", pursuitId);
    referenceExists(
      errors,
      pursuit?.profile_id,
      profiles,
      appendPointer(pursuitPath, "profile_id"),
      "pursuit profile",
    );
    referenceExists(
      errors,
      pursuit?.opportunity_id,
      opportunities,
      appendPointer(pursuitPath, "opportunity_id"),
      "pursuit opportunity",
    );

    const pursuitOpportunity = opportunities.get(pursuit?.opportunity_id);
    if (
      typeof pursuit?.profile_id === "string" &&
      profiles.has(pursuit.profile_id) &&
      pursuitOpportunity &&
      Array.isArray(pursuitOpportunity.profile_ids) &&
      !pursuitOpportunity.profile_ids.includes(pursuit.profile_id)
    ) {
      referenceMismatch(
        errors,
        appendPointer(pursuitPath, "opportunity_id"),
        "pursuit opportunity must include the pursuit profile",
      );
    }

    for (const [index, eventId] of arrayItems(pursuit?.event_ids).entries()) {
      const path = appendPointer(
        appendPointer(pursuitPath, "event_ids"),
        index,
      );
      const event = activities.get(eventId);
      if (typeof eventId === "string" && !event) {
        referenceMismatch(
          errors,
          path,
          `pursuit event does not resolve: ${eventId}`,
        );
        continue;
      }
      if (!event) continue;
      if (event.pursuit_id !== pursuitId) {
        referenceMismatch(
          errors,
          path,
          "pursuit event must be owned by its pursuit",
        );
      }
      if (
        typeof event.profile_id === "string" &&
        event.profile_id !== pursuit?.profile_id
      ) {
        referenceMismatch(
          errors,
          path,
          "pursuit event profile must match the pursuit profile",
        );
      }
      if (
        typeof event.opportunity_id === "string" &&
        event.opportunity_id !== pursuit?.opportunity_id
      ) {
        referenceMismatch(
          errors,
          path,
          "pursuit event opportunity must match the pursuit opportunity",
        );
      }
    }
  }

  for (const [relationshipId, relationship] of objectEntries(state?.relationships)) {
    const profileIdsPath = pointer(
      "relationships",
      relationshipId,
      "profile_ids",
    );
    for (const [index, profileId] of arrayItems(relationship?.profile_ids).entries()) {
      referenceExists(
        errors,
        profileId,
        profiles,
        appendPointer(profileIdsPath, index),
        "relationship profile",
      );
    }
  }

  const resolvedProfiles = (profileIds) =>
    new Set(
      arrayItems(profileIds).filter(
        (profileId) =>
          typeof profileId === "string" && profiles.has(profileId),
      ),
    );

  const intersectProfiles = (left, right) =>
    new Set([...left].filter((profileId) => right.has(profileId)));

  const effectiveProfileContext = (record, includesActivity = false) => {
    let effective = null;
    for (const { profileIds } of profileContextSources(
      record,
      includesActivity,
    )) {
      if (profileIds.size === 0) continue;
      if (effective === null) {
        effective = new Set(profileIds);
        continue;
      }
      const shared = intersectProfiles(effective, profileIds);
      if (shared.size > 0) effective = shared;
    }
    return effective ?? new Set();
  };

  const profileContextSources = (record, includesActivity) => {
    const sources = [];
    if (
      typeof record?.profile_id === "string" &&
      profiles.has(record.profile_id)
    ) {
      sources.push({
        field: "profile_id",
        kind: "profile",
        profileIds: new Set([record.profile_id]),
      });
    }

    const pursuit = pursuits.get(record?.pursuit_id);
    if (
      pursuit &&
      typeof pursuit.profile_id === "string" &&
      profiles.has(pursuit.profile_id)
    ) {
      sources.push({
        field: "pursuit_id",
        kind: "pursuit",
        profileIds: new Set([pursuit.profile_id]),
      });
    }

    if (includesActivity) {
      const activity = activities.get(record?.activity_id);
      if (activity) {
        sources.push({
          field: "activity_id",
          kind: "activity",
          profileIds: effectiveProfileContext(activity),
        });
      }
    }

    const opportunity = opportunities.get(record?.opportunity_id);
    if (opportunity) {
      sources.push({
        field: "opportunity_id",
        kind: "opportunity",
        profileIds: resolvedProfiles(opportunity.profile_ids),
      });
    }

    const relationship = relationships.get(record?.relationship_id);
    if (relationship) {
      sources.push({
        field: "relationship_id",
        kind: "relationship",
        profileIds: resolvedProfiles(relationship.profile_ids),
      });
    }
    return sources;
  };

  const contextMismatchMessage = (kind, hasExplicitProfile) => {
    const profileDescription = hasExplicitProfile
      ? "record profile"
      : "record profile context";
    if (kind === "activity") {
      return "linked activity must match the record profile context";
    }
    if (kind === "opportunity") {
      return `linked opportunity must include the ${profileDescription}`;
    }
    if (kind === "relationship") {
      return `linked relationship must include the ${profileDescription}`;
    }
    return `linked pursuit must match the ${profileDescription}`;
  };

  const validateProfileContext = (record, recordPath, includesActivity) => {
    const hasExplicitProfile =
      typeof record?.profile_id === "string" && profiles.has(record.profile_id);
    let effective = null;
    for (const source of profileContextSources(record, includesActivity)) {
      if (source.profileIds.size === 0) {
        if (
          effective !== null &&
          ["opportunity", "relationship"].includes(source.kind)
        ) {
          referenceMismatch(
            errors,
            appendPointer(recordPath, source.field),
            contextMismatchMessage(source.kind, hasExplicitProfile),
          );
        }
        continue;
      }
      if (effective === null) {
        effective = new Set(source.profileIds);
        continue;
      }
      const shared = intersectProfiles(effective, source.profileIds);
      if (shared.size === 0) {
        referenceMismatch(
          errors,
          appendPointer(recordPath, source.field),
          contextMismatchMessage(source.kind, hasExplicitProfile),
        );
      } else {
        effective = shared;
      }
    }
  };

  const checkRecordReferences = (records, path, includesActivity) => {
    for (const [index, record] of arrayItems(records).entries()) {
      const recordPath = appendPointer(path, index);
      referenceExists(
        errors,
        record?.profile_id,
        profiles,
        appendPointer(recordPath, "profile_id"),
        "profile",
      );
      referenceExists(
        errors,
        record?.opportunity_id,
        opportunities,
        appendPointer(recordPath, "opportunity_id"),
        "opportunity",
      );
      referenceExists(
        errors,
        record?.pursuit_id,
        pursuits,
        appendPointer(recordPath, "pursuit_id"),
        "pursuit",
      );
      referenceExists(
        errors,
        record?.relationship_id,
        relationships,
        appendPointer(recordPath, "relationship_id"),
        "relationship",
      );
      if (includesActivity) {
        referenceExists(
          errors,
          record?.activity_id,
          activities,
          appendPointer(recordPath, "activity_id"),
          "activity",
        );
      }

      const opportunity = opportunities.get(record?.opportunity_id);
      const pursuit = pursuits.get(record?.pursuit_id);
      validateProfileContext(record, recordPath, includesActivity);
      if (
        pursuit &&
        opportunity &&
        pursuit.opportunity_id !== record.opportunity_id
      ) {
        referenceMismatch(
          errors,
          appendPointer(recordPath, "opportunity_id"),
          "linked pursuit and opportunity must agree",
        );
      }
    }
  };

  checkRecordReferences(state?.activities, pointer("activities"));
  checkRecordReferences(state?.tasks, pointer("tasks"), true);

  return errors;
}

export function validateStateObject(state) {
  const schemaValid = validate(state);
  const schemaErrors = (validate.errors ?? []).map((error) => ({
    code: "schema",
    path: error.instancePath,
    message: error.message,
  }));
  const safeIntegerErrors = validateSafeIntegers(state);
  const semanticErrors = validateSemantics(state);

  return {
    valid:
      schemaValid &&
      safeIntegerErrors.length === 0 &&
      semanticErrors.length === 0,
    errors: [...schemaErrors, ...safeIntegerErrors, ...semanticErrors],
    warnings: [],
  };
}
