import { createHash, randomUUID } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  readdir,
  readFile,
  readlink,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { isSkillId } from "./skills.ts";
import type { AgentId, Receipt, Scope, SkillId, Strategy } from "./types.ts";
import { AGENT_IDS } from "./types.ts";
import { isSemanticVersion } from "./version.ts";

export const RECEIPT_FILE = ".project-foundation.json";
const REQUIRED_PAYLOAD_ENTRIES = ["SKILL.md"] as const;
const OPTIONAL_PAYLOAD_ENTRIES = [
  "agents",
  "assets",
  "references",
  "scripts",
  "templates",
] as const;

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function packagedEntries(root: string): Promise<string[]> {
  const entries: string[] = [];
  for (const entry of REQUIRED_PAYLOAD_ENTRIES) {
    if (!(await pathExists(join(root, entry)))) {
      throw new Error(`Published payload is missing ${entry}.`);
    }
    entries.push(entry);
  }
  for (const entry of OPTIONAL_PAYLOAD_ENTRIES) {
    if (await pathExists(join(root, entry))) entries.push(entry);
  }
  return entries;
}

function normalizeRelativePath(path: string): string {
  return path.split(sep).join("/");
}

async function collectFiles(
  root: string,
  current = root,
  symlinks: "reject" | "record" = "record",
): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (current === root && entry.name === RECEIPT_FILE) continue;
    const absolute = join(current, entry.name);
    if (entry.isSymbolicLink()) {
      if (symlinks === "reject") {
        throw new Error(`Published payload must not contain symbolic links: ${absolute}`);
      }
      files.push(normalizeRelativePath(relative(root, absolute)));
      continue;
    }
    if (entry.isDirectory()) {
      files.push(`${normalizeRelativePath(relative(root, absolute))}/`);
      files.push(...(await collectFiles(root, absolute, symlinks)));
    } else {
      files.push(normalizeRelativePath(relative(root, absolute)));
    }
  }
  return files;
}

export async function hashFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  hash.update(await readFile(path));
  return hash.digest("hex");
}

async function hashEntry(root: string, path: string): Promise<string> {
  const absolute = join(root, ...path.replace(/\/$/, "").split("/"));
  const entry = await lstat(absolute);
  const hash = createHash("sha256");
  if (entry.isSymbolicLink()) {
    hash.update("symbolic-link\0");
    hash.update(await readlink(absolute));
  } else if (entry.isDirectory()) {
    hash.update("directory\0");
  } else if (entry.isFile()) {
    return hashFile(absolute);
  } else {
    hash.update(`other\0${entry.mode}\0${entry.size}`);
  }
  return hash.digest("hex");
}

export async function snapshotPayload(root: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  for (const path of await collectFiles(root, root, "record")) {
    files[path] = await hashEntry(root, path);
  }
  return files;
}

export async function snapshotPackagedPayload(root: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  for (const entry of await packagedEntries(root)) {
    const entryRoot = join(root, entry);
    const stat = await lstat(entryRoot);
    if (stat.isSymbolicLink()) {
      throw new Error(`Published payload must not contain symbolic links: ${entryRoot}`);
    }
    if (stat.isFile()) {
      files[entry] = await hashFile(entryRoot);
      continue;
    }
    files[`${entry}/`] = await hashEntry(root, `${entry}/`);
    for (const path of await collectFiles(root, entryRoot, "reject")) {
      files[path] = await hashEntry(root, path);
    }
  }
  return files;
}

export function hashSnapshot(files: Record<string, string>): string {
  const hash = createHash("sha256");
  for (const [path, digest] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    hash.update(path);
    hash.update("\0");
    hash.update(digest);
    hash.update("\n");
  }
  return hash.digest("hex");
}

export function createReceipt(options: {
  version: string;
  scope: Scope;
  strategy: Strategy;
  intendedAgents: AgentId[];
  files: Record<string, string>;
  skillId: SkillId;
}): Receipt {
  if (!isSemanticVersion(options.version)) {
    throw new Error(`Cannot create a receipt with invalid SemVer: ${options.version}`);
  }
  return {
    kind: "project-foundation-installation",
    schema: 2,
    package: "@ivni/project-foundation",
    skillId: options.skillId,
    version: options.version,
    scope: options.scope,
    strategy: options.strategy,
    intendedAgents: [...new Set(options.intendedAgents)].sort(),
    payloadHash: hashSnapshot(options.files),
    files: Object.fromEntries(Object.entries(options.files).sort(([a], [b]) => a.localeCompare(b))),
  };
}

export function isReceipt(value: unknown): value is Receipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<Receipt>;
  const intendedAgents = receipt.intendedAgents;
  const files = receipt.files;
  return (
    receipt.kind === "project-foundation-installation" &&
    receipt.schema === 2 &&
    receipt.package === "@ivni/project-foundation" &&
    isSkillId(receipt.skillId) &&
    typeof receipt.version === "string" &&
    isSemanticVersion(receipt.version) &&
    (receipt.scope === "user" || receipt.scope === "project") &&
    (receipt.strategy === "copy" || receipt.strategy === "link") &&
    Array.isArray(intendedAgents) &&
    intendedAgents.length > 0 &&
    new Set(intendedAgents).size === intendedAgents.length &&
    intendedAgents.every(
      (agent) => typeof agent === "string" && AGENT_IDS.includes(agent as AgentId),
    ) &&
    typeof receipt.payloadHash === "string" &&
    /^[a-f0-9]{64}$/.test(receipt.payloadHash) &&
    Boolean(files) &&
    typeof files === "object" &&
    !Array.isArray(files) &&
    typeof files["SKILL.md"] === "string" &&
    Object.entries(files).every(([path, digest]) => {
      const normalized = path.endsWith("/") ? path.slice(0, -1) : path;
      return (
        normalized.length > 0 &&
        !normalized.startsWith("/") &&
        !normalized.includes("\\") &&
        !normalized.split("/").some((segment) => !segment || segment === "." || segment === "..") &&
        typeof digest === "string" &&
        /^[a-f0-9]{64}$/.test(digest)
      );
    }) &&
    hashSnapshot(files) === receipt.payloadHash
  );
}

export async function readReceipt(root: string): Promise<Receipt | undefined> {
  try {
    const value: unknown = JSON.parse(await readFile(join(root, RECEIPT_FILE), "utf8"));
    return isReceipt(value) ? value : undefined;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || error instanceof SyntaxError) return undefined;
    throw error;
  }
}

export async function writeReceipt(root: string, receipt: Receipt): Promise<void> {
  await writeFile(join(root, RECEIPT_FILE), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

export async function materializePayload(
  payloadRoot: string,
  destination: string,
  receipt: Receipt,
): Promise<void> {
  const parent = dirname(destination);
  const temporary = join(parent, `.${basename(destination)}.stage-${randomUUID()}`);
  await mkdir(parent, { recursive: true });
  await rm(temporary, { recursive: true, force: true });
  await mkdir(temporary, { recursive: true });
  try {
    for (const entry of await packagedEntries(payloadRoot)) {
      const source = join(payloadRoot, entry);
      await cp(source, join(temporary, entry), { recursive: true, errorOnExist: true });
    }
    await writeReceipt(temporary, receipt);
    await rm(destination, { recursive: true, force: true });
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

export async function payloadMatches(
  root: string,
  expected: Record<string, string>,
): Promise<boolean> {
  try {
    const current = await snapshotPayload(root);
    return hashSnapshot(current) === hashSnapshot(expected);
  } catch {
    return false;
  }
}

export function resolvePublishedPayloadRoot(skillId: SkillId): string {
  const candidates = [
    resolve(import.meta.dir, "..", "packages", skillId),
    resolve(import.meta.dir, "..", "..", skillId),
  ];
  for (const candidate of candidates) {
    if (Bun.file(join(candidate, "SKILL.md")).size > 0) return candidate;
  }
  throw new Error(`Could not locate the bundled ${skillId} payload from ${import.meta.dir}.`);
}
