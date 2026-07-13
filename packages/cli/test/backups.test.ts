import { expect, test } from "bun:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { getUserDataRoot } from "../src/agents.ts";
import {
  createBackup,
  deleteBackups,
  listBackups,
  selectBackupsForCleanup,
} from "../src/backups.ts";
import type { BackupRecord } from "../src/types.ts";
import { createTestWorkspace } from "./helpers.ts";

function backup(day: number): BackupRecord {
  return {
    path: `/backup/${day}`,
    skillId: "project-foundation",
    agent: "codex",
    scope: "user",
    version: "1.0.0",
    createdAt: new Date(Date.UTC(2026, 0, day)).toISOString(),
    bytes: day,
  };
}

test("backup cleanup presets are deterministic", () => {
  const backups = [backup(1), backup(2), backup(3), backup(4), backup(5)];
  expect(selectBackupsForCleanup(backups, "keep-all")).toEqual([]);
  expect(selectBackupsForCleanup(backups, "delete-all")).toHaveLength(5);
  expect(selectBackupsForCleanup(backups, "keep-three").map((entry) => entry.bytes)).toEqual([
    2, 1,
  ]);
  expect(
    selectBackupsForCleanup(backups, "older-than-30-days", new Date(Date.UTC(2026, 1, 10))),
  ).toHaveLength(5);
});

test("backup retention is isolated by skill", () => {
  const projectFoundation = [backup(1), backup(2), backup(3), backup(4)];
  const blindSpots = [1, 2, 3, 4].map((day) => ({
    ...backup(day + 10),
    skillId: "find-blind-spots" as const,
  }));
  const removals = selectBackupsForCleanup([...projectFoundation, ...blindSpots], "keep-three");
  expect(removals.map((entry) => [entry.skillId, entry.bytes])).toEqual([
    ["project-foundation", 1],
    ["find-blind-spots", 11],
  ]);
});

test("backup metadata cannot redirect cleanup outside the managed root", async () => {
  const workspace = await createTestWorkspace();
  const important = join(workspace.root, "important.txt");
  const backupDirectory = join(getUserDataRoot(workspace.context), "backups", "tampered");
  const schemaOneDirectory = join(getUserDataRoot(workspace.context), "backups", "schema-one");
  try {
    await Promise.all([
      mkdir(backupDirectory, { recursive: true }),
      mkdir(schemaOneDirectory, { recursive: true }),
    ]);
    await writeFile(important, "keep\n");
    await writeFile(
      join(backupDirectory, "backup.json"),
      JSON.stringify({
        path: important,
        skillId: "project-foundation",
        agent: "codex",
        scope: "user",
        version: "1.0.0",
        createdAt: "2026-01-01T00:00:00.000Z",
        bytes: 1,
      }),
    );
    await writeFile(
      join(schemaOneDirectory, "backup.json"),
      JSON.stringify({
        path: schemaOneDirectory,
        agent: "codex",
        scope: "user",
        version: "1.0.0",
        createdAt: "2026-01-01T00:00:00.000Z",
        bytes: 1,
      }),
    );

    const listed = await listBackups(workspace.context);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.path).toBe(backupDirectory);
    await deleteBackups(listed, workspace.context);
    expect(await readFile(important, "utf8")).toBe("keep\n");
    await expect(
      deleteBackups([{ ...backup(1), path: important }], workspace.context),
    ).rejects.toThrow("outside the backup root");
  } finally {
    await workspace.cleanup();
  }
});

test("backup names cannot escape through untrusted version text", async () => {
  const workspace = await createTestWorkspace();
  try {
    const record = await createBackup({
      source: workspace.payload,
      skillId: "project-foundation",
      agent: "codex",
      scope: "user",
      version: "0.9.0/../../../escaped\\payload",
      context: workspace.context,
      now: new Date("2026-01-02T03:04:05.000Z"),
    });
    const root = resolve(getUserDataRoot(workspace.context), "backups");
    const fromRoot = relative(root, resolve(record.path));
    expect(fromRoot.startsWith("..")).toBe(false);
    expect(record.path).toContain("0.9.0_.._.._.._escaped_payload");
    expect(await Bun.file(join(record.path, "skill", "SKILL.md")).exists()).toBe(true);
  } finally {
    await workspace.cleanup();
  }
});
