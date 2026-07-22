import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const loadInvalid = async (name) => {
  const { parseStateYaml } = await import("../../../tools/hunter-state/io.mjs");
  const text = await readFile(
    new URL("../fixtures/state/invalid/" + name, import.meta.url),
    "utf8",
  );
  const parsed = parseStateYaml(text, name);
  assert.equal(parsed.ok, true);
  return parsed.state;
};

const loadValid = async (name) => {
  const { parseStateYaml } = await import("../../../tools/hunter-state/io.mjs");
  const text = await readFile(
    new URL("../fixtures/state/valid/" + name, import.meta.url),
    "utf8",
  );
  const parsed = parseStateYaml(text, name);
  assert.equal(parsed.ok, true);
  return parsed.state;
};

const artifact = (id) => ({
  id,
  record_revision: 1,
  profile_id: "profile-alpha",
  type: "resume",
  filename: "example-resume.md",
  created_at: "2026-07-21T10:00:00Z",
  availability: "available",
});

const validState = () => ({
  schema_version: "0.1",
  revision: 1,
  workspace: {
    id: "workspace-example",
    default_profile_id: "profile-alpha",
    preferences: {},
  },
  profiles: {
    "profile-alpha": {
      id: "profile-alpha",
      record_revision: 1,
      name: "Alpha Profile",
      data: {},
      artifacts: [],
    },
    "profile-beta": {
      id: "profile-beta",
      record_revision: 1,
      name: "Beta Profile",
      data: {},
      artifacts: [],
    },
  },
  opportunities: {
    "opportunity-alpha": {
      id: "opportunity-alpha",
      record_revision: 1,
      kind: "role",
      profile_ids: ["profile-alpha"],
      sources: [],
    },
  },
  pursuits: {
    "pursuit-alpha": {
      id: "pursuit-alpha",
      record_revision: 1,
      profile_id: "profile-alpha",
      opportunity_id: "opportunity-alpha",
      event_ids: ["activity-alpha"],
    },
  },
  relationships: {
    "relationship-alpha": {
      id: "relationship-alpha",
      record_revision: 1,
      kind: "contact",
      name: "Example Contact",
      profile_ids: ["profile-alpha"],
    },
  },
  activities: [
    {
      id: "activity-alpha",
      record_revision: 1,
      type: "note",
      occurred_at: "2026-07-21T10:00:00Z",
      profile_id: "profile-alpha",
      opportunity_id: "opportunity-alpha",
      pursuit_id: "pursuit-alpha",
      relationship_id: "relationship-alpha",
    },
  ],
  tasks: [
    {
      id: "task-alpha",
      record_revision: 1,
      title: "Follow up",
      status: "open",
      profile_id: "profile-alpha",
      opportunity_id: "opportunity-alpha",
      pursuit_id: "pursuit-alpha",
      relationship_id: "relationship-alpha",
      activity_id: "activity-alpha",
    },
  ],
});

const validateState = async (state) => {
  const { validateStateObject } =
    await import("../../../tools/hunter-state/validate.mjs");
  return validateStateObject(state);
};

const assertDanglingReference = async (state, path) => {
  const result = await validateState(state);
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.code === "schema"), false);
  assert.ok(
    result.errors.some(
      (error) => error.code === "dangling_reference" && error.path === path,
    ),
  );
};

const assertReferenceDiagnostic = async (state, path, message) => {
  const result = await validateState(state);
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.code === "schema"), false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === "dangling_reference" &&
        error.path === path &&
        error.message === message,
    ),
  );
};

for (const [file, code, paths] of [
  ["key-id-mismatch.yaml", "map_key_id_mismatch", ["/profiles/profile-alpha/id"]],
  ["dangling-pursuit.yaml", "dangling_reference", ["/pursuits/pursuit-example/profile_id"]],
  ["duplicate-array-id.yaml", "duplicate_id", ["/activities/1/id"]],
]) {
  test(file + " reports " + code, async () => {
    const { validateStateObject } =
      await import("../../../tools/hunter-state/validate.mjs");
    const result = validateStateObject(await loadInvalid(file));
    assert.equal(result.valid, false);
    assert.deepEqual(
      result.errors
        .filter((error) => error.code === code)
        .map((error) => error.path),
      paths,
    );
  });
}

test("the valid two-profile fixture resolves the selected default profile", async () => {
  const result = await validateState(await loadValid("two-profiles.yaml"));
  assert.deepEqual(result, { valid: true, errors: [], warnings: [] });
});

test("a null default profile remains valid", async () => {
  const state = validState();
  state.workspace.default_profile_id = null;
  assert.deepEqual(await validateState(state), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("direct validation rejects unsafe integers in unknown semantic fields", async () => {
  for (const value of [
    Number.MAX_SAFE_INTEGER + 1,
    Number.MIN_SAFE_INTEGER - 1,
  ]) {
    const state = validState();
    state.extensions = { future: { count: value } };

    const result = await validateState(state);

    assert.equal(result.valid, false);
    assert.deepEqual(
      result.errors.filter(({ code }) => code === "unsafe_integer"),
      [
        {
          code: "unsafe_integer",
          path: "/extensions/future/count",
          message: "Integers must be safe integers",
        },
      ],
    );
  }
});

test("a missing default profile is dangling", async () => {
  const state = validState();
  state.workspace.default_profile_id = "profile-missing";
  await assertDanglingReference(state, "/workspace/default_profile_id");
});

for (const [collection, key] of [
  ["profiles", "profile-alpha"],
  ["opportunities", "opportunity-alpha"],
  ["pursuits", "pursuit-alpha"],
  ["relationships", "relationship-alpha"],
]) {
  test(`${collection} require matching map keys and embedded IDs`, async () => {
    const state = validState();
    state[collection][key].id = `${key}-mismatch`;
    const result = await validateState(state);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some(
        (error) =>
          error.code === "map_key_id_mismatch" &&
          error.path === `/${collection}/${key}/id`,
      ),
    );
  });
}

for (const [name, mutate, path] of [
  [
    "opportunity profile arrays",
    (state) => {
      state.opportunities["opportunity-alpha"].profile_ids[0] = "profile-missing";
    },
    "/opportunities/opportunity-alpha/profile_ids/0",
  ],
  [
    "relationship profile arrays",
    (state) => {
      state.relationships["relationship-alpha"].profile_ids[0] = "profile-missing";
    },
    "/relationships/relationship-alpha/profile_ids/0",
  ],
  [
    "pursuit profiles",
    (state) => {
      state.pursuits["pursuit-alpha"].profile_id = "profile-missing";
    },
    "/pursuits/pursuit-alpha/profile_id",
  ],
  [
    "pursuit opportunities",
    (state) => {
      state.pursuits["pursuit-alpha"].opportunity_id = "opportunity-missing";
    },
    "/pursuits/pursuit-alpha/opportunity_id",
  ],
  [
    "artifact pursuit links",
    (state) => {
      state.profiles["profile-alpha"].artifacts.push({
        ...artifact("artifact-alpha"),
        pursuit_id: "pursuit-missing",
      });
    },
    "/profiles/profile-alpha/artifacts/0/pursuit_id",
  ],
]) {
  test(`missing ${name} are dangling`, async () => {
    const state = validState();
    mutate(state);
    await assertDanglingReference(state, path);
  });
}

test("an artifact belongs to the profile that contains it", async () => {
  const state = validState();
  state.profiles["profile-alpha"].artifacts.push({
    ...artifact("artifact-alpha"),
    profile_id: "profile-beta",
  });
  await assertDanglingReference(state, "/profiles/profile-alpha/artifacts/0/profile_id");
});

test("semantic paths escape slash and tilde in map record IDs", async () => {
  const state = validState();
  state.profiles["profile-a/b~c"] = {
    id: "profile-mismatch",
    record_revision: 1,
    name: "Escaped Profile",
    data: {},
    artifacts: [],
  };

  const result = await validateState(state);

  assert.ok(
    result.errors.some(
      ({ code, path }) =>
        code === "map_key_id_mismatch" &&
        path === "/profiles/profile-a~1b~0c/id",
    ),
  );
});

test("a missing artifact owner profile emits one diagnostic", async () => {
  const state = validState();
  state.profiles["profile-alpha"].artifacts.push({
    ...artifact("artifact-alpha"),
    profile_id: "profile-missing",
  });

  const result = await validateState(state);

  assert.deepEqual(
    result.errors.filter(
      ({ path }) =>
        path === "/profiles/profile-alpha/artifacts/0/profile_id",
    ),
    [
      {
        code: "dangling_reference",
        path: "/profiles/profile-alpha/artifacts/0/profile_id",
        message: "artifact profile does not resolve: profile-missing",
      },
    ],
  );
});

test("an Alpha task cannot link to a Beta activity", async () => {
  const state = validState();
  state.activities.push({
    id: "activity-beta",
    record_revision: 1,
    type: "note",
    occurred_at: "2026-07-21T11:00:00Z",
    profile_id: "profile-beta",
  });
  state.tasks[0].activity_id = "activity-beta";

  await assertReferenceDiagnostic(
    state,
    "/tasks/0/activity_id",
    "linked activity must match the record profile context",
  );
});

test("a pursuit-implied Alpha event cannot link to a Beta-only relationship", async () => {
  const state = validState();
  state.relationships["relationship-beta"] = {
    id: "relationship-beta",
    record_revision: 1,
    kind: "contact",
    name: "Beta Contact",
    profile_ids: ["profile-beta"],
  };
  delete state.activities[0].profile_id;
  state.activities[0].relationship_id = "relationship-beta";

  await assertReferenceDiagnostic(
    state,
    "/activities/0/relationship_id",
    "linked relationship must include the record profile context",
  );
});

test("established activity and task profiles reject a profileless relationship", async () => {
  const state = validState();
  state.relationships["relationship-alpha"].profile_ids = [];

  const result = await validateState(state);

  for (const path of [
    "/activities/0/relationship_id",
    "/tasks/0/relationship_id",
  ]) {
    assert.ok(
      result.errors.some(
        ({ code, path: errorPath, message }) =>
          code === "dangling_reference" &&
          errorPath === path &&
          message === "linked relationship must include the record profile",
      ),
    );
  }
});

test("pursuit event IDs resolve to activities", async () => {
  const state = validState();
  state.pursuits["pursuit-alpha"].event_ids = ["activity-missing"];

  await assertReferenceDiagnostic(
    state,
    "/pursuits/pursuit-alpha/event_ids/0",
    "pursuit event does not resolve: activity-missing",
  );
});

test("pursuit events are owned by the pursuit", async () => {
  const state = validState();
  delete state.activities[0].pursuit_id;

  await assertReferenceDiagnostic(
    state,
    "/pursuits/pursuit-alpha/event_ids/0",
    "pursuit event must be owned by its pursuit",
  );
});

test("pursuit event profiles match the pursuit profile", async () => {
  const state = validState();
  state.activities[0].profile_id = "profile-beta";

  await assertReferenceDiagnostic(
    state,
    "/pursuits/pursuit-alpha/event_ids/0",
    "pursuit event profile must match the pursuit profile",
  );
});

test("pursuit event opportunities match the pursuit opportunity", async () => {
  const state = validState();
  state.opportunities["opportunity-beta"] = {
    id: "opportunity-beta",
    record_revision: 1,
    kind: "role",
    profile_ids: ["profile-alpha"],
    sources: [],
  };
  state.activities[0].opportunity_id = "opportunity-beta";

  await assertReferenceDiagnostic(
    state,
    "/pursuits/pursuit-alpha/event_ids/0",
    "pursuit event opportunity must match the pursuit opportunity",
  );
});

test("a pursuit profile belongs to the pursuit opportunity", async () => {
  const state = validState();
  state.opportunities["opportunity-alpha"].profile_ids = ["profile-beta"];

  await assertReferenceDiagnostic(
    state,
    "/pursuits/pursuit-alpha/opportunity_id",
    "pursuit opportunity must include the pursuit profile",
  );
});

test("an artifact pursuit shares the artifact profile", async () => {
  const state = validState();
  state.opportunities["opportunity-alpha"].profile_ids.push("profile-beta");
  state.pursuits["pursuit-alpha"].profile_id = "profile-beta";
  state.pursuits["pursuit-alpha"].event_ids = [];
  state.activities = [];
  state.tasks = [];
  state.profiles["profile-alpha"].artifacts.push({
    ...artifact("artifact-alpha"),
    pursuit_id: "pursuit-alpha",
  });

  await assertReferenceDiagnostic(
    state,
    "/profiles/profile-alpha/artifacts/0/pursuit_id",
    "artifact pursuit must share the artifact profile",
  );
});

test("an artifact opportunity includes the artifact profile", async () => {
  const state = validState();
  state.pursuits = {};
  state.activities = [];
  state.tasks = [];
  state.opportunities["opportunity-alpha"].profile_ids = ["profile-beta"];
  state.profiles["profile-alpha"].artifacts.push({
    ...artifact("artifact-alpha"),
    opportunity_id: "opportunity-alpha",
  });

  await assertReferenceDiagnostic(
    state,
    "/profiles/profile-alpha/artifacts/0/opportunity_id",
    "artifact opportunity must include the artifact profile",
  );
});

test("an artifact pursuit and opportunity agree", async () => {
  const state = validState();
  state.opportunities["opportunity-beta"] = {
    id: "opportunity-beta",
    record_revision: 1,
    kind: "role",
    profile_ids: ["profile-alpha"],
    sources: [],
  };
  state.profiles["profile-alpha"].artifacts.push({
    ...artifact("artifact-alpha"),
    pursuit_id: "pursuit-alpha",
    opportunity_id: "opportunity-beta",
  });

  await assertReferenceDiagnostic(
    state,
    "/profiles/profile-alpha/artifacts/0/opportunity_id",
    "artifact pursuit and opportunity must agree",
  );
});

for (const collection of ["activities", "tasks"]) {
  test(`${collection} opportunity links include the record profile`, async () => {
    const state = validState();
    state.opportunities["opportunity-alpha"].profile_ids = ["profile-beta"];

    await assertReferenceDiagnostic(
      state,
      `/${collection}/0/opportunity_id`,
      "linked opportunity must include the record profile",
    );
  });

  test(`${collection} pursuit links match the record profile`, async () => {
    const state = validState();
    state.opportunities["opportunity-alpha"].profile_ids.push("profile-beta");
    state.pursuits["pursuit-alpha"].profile_id = "profile-beta";

    await assertReferenceDiagnostic(
      state,
      `/${collection}/0/pursuit_id`,
      "linked pursuit must match the record profile",
    );
  });

  test(`${collection} relationship links include the record profile`, async () => {
    const state = validState();
    state.relationships["relationship-alpha"].profile_ids = ["profile-beta"];

    await assertReferenceDiagnostic(
      state,
      `/${collection}/0/relationship_id`,
      "linked relationship must include the record profile",
    );
  });

  test(`${collection} pursuit and opportunity links agree`, async () => {
    const state = validState();
    state.opportunities["opportunity-beta"] = {
      id: "opportunity-beta",
      record_revision: 1,
      kind: "role",
      profile_ids: ["profile-alpha"],
      sources: [],
    };
    state[collection][0].opportunity_id = "opportunity-beta";

    await assertReferenceDiagnostic(
      state,
      `/${collection}/0/opportunity_id`,
      "linked pursuit and opportunity must agree",
    );
  });
}

for (const collection of ["activities", "tasks"]) {
  for (const [field, missingId] of [
    ["profile_id", "profile-missing"],
    ["opportunity_id", "opportunity-missing"],
    ["pursuit_id", "pursuit-missing"],
    ["relationship_id", "relationship-missing"],
  ]) {
    test(`${collection} resolve ${field}`, async () => {
      const state = validState();
      state[collection][0][field] = missingId;
      await assertDanglingReference(state, `/${collection}/0/${field}`);
    });
  }
}

test("tasks resolve activity references", async () => {
  const state = validState();
  state.tasks[0].activity_id = "activity-missing";
  await assertDanglingReference(state, "/tasks/0/activity_id");
});

for (const [name, mutate, path] of [
  [
    "task IDs",
    (state) => state.tasks.push({ ...state.tasks[0] }),
    "/tasks/1/id",
  ],
  [
    "artifact IDs",
    (state) => {
      state.profiles["profile-alpha"].artifacts.push(artifact("artifact-alpha"));
      state.profiles["profile-alpha"].artifacts.push(artifact("artifact-alpha"));
    },
    "/profiles/profile-alpha/artifacts/1/id",
  ],
]) {
  test(`duplicate ${name} are rejected`, async () => {
    const state = validState();
    mutate(state);
    const result = await validateState(state);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some(
        (error) => error.code === "duplicate_id" && error.path === path,
      ),
    );
  });
}
