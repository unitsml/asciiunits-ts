// Replays the asciiunits conformance corpus against this runtime:
// every case must match the oracle kind (accept/reject) and, for
// accepts, the frozen parsanol capture tree.
//
// Usage: node scripts/replay-corpus.ts [--corpus <dir>] [--module <dir>]
//   CORPUS_DIR (or --corpus) points at asciiunits-testsuite/corpora/unitsml.
//   ASCIIUNITS_PACKAGE (or --module) replays an installed asciiunits
//   package directory instead of this checkout's dist/ (the packed-package
//   smoke uses it). The corpus must have been generated for the artifact
//   being replayed: its artifact_checksum must equal the artifact envelope
//   checksum in the package's artifacts/unitsml.checksums.txt.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const packageRoot = argValue(
  "--module",
  process.env.ASCIIUNITS_PACKAGE ?? join(dirname(fileURLToPath(import.meta.url)), ".."),
);
const { parseShape, artifactTestFailures } = await import(
  pathToFileURL(join(packageRoot, "dist", "index.js")).href
);

const corpusDir = argValue(
  "--corpus",
  process.env.CORPUS_DIR ?? "../asciiunits-testsuite/corpora/unitsml",
);
const kinds = JSON.parse(
  readFileSync(join(corpusDir, "expected-kinds.json"), "utf8"),
);
const corpus = JSON.parse(readFileSync(join(corpusDir, "corpus.json"), "utf8"));
const treesByInput = new Map(
  corpus.cases
    .filter((c) => c.parsanol_tree)
    .map((c) => [c.input, c.parsanol_tree]),
);

// The corpus pins the artifact it was generated from.
const envelope = readFileSync(join(packageRoot, "artifacts", "unitsml.checksums.txt"), "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim().split(/\s+/))
  .find(([key]) => key === "artifact_checksum")?.[1];
if (corpus.artifact_checksum !== envelope) {
  console.error(
    `corpus artifact_checksum ${corpus.artifact_checksum} does not match the replayed artifact ${envelope}`,
  );
  process.exit(1);
}

// expected-kinds.json and corpus.json must describe the same cases.
const corpusKinds = JSON.stringify(corpus.cases.map((c) => [c.kind, c.input]));
const listedKinds = JSON.stringify(kinds.cases.map((c) => [c.kind, c.input]));
if (corpusKinds !== listedKinds) {
  console.error("expected-kinds.json and corpus.json disagree on cases or kinds");
  process.exit(1);
}

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

console.log(`${passed}/${kinds.cases.length} corpus cases pass (artifact ${envelope})`);
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
