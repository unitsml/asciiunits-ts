// Replays the pinned shared corpus through the generated LutaML model, as
// asciiunits-rs tests/model.rs does: for every accept row the Document's
// declared JSON equals the recorded parsanol tree and reading the recorded
// tree back gives an equal Document; every reject row is refused.
//   CORPUS_DIR points at asciiunits-testsuite/corpora/unitsml (required on CI).
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  Model,
  modelJson,
  documentJson,
  parseModel,
  toPortableJson,
} from "../dist/index.js";

const codec = modelJson.CODECS["Asciiunits::Model::Document@default"];
const corpusDir = process.env.CORPUS_DIR;
const corpusFile = corpusDir && join(corpusDir, "corpus.json");
if (process.env.CI && !(corpusFile && existsSync(corpusFile))) {
  throw new Error(`CORPUS_DIR must point at the pinned corpus on CI (got ${corpusDir})`);
}

test(
  "generated models replay the shared corpus",
  { skip: corpusFile && existsSync(corpusFile) ? false : "CORPUS_DIR not set" },
  async () => {
    const corpus = JSON.parse(readFileSync(corpusFile as string, "utf8"));
    let accepted = 0;
    let rejected = 0;
    for (const row of corpus.cases) {
      const model = await parseModel(row.input);
      if (row.kind === "accept") {
        assert.ok(model instanceof Model.AsciiunitsModelDocument, row.input);
        const expected = documentJson(row.parsanol_tree);
        assert.deepEqual(JSON.parse(toPortableJson(model)), expected, row.input);
        assert.deepEqual(codec.decode(expected), model, row.input);
        accepted += 1;
      } else if (row.kind === "reject") {
        assert.equal(model, null, row.input);
        rejected += 1;
      } else {
        assert.fail(`unknown source outcome ${row.kind}`);
      }
    }
    assert.deepEqual([accepted, rejected], [92, 51]);
  },
);

test("a bare unit is a typed Document with exact slice integers", async () => {
  const model = await parseModel("m");
  assert.ok(model instanceof Model.AsciiunitsModelDocument);
  assert.equal(
    toPortableJson(model),
    '{"expression":{"unit":{"value":"m","offset":"0","length":"1","line":"1","column":"1"}}}',
  );
});

// The lutaml-model-ts a91e37d JSON reader ignores undeclared keys (asciiunits-rs
// refuses them); exactness is what both readers enforce.
test("a slice integer sent as a JSON number is a codec error", () => {
  const tree = { unit: { value: "m", offset: 0, length: 1, line: 1, column: 1 } };
  assert.throws(() => codec.decode({ expression: tree }), {
    name: "LmlError",
    message: /integers are exact decimal strings/,
  });
});
