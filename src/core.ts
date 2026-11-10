// Platform-neutral pieces shared by the Node entry (index.ts) and the
// browser entry (browser.ts). Nothing here may import a Node builtin.
import { mapTree } from "./mapper.js";
import type { ModelNode } from "./model.js";

/** The artifact bytes do not match the pinned producer checksum. */
export class ArtifactChecksumError extends Error {
  constructor(expected: string, actual: string) {
    super(
      `asciiunits artifact checksum mismatch: expected ${expected}, got ${actual}`,
    );
    this.name = "ArtifactChecksumError";
  }
}

/** The artifact (or engine) asset could not be obtained at all. */
export class ArtifactLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ArtifactLoadError";
  }
}

export interface AsciiUnitsTree {
  // Capture-named tree: unit/prefix/dimension/integer/power_numerator/
  // extender/sqrt/int_exp/sequence/first_set/second_set — see
  // asciiunits README "Artifact tree contract".
  [capture: string]: unknown;
}

/** The subset of a parsanol PargRuntime the parser surface relies on. */
export interface ShapeRuntime {
  parseShape(input: string): unknown;
  runTests(): string[];
}

export interface AsciiUnitsParser {
  /** The raw parsanol-shape capture tree, or null when the input is rejected. */
  parseShape(input: string): Promise<AsciiUnitsTree | null>;
  /** Parse to the typed model; null on reject. */
  parse(input: string): Promise<ModelNode | Record<string, unknown> | null>;
  tryParse(input: string): Promise<ReturnType<typeof mapTree> | null>;
  /** Embedded artifact tests; empty list means green. */
  artifactTestFailures(): Promise<string[]>;
}

/**
 * Builds the parse surface over a lazily obtained runtime. Only a grammar
 * rejection becomes null: a runtime that fails to load (missing asset,
 * checksum mismatch, engine init) rejects every call with that error.
 */
export function bindParser(
  runtime: () => Promise<ShapeRuntime>,
): AsciiUnitsParser {
  const parseShape = async (input: string): Promise<AsciiUnitsTree | null> => {
    const rt = await runtime();
    try {
      return rt.parseShape(input) as AsciiUnitsTree;
    } catch (error) {
      if (typeof WebAssembly !== "undefined" && error instanceof WebAssembly.RuntimeError) {
        throw error;
      }
      if (
        error instanceof Error &&
        ["CallDepthLimitExceeded", "RecursionLimitExceeded", "ShapeDepthLimitExceeded"].includes(error.name)
      ) {
        throw error;
      }
      return null;
    }
  };
  const parse = async (input: string) => {
    const shape = await parseShape(input);
    if (shape === null) return null;
    return mapTree(shape);
  };
  return {
    parseShape,
    parse,
    tryParse: parse,
    artifactTestFailures: async () => (await runtime()).runTests(),
  };
}
