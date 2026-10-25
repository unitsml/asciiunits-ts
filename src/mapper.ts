// Maps asciiunits artifact parse trees (capture-named hashes whose leaves
// are {value, offset, ...} slices) onto the typed model. Dispatch is on the
// exact sorted key set of each node, bottom-up — a 1:1 port of unitsml-ruby's
// Unitsml::Parg::TreeMapper (which mirrors the Parslet Transform rules).
import {
  Dimension,
  Extender,
  Formula,
  Fenced,
  Number,
  Prefix,
  Sqrt,
  Unit,
  type ModelNode,
} from "./model.js";
import type { AsciiUnitsTree } from "./artifact.js";

type PlainTree = Record<string, unknown>;

export function mapTree(tree: AsciiUnitsTree): ModelNode | PlainTree {
  return map(normalize(tree) as PlainTree);
}

function normalize(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(normalize);
  if (node !== null && typeof node === "object") {
    const out: PlainTree = {};
    for (const [key, value] of Object.entries(node)) {
      out[key] = normalize(value);
    }
    return out;
  }
  return node;
}

const asNode = (value: unknown): ModelNode => value as unknown as ModelNode;

function map(node: PlainTree): ModelNode | PlainTree {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    return node as unknown as ModelNode;
  }

  const mapped: PlainTree = {};
  for (const [key, value] of Object.entries(node)) {
    mapped[key] =
      value !== null && typeof value === "object" && !Array.isArray(value)
        ? map(value as PlainTree)
        : value;
  }

  const keys = Object.keys(mapped).sort();
  const t = (key: string): string =>
    typeof mapped[key] === "object" && mapped[key] !== null
      ? ((mapped[key] as PlainTree)["value"] as string)
      : String(mapped[key]);

  switch (keys.join(" ")) {
    case "dimension":
      return new Dimension(t("dimension"));
    case "dimension extender power_numerator sequence":
      return new Formula([
        new Dimension(t("dimension"), mapped["power_numerator"]),
        new Extender(t("extender")),
        mapped["sequence"] as unknown as ModelNode,
      ]);
    case "dimension extender sequence":
      return new Formula([
        new Dimension(t("dimension")),
        new Extender(t("extender")),
        mapped["sequence"] as unknown as ModelNode,
      ]);
    case "dimension power_numerator":
      return new Dimension(t("dimension"), mapped["power_numerator"]);
    case "extender first_set second_set":
      return new Formula([
        mapped["first_set"] as unknown as ModelNode,
        new Extender(t("extender")),
        mapped["second_set"] as unknown as ModelNode,
      ]);
    case "extender implicit_extended sequence":
      return new Formula([
        mapped["implicit_extended"] as unknown as ModelNode,
        new Extender(t("extender")),
        mapped["sequence"] as unknown as ModelNode,
      ]);
    case "extender int_exp sequence":
      return new Formula([
        mapped["int_exp"] as unknown as ModelNode,
        new Extender(t("extender")),
        mapped["sequence"] as unknown as ModelNode,
      ]);
    case "extender power_numerator sequence unit":
      return new Formula([
        new Unit(t("unit"), mapped["power_numerator"]),
        new Extender(t("extender")),
        mapped["sequence"] as unknown as ModelNode,
      ]);
    case "extender power_numerator prefix sequence unit":
      return new Formula([
        new Unit(
          t("unit"),
          mapped["power_numerator"],
          new Prefix(t("prefix")),
        ),
        new Extender(t("extender")),
        mapped["sequence"] as unknown as ModelNode,
      ]);
    case "extender prefix sequence unit":
      return new Formula([
        new Unit(t("unit"), undefined, new Prefix(t("prefix"))),
        new Extender(t("extender")),
        mapped["sequence"] as unknown as ModelNode,
      ]);
    case "extender sequence unit":
      return new Formula([
        new Unit(t("unit")),
        new Extender(t("extender")),
        mapped["sequence"] as unknown as ModelNode,
      ]);
    case "first_int_exp_set second_int_exp_set":
      return new Formula([
        setToFence(mapped["first_int_exp_set"]),
        setToFence(mapped["second_int_exp_set"]),
      ]);
    case "first_int_exp_set second_set":
      return new Formula([
        setToFence(mapped["first_int_exp_set"]),
        mapped["second_set"] as unknown as ModelNode,
      ]);
    case "first_set second_int_exp_set":
      return new Formula([
        mapped["first_set"] as unknown as ModelNode,
        setToFence(mapped["second_int_exp_set"]),
      ]);
    case "first_set second_set":
      return new Formula([
        mapped["first_set"] as unknown as ModelNode,
        mapped["second_set"] as unknown as ModelNode,
      ]);
    case "implicit_extended":
      return mapped["implicit_extended"] as unknown as ModelNode;
    case "int_exp":
      return mapped["int_exp"] as unknown as ModelNode;
    case "int_exp sequence":
      return new Formula([
        mapped["int_exp"] as unknown as ModelNode,
        mapped["sequence"] as unknown as ModelNode,
      ]);
    case "integer":
      return new Number(t("integer"));
    case "close_paren integer open_paren":
      return new Fenced(
        t("open_paren"),
        new Number(t("integer")),
        t("close_paren"),
      );
    case "close_paren int_exp open_paren":
      return new Fenced(
        t("open_paren"),
        mapped["int_exp"] as unknown as ModelNode,
        t("close_paren"),
      );
    case "power_numerator unit":
      return new Unit(t("unit"), mapped["power_numerator"]);
    case "power_numerator prefix unit":
      return new Unit(
        t("unit"),
        mapped["power_numerator"],
        new Prefix(t("prefix")),
      );
    case "prefix":
      return new Prefix(t("prefix"));
    case "prefix unit":
      return new Unit(t("unit"), undefined, new Prefix(t("prefix")));
    case "sqrt":
      return new Sqrt(mapped["sqrt"] as unknown as ModelNode);
    case "unit":
      return new Unit(t("unit"));
    default:
      // Unmatched key combinations stay as raw objects (mirrors the Ruby
      // mapper leaving them as symbol-keyed hashes); terminal slices keep
      // their string keys.
      return mapped;
  }
}

function setToFence(set: unknown): ModelNode {
  if (set instanceof Fenced) return set;
  return new Fenced("(", set as unknown as ModelNode, ")");
}
