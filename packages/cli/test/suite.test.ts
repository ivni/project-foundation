import { expect, test } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { combinePreparedOperations } from "../src/suite.ts";
import { withTransaction } from "../src/transaction.ts";
import type { PreparedOperation } from "../src/types.ts";
import { createTestWorkspace } from "./helpers.ts";

test("rolls back earlier skill operations when a later skill fails", async () => {
  const workspace = await createTestWorkspace();
  const first = join(workspace.root, "first.txt");
  const second = join(workspace.root, "second.txt");
  try {
    await Promise.all([writeFile(first, "before-one\n"), writeFile(second, "before-two\n")]);

    const operations: PreparedOperation[] = [
      {
        preview: [{ action: "update", path: first, detail: "First skill" }],
        execute: async () => {
          await writeFile(first, "after-one\n");
          return { changed: [first], skipped: [], backups: [], notes: [] };
        },
      },
      {
        preview: [{ action: "update", path: second, detail: "Second skill" }],
        execute: () =>
          withTransaction([second], async (transaction) => {
            await transaction.beforeMutation(second);
            await writeFile(second, "after-two\n");
            throw new Error("later skill failed");
          }),
      },
    ];

    await expect(combinePreparedOperations(operations).execute()).rejects.toThrow(
      "later skill failed",
    );
    expect(await readFile(first, "utf8")).toBe("before-one\n");
    expect(await readFile(second, "utf8")).toBe("before-two\n");
  } finally {
    await workspace.cleanup();
  }
});

test("does not overwrite a concurrent change in a not-yet-committed skill", async () => {
  const workspace = await createTestWorkspace();
  const first = join(workspace.root, "first.txt");
  const second = join(workspace.root, "second.txt");
  try {
    await Promise.all([writeFile(first, "before-one\n"), writeFile(second, "before-two\n")]);
    const combined = combinePreparedOperations([
      {
        preview: [{ action: "update", path: first, detail: "First skill" }],
        execute: async () => {
          await writeFile(first, "after-one\n");
          return { changed: [first], skipped: [], backups: [], notes: [] };
        },
      },
      {
        preview: [{ action: "update", path: second, detail: "Second skill" }],
        execute: async () => {
          await writeFile(second, "concurrent\n");
          throw new Error("state changed before the second skill started");
        },
      },
    ]);

    await expect(combined.execute()).rejects.toThrow("state changed");
    expect(await readFile(first, "utf8")).toBe("before-one\n");
    expect(await readFile(second, "utf8")).toBe("concurrent\n");
  } finally {
    await workspace.cleanup();
  }
});

test("combines successful skill results and rejects a second execution", async () => {
  const workspace = await createTestWorkspace();
  const first = join(workspace.root, "first.txt");
  const second = join(workspace.root, "second.txt");
  try {
    const combined = combinePreparedOperations([
      {
        preview: [{ action: "create", path: first, detail: "First skill" }],
        execute: async () => {
          await writeFile(first, "one\n");
          return { changed: [first], skipped: [], backups: [], notes: ["shared"] };
        },
      },
      {
        preview: [{ action: "create", path: second, detail: "Second skill" }],
        execute: async () => {
          await writeFile(second, "two\n");
          return { changed: [second], skipped: [], backups: [], notes: ["shared"] };
        },
      },
    ]);

    expect(await combined.execute()).toMatchObject({
      changed: [first, second],
      notes: ["shared"],
    });
    await expect(combined.execute()).rejects.toThrow("already executed");
  } finally {
    await workspace.cleanup();
  }
});
