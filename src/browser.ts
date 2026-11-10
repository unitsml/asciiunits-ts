// Browser entry (the "browser" export condition). Same async parse /
// tryParse / parseShape surface and model mapping as the Node entry, but the
// sealed artifact is fetched (or injected) and verified with WebCrypto
// against the compiled-in producer pin before the parsanol web engine sees
// it. No Node builtins, no filesystem.
import { initialize, PargRuntime } from "parsanol/browser";
import {
  ArtifactChecksumError,
  ArtifactLoadError,
  bindParser,
  type AsciiUnitsParser,
  type AsciiUnitsTree,
} from "./core.js";
import { mapTree } from "./mapper.js";
import type { ModelNode } from "./model.js";
import { ARTIFACT_ENVELOPE_CHECKSUM, ARTIFACT_FILE_SHA256 } from "./pin.js";

export {
  ArtifactChecksumError,
  ArtifactLoadError,
  type AsciiUnitsParser,
  type AsciiUnitsTree,
} from "./core.js";
export { mapTree } from "./mapper.js";
export * from "./model.js";
export { ARTIFACT_ENVELOPE_CHECKSUM, ARTIFACT_FILE_SHA256 } from "./pin.js";

type Bytes = ArrayBuffer | Uint8Array;

/** Where the parsanol web engine's wasm comes from (URL, bytes, Response, module). */
export type WasmSource = Parameters<typeof initialize>[0];

export interface BrowserOptions {
  /**
   * The sealed artifact: a URL to fetch, its bytes, or a loader returning
   * bytes. Defaults to the package's own artifacts/unitsml.json resolved
   * against this module's URL (works when the package is served as-is).
   */
  artifact?: string | URL | Bytes | (() => Promise<Bytes>);
  /** The parsanol engine wasm; defaults to the SDK's own asset URL. */
  wasm?: WasmSource;
  /** fetch implementation used for URL sources; defaults to globalThis.fetch. */
  fetch?: typeof fetch;
}

/** The package's own artifact URL (for hosts that copy assets elsewhere). */
export const defaultArtifactURL: URL = new URL(
  "../artifacts/unitsml.json",
  import.meta.url,
);

async function sha256(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new ArtifactChecksumError(
      ARTIFACT_FILE_SHA256,
      "unverifiable (WebCrypto unavailable; a secure context is required)",
    );
  }
  const digest = new Uint8Array(await subtle.digest("SHA-256", bytes as BufferSource));
  return `sha256:${Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

async function artifactBytes(options: BrowserOptions): Promise<Uint8Array> {
  const source = options.artifact ?? defaultArtifactURL;
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  if (typeof source === "function") {
    try {
      const loaded = await source();
      return loaded instanceof Uint8Array ? loaded : new Uint8Array(loaded);
    } catch (cause) {
      throw new ArtifactLoadError("asciiunits artifact loader failed", { cause });
    }
  }
  const doFetch = options.fetch ?? globalThis.fetch;
  let response: Response;
  try {
    response = await doFetch(source);
  } catch (cause) {
    throw new ArtifactLoadError(`asciiunits artifact fetch failed: ${source}`, { cause });
  }
  if (!response.ok) {
    throw new ArtifactLoadError(
      `asciiunits artifact fetch failed: HTTP ${response.status} for ${source}`,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
}

/** Fetch, pin-verify and load the artifact into the parsanol web engine. */
async function loadRuntime(options: BrowserOptions): Promise<PargRuntime> {
  const bytes = await artifactBytes(options);
  const actual = await sha256(bytes);
  if (actual !== ARTIFACT_FILE_SHA256) {
    throw new ArtifactChecksumError(ARTIFACT_FILE_SHA256, actual);
  }
  const json = new TextDecoder().decode(bytes);
  const envelope = (JSON.parse(json) as { checksum?: unknown }).checksum;
  if (envelope !== ARTIFACT_ENVELOPE_CHECKSUM) {
    throw new ArtifactChecksumError(ARTIFACT_ENVELOPE_CHECKSUM, String(envelope));
  }
  try {
    await initialize(options.wasm);
  } catch (cause) {
    throw new ArtifactLoadError("parsanol web engine failed to initialize", { cause });
  }
  return new PargRuntime(json, "expression");
}

export interface AsciiUnits extends AsciiUnitsParser {
  /** sha256 of the loaded artifact bytes (equal to ARTIFACT_FILE_SHA256). */
  artifactChecksum(): Promise<string>;
}

/**
 * An isolated parser with its own artifact source. Loading starts on first
 * use (or via ready()); a failed load rejects every call with the same
 * ArtifactLoadError / ArtifactChecksumError instead of looking like a
 * syntax rejection.
 */
export function createAsciiUnits(options: BrowserOptions = {}): AsciiUnits & {
  ready(): Promise<void>;
} {
  let pending: Promise<PargRuntime> | null = null;
  const runtime = () => (pending ??= loadRuntime(options));
  const parser = bindParser(runtime);
  return {
    ...parser,
    ready: async () => {
      await runtime();
    },
    artifactChecksum: async () => {
      await runtime();
      return ARTIFACT_FILE_SHA256;
    },
  };
}

let shared = createAsciiUnits();

/**
 * Configure the module-level parser (used by parse/parseShape and by
 * dependants such as unitsml) — e.g. asset URLs when a bundler relocates
 * them. Returns a promise that settles once the new artifact is loaded.
 */
export function configure(options: BrowserOptions): Promise<void> {
  shared = createAsciiUnits(options);
  return shared.ready();
}

export async function parseShape(input: string): Promise<AsciiUnitsTree | null> {
  return shared.parseShape(input);
}

export async function parse(
  input: string,
): Promise<ModelNode | Record<string, unknown> | null> {
  return shared.parse(input);
}

export async function tryParse(
  input: string,
): Promise<ReturnType<typeof mapTree> | null> {
  return shared.tryParse(input);
}

export async function artifactTestFailures(): Promise<string[]> {
  return shared.artifactTestFailures();
}

/** Async in the browser: resolves after the pinned artifact has verified. */
export async function artifactChecksum(): Promise<string> {
  return shared.artifactChecksum();
}
