// Generated LutaML model layer: the same Document graph that asciiunits-rs
// (models feature) and the asciiunits Ruby gem build from the pinned LML
// bundle model/asciiunits.bundle.json. Platform-neutral.
import {
  codecAsciiunitsModelDocument,
  decodeAsciiunitsModelDocument,
} from "./generated/json/codecs.js";
import type { AsciiunitsModelDocument } from "./generated/models.js";

export * as Model from "./generated/index.js";
export * as modelJson from "./generated/json/index.js";
export type { AsciiunitsModelDocument } from "./generated/models.js";

/**
 * The portable JSON of a Document for a parsanol capture tree: the tree under
 * "expression", with exact integers (slice offset/length/line/column) as
 * decimal strings, as the portable-exact-json-v1 codec requires.
 */
export function documentJson(tree: unknown): { expression: unknown } {
  return { expression: portable(tree) };
}

function portable(value: unknown): unknown {
  if (typeof value === "number" && Number.isInteger(value)) return String(value);
  if (Array.isArray(value)) return value.map(portable);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, portable(item)]),
    );
  }
  return value;
}

/** Read a capture tree into the generated Document; throws WireError on an undeclared capture. */
export function treeToModel(tree: unknown): AsciiunitsModelDocument {
  return decodeAsciiunitsModelDocument(documentJson(tree));
}

/** The Document's declared JSON, compact (byte-equal to asciiunits-rs to_portable_json). */
export function toPortableJson(model: AsciiunitsModelDocument): string {
  return JSON.stringify(codecAsciiunitsModelDocument.encode(model));
}
