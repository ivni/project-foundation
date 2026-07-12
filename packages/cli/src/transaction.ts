import { cp, lstat, mkdir, mkdtemp, readlink, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

interface Snapshot {
  path: string;
  kind: "missing" | "link" | "entry";
  linkTarget?: string;
  backupPath?: string;
}

export class TransactionRollbackError extends AggregateError {
  constructor(errors: Error[]) {
    super(errors, "The operation failed and rollback was incomplete.");
    this.name = "TransactionRollbackError";
  }
}

export function isRecoverableLinkPermissionError(error: unknown): boolean {
  if (error instanceof AggregateError) return false;
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "EPERM" || code === "EACCES";
}

export interface TransactionController {
  beforeMutation: (path: string) => Promise<void>;
}

interface TransactionOptions {
  cleanup?: (directory: string) => Promise<void>;
  onCleanupWarning?: (error: Error) => void;
  precondition?: () => Promise<void>;
  pathPrecondition?: (path: string) => Promise<void>;
}

async function inspect(path: string): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
  try {
    return await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function capture(path: string, directory: string, index: number): Promise<Snapshot> {
  const stat = await inspect(path);
  if (!stat) return { path, kind: "missing" };
  if (stat.isSymbolicLink()) {
    return { path, kind: "link", linkTarget: await readlink(path) };
  }
  const backupPath = join(directory, `${index}-${basename(path)}`);
  await cp(path, backupPath, { recursive: true });
  return { path, kind: "entry", backupPath };
}

async function restore(snapshot: Snapshot): Promise<void> {
  await rm(snapshot.path, { recursive: true, force: true });
  if (snapshot.kind === "missing") return;
  await mkdir(dirname(snapshot.path), { recursive: true });
  if (snapshot.kind === "link") {
    if (!snapshot.linkTarget) throw new Error(`Missing link target for ${snapshot.path}`);
    await symlink(
      snapshot.linkTarget,
      snapshot.path,
      process.platform === "win32" ? "junction" : "dir",
    );
    return;
  }
  if (!snapshot.backupPath) throw new Error(`Missing backup for ${snapshot.path}`);
  await cp(snapshot.backupPath, snapshot.path, { recursive: true });
}

export async function withTransaction<T>(
  paths: string[],
  action: (transaction: TransactionController) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> {
  const uniquePaths = [...new Set(paths)];
  const directory = await mkdtemp(join(tmpdir(), "project-foundation-transaction-"));
  const snapshots: Snapshot[] = [];
  let result!: T;
  let failure: unknown;
  let actionStarted = false;
  const mutated = new Set<string>();
  const transaction: TransactionController = {
    beforeMutation: async (path) => {
      if (!uniquePaths.includes(path)) {
        throw new Error(`Transaction mutation was not declared: ${path}`);
      }
      if (mutated.has(path)) return;
      await options.pathPrecondition?.(path);
      mutated.add(path);
    },
  };
  try {
    for (const [index, path] of uniquePaths.entries()) {
      snapshots.push(await capture(path, directory, index));
    }
    await options.precondition?.();
    actionStarted = true;
    result = await action(transaction);
  } catch (error) {
    if (actionStarted) {
      const rollbackErrors: Error[] = [];
      for (const snapshot of snapshots.reverse().filter((entry) => mutated.has(entry.path))) {
        try {
          await restore(snapshot);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError as Error);
        }
      }
      if (rollbackErrors.length > 0) {
        failure = new TransactionRollbackError([error as Error, ...rollbackErrors]);
      } else {
        failure = error;
      }
    } else {
      failure = error;
    }
  }

  try {
    await (options.cleanup ?? ((path) => rm(path, { recursive: true, force: true })))(directory);
  } catch (cleanupError) {
    const error = cleanupError as Error;
    if (failure instanceof TransactionRollbackError) {
      failure = new TransactionRollbackError([...failure.errors, error] as Error[]);
    } else if (failure) {
      failure = new AggregateError(
        [failure as Error, error],
        "The operation failed and transaction snapshot cleanup also failed.",
      );
    } else if (options.onCleanupWarning) {
      options.onCleanupWarning(error);
    } else {
      process.emitWarning(`Transaction snapshot cleanup failed: ${error.message}`);
    }
  }

  if (failure) throw failure;
  return result;
}
