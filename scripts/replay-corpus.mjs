// Replays the asciiunits conformance corpus against this runtime:
// every case must match the oracle kind (accept/reject) and, for
// accepts, the frozen parsanol capture tree.
//
// Usage: node scripts/replay-corpus.mjs [--corpus <dir>]
//   CORPUS_DIR (or --corpus) points at asciiunits-testsuite/corpora/unitsml.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseShape, artifactTestFailures } from "../dist/index.js";

function argCorpusDir() {
  const flag = process.argv.indexOf("--corpus");
  if (flag !== -1 && process.argv[flag + 1]) return process.argv[flag + 1];
  return process.env.CORPUS_DIR ?? "../asciiunits-testsuite/corpora/unitsml";
}

const corpusDir = argCorpusDir();
const kinds = JSON.parse(
  readFileSync(join(corpusDir, "expected-kinds.json"), "utf8"),
);
const corpus = JSON.parse(readFileSync(join(corpusDir, "corpus.json"), "utf8"));
const treesByInput = new Map(
  corpus.cases
    .filter((c) => c.parsanol_tree)
    .map((c) => [c.input, c.parsanol_tree]),
);

const failures = await artifactTestFailures();
if (failures.length > 0) {
  console.error("artifact embedded tests failed:", failures);
  process.exit(1);
}

let passed = 0;
const bad = [];
for (const { input, kind } of kinds.cases) {
  const shape = await parseShape(input);
  const gotKind = shape === null ? "reject" : "accept";
  if (gotKind !== kind) {
    bad.push(`${JSON.stringify(input)}: expected ${kind}, got ${gotKind}`);
    continue;
  }
  if (kind === "accept" && treesByInput.has(input)) {
    const expected = treesByInput.get(input);
    if (JSON.stringify(sortKeys(shape)) !== JSON.stringify(sortKeys(expected))) {
      bad.push(
        `${JSON.stringify(input)}: tree mismatch\n  got      ${JSON.stringify(shape)}\n  expected ${JSON.stringify(expected)}`,
      );
      continue;
    }
  }
  passed += 1;
}

console.log(`${passed}/${kinds.cases.length} corpus cases pass`);
if (bad.length > 0) {
  for (const line of bad) console.error("FAIL", line);
  process.exit(1);
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
    return out;
  }
  return value;
}
