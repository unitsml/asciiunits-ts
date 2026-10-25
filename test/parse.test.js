import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parse,
  parseShape,
  artifactChecksum,
  artifactTestFailures,
  ArtifactChecksumError,
  Formula,
  Unit,
  Prefix,
  Number,
  Fenced,
  Sqrt,
} from "../dist/index.js";

test("artifact checksum is stable", () => {
  assert.match(artifactChecksum(), /^sha256:[0-9a-f]{64}$/);
});

test("artifact embedded tests are green", async () => {
  assert.deepEqual(await artifactTestFailures(), []);
});

test("parses a bare unit", async () => {
  const tree = await parse("m");
  assert.ok(tree instanceof Unit);
  assert.equal(tree.unitName, "m");
  assert.equal(tree.powerNumerator, undefined);
});

test("parses a prefixed unit", async () => {
  const tree = await parse("mm");
  assert.ok(tree instanceof Unit);
  assert.equal(tree.unitName, "m");
  assert.ok(tree.prefix instanceof Prefix);
  assert.equal(tree.prefix.prefixName, "m");
});

test("parses products and powers into formulas", async () => {
  const tree = await parse("mm*s^-2");
  assert.ok(tree instanceof Formula);
});

test("parses square roots", async () => {
  const tree = await parse("sqrt(Hz)");
  assert.ok(tree instanceof Sqrt || tree instanceof Formula);
});

test("maps the unit one with a sequence like the Ruby mapper", async () => {
  // {unit, sequence} has no Transform rule in unitsml-ruby either — the
  // mapper leaves the raw (mapped-children) object, which the unitsml-ts
  // parse layer's post-parse passes normalize.
  const tree = await parse("1m");
  assert.ok(tree !== null && typeof tree === "object");
  assert.ok("unit" in tree && "sequence" in tree);
});

test("rejects a value bound to a unit", async () => {
  assert.equal(await parseShape("10m"), null);
  assert.equal(await parse("10m"), null);
});

test("rejects garbage", async () => {
  assert.equal(await parseShape("not a unit"), null);
});

test("model equality is structural", async () => {
  const a = new Unit("m", undefined, new Prefix("m"));
  const b = new Unit("m", undefined, new Prefix("m"));
  assert.ok(a.equals(b));
  assert.ok(!a.equals(new Unit("m")));
});

test("fenced and number equality", () => {
  assert.ok(new Number("1").equals(new Number("1")));
  assert.ok(new Fenced("(", new Number("2"), ")").equals(new Fenced("(", new Number("2"), ")")));
});
