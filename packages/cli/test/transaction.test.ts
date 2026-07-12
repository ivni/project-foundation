import { expect, test } from "bun:test";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  isRecoverableLinkPermissionError,
  TransactionRollbackError,
  withTransaction,
} from "../src/transaction.ts";
import { createTestWorkspace } from "./helpers.ts";

test("restores files, links, and missing paths when an operation fails", async () => {
  const workspace = await createTestWorkspace();
  const first = join(workspace.root, "first");
  const second = join(workspace.root, "second");
  const missing = join(workspace.root, "missing");
  const link = join(workspace.root, "link");
  try {
    await mkdir(first);
    await writeFile(join(first, "value.txt"), "before\n");
    await mkdir(second);
    await symlink(second, link, process.platform === "win32" ? "junction" : "dir");

    await expect(
      withTransaction([first, missing, link], async (transaction) => {
        await transaction.beforeMutation(first);
        await writeFile(join(first, "value.txt"), "after\n");
        await transaction.beforeMutation(missing);
        await mkdir(missing);
        await transaction.beforeMutation(link);
        await rm(link, { recursive: true, force: true });
        throw new Error("intentional failure");
      }),
    ).rejects.toThrow("intentional failure");

    expect(await readFile(join(first, "value.txt"), "utf8")).toBe("before\n");
    expect(await Bun.file(missing).exists()).toBe(false);
    expect(
      (await import("node:fs/promises")).lstat(link).then((entry) => entry.isSymbolicLink()),
    ).resolves.toBe(true);
  } finally {
    await workspace.cleanup();
  }
});

test("post-commit snapshot cleanup failure is only a warning", async () => {
  const workspace = await createTestWorkspace();
  const warnings: Error[] = [];
  try {
    const result = await withTransaction([], async () => "committed", {
      cleanup: async (directory) => {
        await rm(directory, { recursive: true, force: true });
        const error = new Error("snapshot locked") as NodeJS.ErrnoException;
        error.code = "EPERM";
        throw error;
      },
      onCleanupWarning: (error) => warnings.push(error),
    });
    expect(result).toBe("committed");
    expect(warnings.map((error) => error.message)).toEqual(["snapshot locked"]);
  } finally {
    await workspace.cleanup();
  }
});

test("cleanup failure cannot mask an operation failure or trigger link fallback", async () => {
  const operationError = new Error("link denied") as NodeJS.ErrnoException;
  operationError.code = "EPERM";
  let caught: unknown;
  try {
    await withTransaction(
      [],
      async () => {
        throw operationError;
      },
      {
        cleanup: async (directory) => {
          await rm(directory, { recursive: true, force: true });
          throw new Error("cleanup failed");
        },
      },
    );
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AggregateError);
  expect((caught as AggregateError).errors[0]).toBe(operationError);
  expect(isRecoverableLinkPermissionError(caught)).toBe(false);

  const rollbackFailure = new TransactionRollbackError([
    operationError,
    new Error("restore failed"),
  ]);
  expect(isRecoverableLinkPermissionError(rollbackFailure)).toBe(false);
  expect(isRecoverableLinkPermissionError(operationError)).toBe(true);
});

test("failed preconditions do not roll back concurrent changes captured by the transaction", async () => {
  const workspace = await createTestWorkspace();
  const target = join(workspace.root, "precondition-target");
  try {
    await mkdir(target);
    await writeFile(join(target, "value.txt"), "before\n");

    await expect(
      withTransaction(
        [target],
        async () => {
          throw new Error("action must not start");
        },
        {
          precondition: async () => {
            await writeFile(join(target, "value.txt"), "concurrent\n");
            throw new Error("state changed after preview");
          },
        },
      ),
    ).rejects.toThrow("state changed after preview");

    expect(await readFile(join(target, "value.txt"), "utf8")).toBe("concurrent\n");
  } finally {
    await workspace.cleanup();
  }
});

test("rollback leaves declared paths untouched until their first mutation", async () => {
  const workspace = await createTestWorkspace();
  const changedByTransaction = join(workspace.root, "changed-by-transaction");
  const changedConcurrently = join(workspace.root, "changed-concurrently");
  try {
    await Promise.all([mkdir(changedByTransaction), mkdir(changedConcurrently)]);
    await Promise.all([
      writeFile(join(changedByTransaction, "value.txt"), "before\n"),
      writeFile(join(changedConcurrently, "value.txt"), "before\n"),
    ]);

    await expect(
      withTransaction(
        [changedByTransaction, changedConcurrently],
        async (transaction) => {
          await transaction.beforeMutation(changedByTransaction);
          await writeFile(join(changedByTransaction, "value.txt"), "transaction\n");
          await writeFile(join(changedConcurrently, "value.txt"), "concurrent\n");
          await transaction.beforeMutation(changedConcurrently);
          throw new Error("unreachable");
        },
        {
          pathPrecondition: async (path) => {
            if ((await readFile(join(path, "value.txt"), "utf8")) !== "before\n") {
              throw new Error("path changed before its first mutation");
            }
          },
        },
      ),
    ).rejects.toThrow("path changed before its first mutation");

    expect(await readFile(join(changedByTransaction, "value.txt"), "utf8")).toBe("before\n");
    expect(await readFile(join(changedConcurrently, "value.txt"), "utf8")).toBe("concurrent\n");
  } finally {
    await workspace.cleanup();
  }
});
