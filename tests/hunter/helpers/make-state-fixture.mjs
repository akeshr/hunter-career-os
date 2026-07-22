const collectionNames = [
  "profiles",
  "opportunities",
  "pursuits",
  "relationships",
  "activities",
  "tasks",
];

const pad = (index) => String(index + 1).padStart(3, "0");

const id = (kind, index) => `${kind}-${pad(index)}`;

const timestamp = (index) => {
  const year = 2026 + Math.floor(index / 336);
  const month = String(1 + (Math.floor(index / 28) % 12)).padStart(2, "0");
  const day = String(1 + (index % 28)).padStart(2, "0");
  const hour = String(index % 24).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:00:00Z`;
};

const countsFor = (counts) => {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new TypeError("counts must be an object");
  }

  return Object.fromEntries(
    collectionNames.map((name) => {
      const count = counts[name] ?? 0;
      if (!Number.isInteger(count) || count < 0) {
        throw new RangeError(`${name} must be a non-negative integer`);
      }
      return [name, count];
    }),
  );
};

const indexedId = (kind, count, index) =>
  count === 0 ? undefined : id(kind, index % count);

/**
 * Create a deterministic, generic Hunter state fixture from collection counts.
 *
 * Omitted categories are empty. Pursuits require at least one profile and one
 * opportunity because the state contract requires both references; unsupported
 * zero-parent requests fail explicitly rather than changing requested counts.
 */
export function makeStateFixture(counts) {
  const sizes = countsFor(counts);
  if (sizes.pursuits > 0 && (sizes.profiles === 0 || sizes.opportunities === 0)) {
    throw new RangeError("pursuits require at least one profile and opportunity");
  }

  const profiles = Object.fromEntries(
    Array.from({ length: sizes.profiles }, (_, index) => {
      const profileId = id("profile", index);
      return [
        profileId,
        {
          id: profileId,
          record_revision: 1,
          name: `Example Profile ${pad(index)}`,
          data: { label: `Example Profile Data ${pad(index)}` },
          artifacts: [],
        },
      ];
    }),
  );

  const opportunities = Object.fromEntries(
    Array.from({ length: sizes.opportunities }, (_, index) => {
      const opportunityId = id("opportunity", index);
      const profileId = indexedId("profile", sizes.profiles, index);
      return [
        opportunityId,
        {
          id: opportunityId,
          record_revision: 1,
          kind: "role",
          organization: `Example Organization ${pad(index)}`,
          profile_ids: profileId ? [profileId] : [],
          sources: [],
        },
      ];
    }),
  );

  const pursuits = Object.fromEntries(
    Array.from({ length: sizes.pursuits }, (_, index) => {
      const pursuitId = id("pursuit", index);
      const opportunityId = indexedId(
        "opportunity",
        sizes.opportunities,
        index,
      );
      const profileId = opportunities[opportunityId].profile_ids[0];
      return [
        pursuitId,
        {
          id: pursuitId,
          record_revision: 1,
          profile_id: profileId,
          opportunity_id: opportunityId,
          event_ids:
            index >= sizes.activities
              ? []
              : [id("activity", index)],
        },
      ];
    }),
  );

  const relationships = Object.fromEntries(
    Array.from({ length: sizes.relationships }, (_, index) => {
      const relationshipId = id("relationship", index);
      const profileId = indexedId("profile", sizes.profiles, index);
      return [
        relationshipId,
        {
          id: relationshipId,
          record_revision: 1,
          kind: "contact",
          name: `Example Contact ${pad(index)}`,
          profile_ids: profileId ? [profileId] : [],
        },
      ];
    }),
  );

  const relationshipForProfile = new Map();
  for (const relationship of Object.values(relationships)) {
    for (const profileId of relationship.profile_ids) {
      if (!relationshipForProfile.has(profileId)) {
        relationshipForProfile.set(profileId, relationship.id);
      }
    }
  }

  const linksFor = (index) => {
    const pursuitId = indexedId("pursuit", sizes.pursuits, index);
    const pursuit = pursuits[pursuitId];
    const opportunityId =
      pursuit?.opportunity_id ??
      indexedId("opportunity", sizes.opportunities, index);
    const opportunity = opportunities[opportunityId];
    const profileId =
      pursuit?.profile_id ??
      opportunity?.profile_ids[0] ??
      indexedId("profile", sizes.profiles, index);
    return {
      profileId,
      opportunityId,
      pursuitId,
      relationshipId: relationshipForProfile.get(profileId),
    };
  };

  const activities = Array.from({ length: sizes.activities }, (_, index) => {
    const { profileId, opportunityId, pursuitId, relationshipId } = linksFor(index);
    return {
      id: id("activity", index),
      record_revision: 1,
      type: "note",
      occurred_at: timestamp(index),
      ...(profileId && { profile_id: profileId }),
      ...(opportunityId && { opportunity_id: opportunityId }),
      ...(pursuitId && { pursuit_id: pursuitId }),
      ...(relationshipId && { relationship_id: relationshipId }),
    };
  });

  const activityForProfile = new Map();
  for (const activity of activities) {
    if (
      typeof activity.profile_id === "string" &&
      !activityForProfile.has(activity.profile_id)
    ) {
      activityForProfile.set(activity.profile_id, activity.id);
    }
  }

  const tasks = Array.from({ length: sizes.tasks }, (_, index) => {
    const { profileId, opportunityId, pursuitId, relationshipId } = linksFor(index);
    const activityId = activityForProfile.get(profileId);
    return {
      id: id("task", index),
      record_revision: 1,
      title: `Example Task ${pad(index)}`,
      status: "open",
      ...(profileId && { profile_id: profileId }),
      ...(opportunityId && { opportunity_id: opportunityId }),
      ...(pursuitId && { pursuit_id: pursuitId }),
      ...(relationshipId && { relationship_id: relationshipId }),
      ...(activityId && { activity_id: activityId }),
    };
  });

  return {
    schema_version: "0.1",
    revision: 1,
    workspace: {
      id: "workspace-example",
      default_profile_id: indexedId("profile", sizes.profiles, 0) ?? null,
      preferences: {},
    },
    profiles,
    opportunities,
    pursuits,
    relationships,
    activities,
    tasks,
  };
}
