import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const fixture = (name) =>
  readFile(new URL("../fixtures/state/" + name, import.meta.url), "utf8");

test("empty state validates", async () => {
  const { parseStateYaml } = await import("../../../tools/hunter-state/io.mjs");
  const { validateStateObject } =
    await import("../../../tools/hunter-state/validate.mjs");
  const parsed = parseStateYaml(await fixture("valid/empty.yaml"), "empty");
  assert.equal(parsed.ok, true);
  assert.deepEqual(validateStateObject(parsed.state), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("unknown semantic fields survive a round trip", async () => {
  const { parseStateYaml, serializeState } =
    await import("../../../tools/hunter-state/io.mjs");
  const parsed = parseStateYaml(
    await fixture("valid/two-profiles.yaml"),
    "two-profiles",
  );
  const roundTrip = parseStateYaml(serializeState(parsed.state), "roundtrip");
  assert.equal(roundTrip.ok, true);
  assert.equal(roundTrip.state.extensions.future_flag, true);
});

test("duplicate keys, aliases, tags, and non-finite numbers are rejected", async () => {
  const { parseStateYaml } = await import("../../../tools/hunter-state/io.mjs");
  const cases = [
    "revision: 1\nrevision: 2\n",
    "a: &a {x: 1}\nb: *a\n",
    "value: !custom x\n",
    "value: .inf\n",
  ];
  for (const text of cases) assert.equal(parseStateYaml(text).ok, false);
});

test("numeric mapping keys cannot collapse into quoted string keys", async () => {
  const { parseStateYaml } = await import("../../../tools/hunter-state/io.mjs");
  const parsed = parseStateYaml('1: numeric\n"1": string\n', "numeric-key");

  assert.equal(parsed.ok, false);
  assert.ok(
    parsed.diagnostics.some(
      ({ code, message }) =>
        code === "parse" && message === "Mapping keys must resolve to strings",
    ),
  );
});

test("collection mapping keys cannot collapse into their string spelling", async () => {
  const { parseStateYaml } = await import("../../../tools/hunter-state/io.mjs");
  const parsed = parseStateYaml(
    '? [alpha, beta]\n: collection\n"alpha,beta": string\n',
    "collection-key",
  );

  assert.equal(parsed.ok, false);
  assert.ok(
    parsed.diagnostics.some(
      ({ code, message }) =>
        code === "parse" && message === "Mapping keys must resolve to strings",
    ),
  );
});

test("quoted and unquoted string keys preserve own __proto__ properties", async () => {
  const { parseStateYaml } = await import("../../../tools/hunter-state/io.mjs");

  for (const key of ["__proto__", '"__proto__"']) {
    const parsed = parseStateYaml(`${key}: own\nordinary: value\n`, "string-key");
    assert.equal(parsed.ok, true);
    assert.equal(Object.hasOwn(parsed.state, "__proto__"), true);
    assert.equal(parsed.state.__proto__, "own");
    assert.equal(parsed.state.ordinary, "value");
  }
});

test("parsed unknown fields reject unsafe integers with a stable pointer", async () => {
  const { parseStateYaml } = await import("../../../tools/hunter-state/io.mjs");
  const parsed = parseStateYaml(
    "extensions:\n  future:\n    count: 9007199254740993\n",
    "unsafe-integer",
  );

  assert.deepEqual(parsed, {
    ok: false,
    diagnostics: [
      {
        code: "unsafe_integer",
        path: "/extensions/future/count",
        message: "Integers must be safe integers",
      },
    ],
  });
});
