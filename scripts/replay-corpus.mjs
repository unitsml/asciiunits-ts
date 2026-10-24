// Replays the asciiunits conformance corpus (inputs.txt + expected-kinds.json)
// against this runtime's parser. Every case must match the frozen oracle kind.
// TODO(suleman-uzair): implement once src/artifact.ts loads the artifact;
// then point CORPUS_DIR at the asciiunits-testsuite checkout.
const CORPUS_DIR = process.env.CORPUS_DIR ?? "../asciiunits-testsuite/corpora/unitsml";
console.log(`replaying corpus from ${CORPUS_DIR} (not implemented yet)`);
process.exit(2);
