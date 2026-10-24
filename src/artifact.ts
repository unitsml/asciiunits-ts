// Loads the asciiunits PARG artifact (vendored from unitsml/asciiunits,
// pinned by CI to the released artifact checksum) into the parsanol
// TypeScript runtime.
//
// TODO(suleman-uzair): wire the parsanol npm runtime load call — mirror
// plurimath/amath's lib usage: PargRuntime.load(name, undefined, artifactDir).
// Verify the envelope checksum against artifacts/unitsml.checksums.txt.
export const ARTIFACT_PATH = new URL("../artifacts/unitsml.json", import.meta.url);
export const TABLES_DIR = new URL("../tables/", import.meta.url);

export interface AsciiUnitsTree {
  // Capture-named tree: unit/prefix/dimension/integer/power_numerator/
  // extender/sqrt/int_exp/sequence/first_set/second_set — see
  // asciiunits README "Artifact tree contract".
  [capture: string]: unknown;
}

export async function loadArtifact(): Promise<{
  parse: (entry: string, input: string) => AsciiUnitsTree;
}> {
  throw new Error("TODO(suleman-uzair): implement via the parsanol npm runtime");
}
