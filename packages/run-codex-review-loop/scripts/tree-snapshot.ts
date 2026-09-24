import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readlinkSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const DIGEST_PREFIX = "v2:";
export const TREE_DIGEST_COVERS =
  "tracked status and binary diff; non-ignored untracked paths, types, executable bits and contents (symlink targets only)";

export interface TreeSnapshot {
  head: string | null;
  digest: string | null;
  limitation: string | null;
  exclusions: { git_ignore: boolean; untracked_artifact_directories: string[] };
}

/** Legacy or missing snapshots cannot establish whether files changed. */
export function compareTreeDigests(
  previous: string | null,
  current: string | null,
): boolean | null {
  if (!previous?.startsWith(DIGEST_PREFIX) || !current?.startsWith(DIGEST_PREFIX)) return null;
  return previous !== current;
}

function isWithin(directory: string, path: string): boolean {
  const pathFromDirectory = relative(directory, path);
  return (
    pathFromDirectory === "" ||
    (!isAbsolute(pathFromDirectory) &&
      pathFromDirectory !== ".." &&
      !pathFromDirectory.startsWith(`..${sep}`))
  );
}

/** Read-only inspection: never execute a Git binary supplied by the reviewed repository. */
function gitOutput(repositoryRoot: string, args: string[]): string | null {
  const executable = Bun.which("git");
  if (executable === null || isWithin(repositoryRoot, resolve(executable))) return null;
  try {
    const result = Bun.spawnSync([executable, "--no-optional-locks", ...args], {
      cwd: repositoryRoot,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 60_000,
      killSignal: "SIGKILL",
    });
    // Git can skip unreadable directories with exit code 0 and only a warning.
    if (result.exitedDueToTimeout || result.exitCode !== 0 || result.stderr.length > 0) return null;
    return result.stdout.toString();
  } catch {
    return null;
  }
}

/** Bun realpath on Windows may return an extended-length path; Git returns a normal path. */
function normalizePath(path: string): string {
  const regular =
    process.platform === "win32"
      ? path.replace(/^\\\\\?\\UNC\\/i, "\\\\").replace(/^\\\\\?\\/, "")
      : path;
  return resolve(regular);
}

/** Resolve existing symlink ancestors even before the run-state directory has been created. */
function canonicalPath(path: string): string {
  try {
    return normalizePath(realpathSync(path));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" || dirname(path) === path) throw error;
    return join(canonicalPath(dirname(path)), basename(path));
  }
}

/** Artifact exclusions apply only to untracked files, never to tracked changes. */
export function readTreeSnapshot(
  repositoryRoot: string,
  artifactDirectories: string[] = [],
): TreeSnapshot {
  const head = gitOutput(repositoryRoot, ["rev-parse", "HEAD"])?.trim() ?? null;
  const exclusions: TreeSnapshot["exclusions"] = {
    git_ignore: true,
    untracked_artifact_directories: [],
  };
  const failure = (limitation: string): TreeSnapshot => ({
    head,
    digest: null,
    limitation,
    exclusions,
  });
  const topLevel = gitOutput(repositoryRoot, ["rev-parse", "--show-toplevel"])?.trim();
  if (!topLevel) return failure("could not determine the Git working-tree root");
  let root: string;
  let excluded: string[];
  try {
    root = normalizePath(realpathSync(topLevel));
    // Deduplicate by repository-relative paths: Windows realpath may change drive casing.
    const paths = artifactDirectories
      .flatMap((path) => {
        const absolute = normalizePath(path);
        return [absolute, canonicalPath(absolute)];
      })
      .filter((path) => isWithin(root, path))
      .map((path) => relative(root, path))
      .filter((path) => path !== "");
    excluded = [...new Set(paths)].sort().map((path) => resolve(root, path));
  } catch {
    return failure("could not resolve the working-tree root or artifact directories");
  }
  exclusions.untracked_artifact_directories = excluded.map((path) => relative(root, path));
  const status = gitOutput(root, ["status", "--porcelain=v1", "-z", "--untracked-files=no"]);
  const diffArgs = [
    "diff",
    "--binary",
    "--no-ext-diff",
    "--no-textconv",
    "--ignore-submodules=none",
  ];
  const diff = gitOutput(root, head === null ? diffArgs : [...diffArgs, "HEAD", "--"]);
  const staged = gitOutput(root, [...diffArgs, "--cached", "--"]);
  const untracked = gitOutput(root, ["ls-files", "--others", "--exclude-standard", "-z"]);
  if (status === null || diff === null || staged === null || untracked === null) {
    return failure(
      "Git could not inspect the complete working tree (command failure or diagnostic warning)",
    );
  }
  const hash = createHash("sha256");
  // Length-prefix every field so file boundaries and unusual paths stay unambiguous.
  const add = (value: string | Buffer) => {
    const bytes = typeof value === "string" ? Buffer.from(value) : value;
    hash.update(`${bytes.length}:`).update(bytes);
  };
  add(DIGEST_PREFIX);
  add(JSON.stringify(exclusions));
  add(status);
  add(diff);
  add(staged);
  for (const path of untracked.split("\0").filter(Boolean).sort()) {
    const absolute = resolve(root, path);
    if (excluded.some((directory) => isWithin(directory, absolute))) continue;
    try {
      const stat = lstatSync(absolute);
      add(path);
      if (stat.isSymbolicLink()) {
        add("symlink");
        add(readlinkSync(absolute, { encoding: "buffer" }));
      } else if (stat.isFile()) {
        add("file");
        add((stat.mode & 0o100) !== 0 ? "executable" : "non-executable");
        add(readFileSync(absolute));
      } else {
        return failure(`unsupported untracked file type: ${path}`);
      }
    } catch {
      return failure(`could not read untracked path: ${path}`);
    }
  }
  return { head, digest: `${DIGEST_PREFIX}${hash.digest("hex")}`, limitation: null, exclusions };
}
