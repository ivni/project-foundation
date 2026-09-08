/**
 * `npm pack --json` changed shape in npm 12: what used to be an array of manifests is now an object
 * keyed by package name. The verifier reads both, because the npm that runs it is whatever the
 * contributor or the CI image happens to ship, and a shape it does not know must fail loudly rather
 * than report an empty file list as a clean package.
 */
export interface PackManifest {
  files: { path: string }[];
}

function asManifest(value: unknown): PackManifest {
  if (typeof value !== "object" || value === null) {
    throw new Error("npm pack returned an unexpected result.");
  }
  const files = (value as { files?: unknown }).files;
  if (!Array.isArray(files)) {
    throw new Error("npm pack did not return a file manifest.");
  }
  return {
    files: files.map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        throw new Error("npm pack returned an invalid file manifest entry.");
      }
      const path = (entry as { path?: unknown }).path;
      if (typeof path !== "string") {
        throw new Error("npm pack returned an invalid file manifest entry.");
      }
      return { path };
    }),
  };
}

/** The single manifest of `npm pack --json`, from either the npm ≤ 11 array or the npm 12 map. */
export function parsePackManifest(output: string): PackManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch (error) {
    throw new Error(
      `npm pack did not return JSON — ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (Array.isArray(parsed)) {
    if (parsed.length !== 1) throw new Error("npm pack returned an unexpected result.");
    return asManifest(parsed[0]);
  }
  if (typeof parsed === "object" && parsed !== null) {
    // Identified by the key being the manifest's own package name, not by the object happening to
    // have one key: any future single-key wrapper would otherwise be read as this shape.
    const entries = Object.entries(parsed as Record<string, unknown>);
    if (entries.length !== 1) throw new Error("npm pack returned an unexpected result.");
    const [key, value] = entries[0] as [string, unknown];
    const name =
      typeof value === "object" && value !== null ? (value as { name?: unknown }).name : undefined;
    if (name !== key) throw new Error("npm pack returned an unexpected result.");
    return asManifest(value);
  }
  throw new Error("npm pack returned an unexpected result.");
}

export function packedFilePaths(output: string): Set<string> {
  return new Set(parsePackManifest(output).files.map((entry) => entry.path));
}
