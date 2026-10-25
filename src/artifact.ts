// Loads the asciiunits PARG artifact (vendored from unitsml/asciiunits,
// checksum-verified against artifacts/unitsml.checksums.txt) into the
// parsanol TypeScript runtime.
import type { PargRuntime } from "parsanol";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export class ArtifactChecksumError extends Error {
  constructor(expected: string, actual: string) {
    super(
      `asciiunits artifact checksum mismatch: expected ${expected}, got ${actual}`,
    );
    this.name = "ArtifactChecksumError";
  }
}

export interface AsciiUnitsTree {
  // Capture-named tree: unit/prefix/dimension/integer/power_numerator/
  // extender/sqrt/int_exp/sequence/first_set/second_set — see
  // asciiunits README "Artifact tree contract".
  [capture: string]: unknown;
}

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT_PATH = join(PACKAGE_ROOT, "artifacts", "unitsml.json");
const CHECKSUMS_PATH = join(PACKAGE_ROOT, "artifacts", "unitsml.checksums.txt");

let runtimePromise: Promise<PargRuntime> | null = null;

/** sha256 of the vendored artifact bytes, `sha256:` prefixed. */
export function artifactChecksum(): string {
  return `sha256:${createHash("sha256")
    .update(readFileSync(ARTIFACT_PATH))
    .digest("hex")}`;
}

function verifyChecksums(): void {
  const line = readFileSync(CHECKSUMS_PATH, "utf8")
    .split("\n")
    .find((l) => l.startsWith("artifacts/unitsml.json "));
  if (!line) return;
  const expected = line.trim().split(/\s+/)[1];
  const actual = artifactChecksum();
  if (actual !== expected) throw new ArtifactChecksumError(expected, actual);
}

async function runtime(): Promise<PargRuntime> {
  runtimePromise ??= import("parsanol").then(({ PargRuntime }) => {
    verifyChecksums();
    return new PargRuntime(readFileSync(ARTIFACT_PATH, "utf8"), "expression");
  });
  return runtimePromise;
}

/** The raw parsanol-shape capture tree, or null when the input is rejected. */
export async function parseShape(
  input: string,
): Promise<AsciiUnitsTree | null> {
  const rt = await runtime();
  try {
    return rt.parseShape(input) as AsciiUnitsTree;
  } catch {
    return null;
  }
}

/** Embedded artifact tests; empty list means green. */
export async function artifactTestFailures(): Promise<string[]> {
  return (await runtime()).runTests();
}
