// The producer pin of the vendored artifact, compiled into the package so a
// browser cannot be talked into a different artifact by swapping the
// checksums file next to it. Must equal artifacts/unitsml.checksums.txt
// (test/pin.test.ts enforces this).

/** sha256 of artifacts/unitsml.json's bytes. */
export const ARTIFACT_FILE_SHA256 =
  "sha256:139d91337a0944d60f36bc144a205625349f4b3b8b7ff1a0fba3c61e70c57804";

/** Parsanol's own envelope checksum (the artifact's `checksum` field). */
export const ARTIFACT_ENVELOPE_CHECKSUM =
  "sha256:aa22618c80dc02f3fe1edf2c798dbe34aceae5f4d84524ff98f76a2b91af151d";
