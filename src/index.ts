import { parseShape } from "./artifact.js";
import { mapTree } from "./mapper.js";
import type { ModelNode } from "./model.js";

export {
  parseShape,
  artifactChecksum,
  artifactTestFailures,
  ArtifactChecksumError,
} from "./artifact.js";
export type { AsciiUnitsTree } from "./artifact.js";
export { mapTree } from "./mapper.js";
export * from "./model.js";

/** Parse an AsciiUnits unit expression to the typed model; null on reject. */
export async function parse(
  input: string,
): Promise<ModelNode | Record<string, unknown> | null> {
  const shape = await parseShape(input);
  if (shape === null) return null;
  return mapTree(shape);
}

/** parse() without the model mapping — the raw parsanol capture tree. */
export async function tryParse(
  input: string,
): Promise<ReturnType<typeof mapTree> | null> {
  const shape = await parseShape(input);
  if (shape === null) return null;
  return mapTree(shape);
}
