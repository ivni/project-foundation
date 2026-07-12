import { cp, lstat, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { AGENTS, getUserDataRoot } from "./agents.ts";
import type { AgentId, BackupRecord, RuntimeContext, Scope } from "./types.ts";

const METADATA_FILE = "backup.json";

async function directorySize(path: string): Promise<number> {
  const entry = await lstat(path);
  if (entry.isFile()) return entry.size;
  if (entry.isSymbolicLink()) return 0;
  let bytes = 0;
  for (const child of await readdir(path)) bytes += await directorySize(join(path, child));
  return bytes;
}

function safeTimestamp(date: Date): string {
  return date.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function safeSegment(value: string): string {
  const sanitized = value.replaceAll(/[^0-9A-Za-z._-]/g, "_");
  return sanitized === "." || sanitized === ".." || sanitized.length === 0 ? "_" : sanitized;
}

function containedChild(root: string, name: string): string {
  const destination = resolve(root, name);
  const fromRoot = relative(resolve(root), destination);
  if (!fromRoot || fromRoot.startsWith("..") || resolve(root, fromRoot) !== destination) {
    throw new Error(`Refusing to create a backup outside the backup root: ${destination}`);
  }
  return destination;
}

export async function createBackup(options: {
  source: string;
  agent: AgentId;
  scope: Scope;
  version: string;
  context: RuntimeContext;
  now?: Date;
}): Promise<BackupRecord> {
  const createdAt = (options.now ?? new Date()).toISOString();
  const root = join(getUserDataRoot(options.context), "backups");
  const destination = containedChild(
    root,
    [
      safeTimestamp(new Date(createdAt)),
      safeSegment(options.agent),
      safeSegment(options.scope),
      safeSegment(options.version),
    ].join("-"),
  );
  await mkdir(destination, { recursive: true });
  await cp(options.source, join(destination, "skill"), { recursive: true });
  const bytes = await directorySize(join(destination, "skill"));
  const record: BackupRecord = {
    path: destination,
    agent: options.agent,
    scope: options.scope,
    version: options.version,
    createdAt,
    bytes,
  };
  await writeFile(join(destination, METADATA_FILE), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

export async function listBackups(context: RuntimeContext): Promise<BackupRecord[]> {
  const root = join(getUserDataRoot(context), "backups");
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const records: BackupRecord[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const value = JSON.parse(await readFile(join(root, entry.name, METADATA_FILE), "utf8"));
        if (value && typeof value.createdAt === "string" && typeof value.bytes === "number") {
          records.push({ ...(value as BackupRecord), path: join(root, entry.name) });
        }
      } catch {
        // Ignore incomplete backup entries. They remain user-owned.
      }
    }
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export type CleanupPreset = "keep-all" | "keep-three" | "older-than-30-days" | "delete-all";

export function selectBackupsForCleanup(
  backups: BackupRecord[],
  preset: CleanupPreset,
  now = new Date(),
): BackupRecord[] {
  if (preset === "keep-all") return [];
  if (preset === "delete-all") return backups;
  if (preset === "older-than-30-days") {
    const threshold = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    return backups.filter((backup) => new Date(backup.createdAt).getTime() < threshold);
  }

  const groups = new Map<string, BackupRecord[]>();
  for (const backup of backups) {
    const key = `${backup.agent}:${backup.scope}`;
    const current = groups.get(key) ?? [];
    current.push(backup);
    groups.set(key, current);
  }
  return [...groups.values()].flatMap((group) =>
    group.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(3),
  );
}

export async function deleteBackups(
  backups: BackupRecord[],
  context: RuntimeContext,
): Promise<void> {
  const root = resolve(getUserDataRoot(context), "backups");
  for (const backup of backups) {
    const path = resolve(backup.path);
    const fromRoot = relative(root, path);
    if (!fromRoot || fromRoot.startsWith("..") || resolve(root, fromRoot) !== path) {
      throw new Error(`Refusing to remove a path outside the backup root: ${path}`);
    }
    await rm(path, { recursive: true, force: true });
  }
}

export function describeBackup(backup: BackupRecord): string {
  return `${AGENTS[backup.agent].label} ${backup.scope} ${backup.version}`;
}
