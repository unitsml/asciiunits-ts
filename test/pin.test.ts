import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ARTIFACT_ENVELOPE_CHECKSUM, ARTIFACT_FILE_SHA256 } from "../dist/pin.js";
import { artifactChecksum } from "../dist/index.js";

const url = (p: string) => new URL(`../artifacts/${p}`, import.meta.url);
const checksums = readFileSync(url("unitsml.checksums.txt"), "utf8");
const pinned = (key: string) =>
  checksums.split("\n").find((l) => l.startsWith(`${key} `))?.trim().split(/\s+/)[1];

test("browser pin equals the checksums file and the vendored bytes", () => {
  assert.equal(ARTIFACT_FILE_SHA256, pinned("artifacts/unitsml.json"));
  assert.equal(ARTIFACT_FILE_SHA256, artifactChecksum());
  assert.equal(ARTIFACT_ENVELOPE_CHECKSUM, pinned("artifact_checksum"));
  const envelope = JSON.parse(readFileSync(url("unitsml.json"), "utf8")).checksum;
  assert.equal(ARTIFACT_ENVELOPE_CHECKSUM, envelope);
});
