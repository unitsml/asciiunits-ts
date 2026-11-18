// The producer pin of the vendored artifact, compiled into the package so a
// browser cannot be talked into a different artifact by swapping the
// checksums file next to it. Must equal artifacts/unitsml.checksums.txt
// (test/pin.test.ts enforces this).

/** sha256 of artifacts/unitsml.json's bytes. */
export const ARTIFACT_FILE_SHA256 =
  "sha256:98e53c5fa31233725158a49af75361b0aacc4bf3292a8c09675995f85a0b7e4c";

/** Parsanol's own envelope checksum (the artifact's `checksum` field). */
export const ARTIFACT_ENVELOPE_CHECKSUM =
  "sha256:3a5d423ea975d46e9ab4b98a652e9276849f540226466dbacdd5001b2f6a5016";
