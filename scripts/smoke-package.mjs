// Qualifies what npm would publish rather than the working tree: packs the
// package, installs the tarball into a scratch project, checks the packed
// file list and artifact bytes, then replays the conformance corpus through
// the INSTALLED package (scripts/replay-corpus.ts --module).
//
// Usage: npm run build && CORPUS_DIR=... node scripts/smoke-package.mjs
// Node only: this is not browser evidence.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// npm is a .cmd shim on Windows; run it through cmd.exe without a shell string.
const run = (args, cwd) =>
  process.platform === "win32"
    ? execFileSync("cmd.exe", ["/d", "/s", "/c", "npm", ...args], { cwd, encoding: "utf8" })
    : execFileSync("npm", args, { cwd, encoding: "utf8" });

const scratch = mkdtempSync(join(tmpdir(), "asciiunits-smoke-"));
try {
  const [packed] = JSON.parse(run(["pack", "--json", "--pack-destination", scratch], ROOT));
  const files = packed.files.map((f) => f.path.replace(/\\/g, "/"));
  const required = [
    "package.json",
    "dist/index.js",
    "dist/index.d.ts",
    "dist/artifact.js",
    "artifacts/unitsml.json",
    "artifacts/unitsml.checksums.txt",
  ];
  const missing = required.filter((path) => !files.includes(path));
  if (missing.length > 0) throw new Error(`packed tarball lacks ${missing.join(", ")}`);
  const stray = files.filter((path) => /^(src|test|scripts)\//.test(path));
  if (stray.length > 0) throw new Error(`packed tarball ships sources: ${stray.join(", ")}`);

  writeFileSync(
    join(scratch, "package.json"),
    JSON.stringify({ name: "asciiunits-smoke", private: true, type: "module" }),
  );
  run(["install", "--no-audit", "--no-fund", join(scratch, packed.filename)], scratch);
  const installed = join(scratch, "node_modules", "asciiunits");

  // Installed artifact bytes must match the checksum file shipped with them.
  const artifact = readFileSync(join(installed, "artifacts", "unitsml.json"));
  const actual = `sha256:${createHash("sha256").update(artifact).digest("hex")}`;
  const expected = readFileSync(join(installed, "artifacts", "unitsml.checksums.txt"), "utf8")
    .split(/\r?\n/)
    .find((line) => line.startsWith("artifacts/unitsml.json "))
    ?.trim()
    .split(/\s+/)[1];
  if (actual !== expected) {
    throw new Error(`installed artifact ${actual} does not match its checksum ${expected}`);
  }

  // The installed package must import by name and parse.
  const probe = join(scratch, "probe.mjs");
  writeFileSync(
    probe,
    'import { parse } from "asciiunits";\n' +
      'const tree = await parse("km^2");\n' +
      'if (tree === null) { console.error("km^2 rejected"); process.exit(1); }\n' +
      'if ((await parse("not a unit ((")) !== null) { console.error("garbage accepted"); process.exit(1); }\n',
  );
  execFileSync(process.execPath, [probe], { cwd: scratch, stdio: "inherit" });

  execFileSync(
    process.execPath,
    [join(ROOT, "scripts", "replay-corpus.ts"), "--module", installed],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  console.log(`packed ${packed.filename}: ${files.length} files, artifact ${actual}`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
