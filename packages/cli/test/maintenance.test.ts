import { expect, test } from "bun:test";
import { mkdir, readFile, realpath, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getManagedStore, getTargetPath } from "../src/agents.ts";
import type { InstallationConfiguration } from "../src/maintenance.ts";
import { discoverConfigurations, getMaintenanceCatalog } from "../src/maintenance.ts";
import { installSkill, prepareMaintainSkill } from "../src/operations.ts";
import { readReceipt } from "../src/payload.ts";
import { SKILL_IDS } from "../src/skills.ts";
import { combinePreparedOperations } from "../src/suite.ts";
import { createTestWorkspace } from "./helpers.ts";

const configuration: InstallationConfiguration = {
  key: "test",
  scope: "user",
  agents: ["codex"],
  strategy: "copy",
};

test("first installation preselects additions; existing installations preselect only updates", async () => {
  const workspace = await createTestWorkspace();
  try {
    const fresh = await getMaintenanceCatalog(
      workspace.context,
      configuration,
      () => workspace.payload,
    );
    expect(fresh.actions).toHaveLength(SKILL_IDS.length);
    expect(fresh.initialValues).toHaveLength(SKILL_IDS.length);
    await installSkill({
      skillId: "project-foundation",
      agents: ["codex"],
      scope: "user",
      strategy: "copy",
      context: workspace.context,
    });
    workspace.context.version = "1.1.0";
    const existing = await getMaintenanceCatalog(
      workspace.context,
      configuration,
      () => workspace.payload,
    );
    expect(existing.actions.filter((action) => action.kind === "update")).toHaveLength(1);
    expect(existing.actions.filter((action) => action.kind === "add")).toHaveLength(
      SKILL_IDS.length - 1,
    );
    expect(existing.initialValues).toEqual(
      existing.actions.filter((action) => action.kind === "update").map((action) => action.key),
    );
  } finally {
    await workspace.cleanup();
  }
});

test("current installations still offer absent skills without selecting previously omitted skills", async () => {
  const workspace = await createTestWorkspace();
  try {
    await installSkill({
      skillId: "project-foundation",
      agents: ["codex"],
      scope: "user",
      strategy: "copy",
      context: workspace.context,
    });
    const catalog = await getMaintenanceCatalog(
      workspace.context,
      configuration,
      () => workspace.payload,
    );
    expect(catalog.current).toHaveLength(1);
    expect(catalog.initialValues).toEqual([]);
    expect(
      catalog.actions.some((action) => action.skillId === "plan-feature" && action.kind === "add"),
    ).toBe(true);
    expect(catalog.actions.some((action) => action.skillId === "project-foundation")).toBe(false);
  } finally {
    await workspace.cleanup();
  }
});

test("discovers reusable user and project configurations with their original methods and agents", async () => {
  const workspace = await createTestWorkspace();
  try {
    await installSkill({
      skillId: "project-foundation",
      agents: ["claude", "codex"],
      scope: "user",
      strategy: "link",
      context: workspace.context,
    });
    await installSkill({
      skillId: "find-blind-spots",
      agents: ["codex", "claude"],
      scope: "user",
      strategy: "link",
      context: workspace.context,
    });
    await installSkill({
      skillId: "teach",
      agents: ["pi"],
      scope: "project",
      projectRoot: workspace.project,
      strategy: "copy",
      context: workspace.context,
    });
    const configurations = await discoverConfigurations(workspace.context, workspace.project);
    expect(configurations).toHaveLength(2);
    expect(configurations[0]).toMatchObject({
      scope: "user",
      agents: ["codex", "claude"],
      strategy: "link",
    });
    expect(configurations[1]).toMatchObject({
      scope: "project",
      agents: ["pi"],
      strategy: "copy",
      projectRoot: workspace.project,
    });
  } finally {
    await workspace.cleanup();
  }
});

test("uses actual agent discovery coverage and excludes unrelated newer installations", async () => {
  const workspace = await createTestWorkspace();
  try {
    await installSkill({
      skillId: "project-foundation",
      agents: ["codex"],
      scope: "user",
      strategy: "copy",
      context: workspace.context,
    });
    workspace.context.version = "2.0.0";
    await installSkill({
      skillId: "teach",
      agents: ["claude"],
      scope: "user",
      strategy: "copy",
      context: workspace.context,
    });
    workspace.context.version = "1.1.0";
    const catalog = await getMaintenanceCatalog(
      workspace.context,
      { ...configuration, agents: ["opencode"] },
      () => workspace.payload,
    );
    expect(catalog.newer).toHaveLength(1); // OpenCode also discovers Claude's skills.
    expect(
      catalog.actions.some(
        (action) => action.kind === "add" && action.skillId === "project-foundation",
      ),
    ).toBe(false);
    const target = getTargetPath("codex", "user", workspace.context, "project-foundation");
    const prepared = await prepareMaintainSkill({
      skillId: "project-foundation",
      agents: [],
      updateGroupIds: [target],
      scope: "user",
      strategy: "link",
      context: workspace.context,
    });
    await prepared.execute();
    expect(await readReceipt(target)).toMatchObject({ version: "1.1.0", strategy: "copy" });
    expect(
      await readReceipt(getTargetPath("claude", "user", workspace.context, "teach")),
    ).toMatchObject({ version: "2.0.0" });
  } finally {
    await workspace.cleanup();
  }
});

test("groups independent copy roots so one configuration updates every original agent", async () => {
  const workspace = await createTestWorkspace();
  try {
    await installSkill({
      skillId: "project-foundation",
      agents: ["codex", "claude"],
      scope: "user",
      strategy: "copy",
      context: workspace.context,
    });
    const configurations = await discoverConfigurations(workspace.context, workspace.project);
    expect(configurations).toHaveLength(1);
    expect(configurations[0]?.agents).toEqual(["codex", "claude"]);
    workspace.context.version = "1.1.0";
    const catalog = await getMaintenanceCatalog(
      workspace.context,
      configurations[0] as InstallationConfiguration,
      () => workspace.payload,
    );
    const updates = catalog.actions.filter((action) => action.kind === "update");
    expect(updates).toHaveLength(2);
    expect(catalog.initialValues).toHaveLength(2);
    const prepared = await prepareMaintainSkill({
      skillId: "project-foundation",
      agents: [],
      updateGroupIds: updates.map((action) => action.group.id),
      scope: "user",
      strategy: "copy",
      context: workspace.context,
    });
    expect((await prepared.execute()).maintenance).toEqual({ updated: 2, added: 0, skipped: 0 });
    for (const agent of ["codex", "claude"] as const) {
      expect(
        await readReceipt(getTargetPath(agent, "user", workspace.context, "project-foundation")),
      ).toMatchObject({ version: "1.1.0" });
    }
  } finally {
    await workspace.cleanup();
  }
});

test("updates and adds links when the data directory is reached through a symlink", async () => {
  const workspace = await createTestWorkspace();
  try {
    const physicalData = join(workspace.root, "physical-data");
    const alias = join(workspace.root, "data-alias");
    await mkdir(physicalData);
    await symlink(physicalData, alias, process.platform === "win32" ? "junction" : "dir");
    workspace.context.env.XDG_DATA_HOME = alias;
    workspace.context.env.LOCALAPPDATA = alias;
    await installSkill({
      skillId: "project-foundation",
      agents: ["codex"],
      scope: "user",
      strategy: "link",
      context: workspace.context,
    });
    const root = await realpath(getManagedStore("user", workspace.context, "project-foundation"));
    workspace.context.version = "1.1.0";
    const prepared = await prepareMaintainSkill({
      skillId: "project-foundation",
      agents: ["claude"],
      updateGroupIds: [root],
      scope: "user",
      strategy: "link",
      context: workspace.context,
    });
    expect((await prepared.execute()).maintenance).toEqual({ updated: 1, added: 1, skipped: 0 });
    expect(await readReceipt(root)).toMatchObject({
      version: "1.1.0",
      intendedAgents: ["claude", "codex"],
    });
  } finally {
    await workspace.cleanup();
  }
});

test.each([
  "copy",
  "link",
] as const)("updates and adds agents to the same skill in one %s transaction", async (strategy) => {
  const workspace = await createTestWorkspace();
  try {
    await installSkill({
      skillId: "project-foundation",
      agents: ["codex"],
      scope: "user",
      strategy,
      context: workspace.context,
    });
    const root =
      strategy === "link"
        ? getManagedStore("user", workspace.context, "project-foundation")
        : getTargetPath("codex", "user", workspace.context, "project-foundation");
    workspace.context.version = "1.1.0";
    await writeFile(join(workspace.payload, "SKILL.md"), "Updated packaged skill.\n");
    const prepared = await prepareMaintainSkill({
      skillId: "project-foundation",
      agents: ["claude"],
      updateGroupIds: [root],
      scope: "user",
      strategy,
      context: workspace.context,
    });
    expect(await readFile(join(root, "SKILL.md"), "utf8")).toContain("Version one");
    const result = await prepared.execute();
    const added = getTargetPath("claude", "user", workspace.context, "project-foundation");
    expect(await readFile(join(root, "SKILL.md"), "utf8")).toBe("Updated packaged skill.\n");
    expect(await readFile(join(added, "SKILL.md"), "utf8")).toBe("Updated packaged skill.\n");
    expect(await readReceipt(root)).toMatchObject({ version: "1.1.0", strategy });
    expect(await readReceipt(added)).toMatchObject({ version: "1.1.0", strategy });
    if (strategy === "link")
      expect((await readReceipt(root))?.intendedAgents).toEqual(["claude", "codex"]);
    expect(result.maintenance).toEqual({ updated: 1, added: 1, skipped: 0 });
    await expect(prepared.execute()).rejects.toThrow("already executed");
  } finally {
    await workspace.cleanup();
  }
});

test("keeps an unchecked update while adding another agent without changing the existing method", async () => {
  const workspace = await createTestWorkspace();
  try {
    await installSkill({
      skillId: "project-foundation",
      agents: ["codex"],
      scope: "user",
      strategy: "copy",
      context: workspace.context,
    });
    const original = getTargetPath("codex", "user", workspace.context, "project-foundation");
    workspace.context.version = "1.1.0";
    const prepared = await prepareMaintainSkill({
      skillId: "project-foundation",
      agents: ["claude"],
      updateGroupIds: [],
      scope: "user",
      strategy: "link",
      context: workspace.context,
    });
    const result = await prepared.execute();
    expect(await readReceipt(original)).toMatchObject({ version: "1.0.0", strategy: "copy" });
    expect(
      await readReceipt(getTargetPath("claude", "user", workspace.context, "project-foundation")),
    ).toMatchObject({ version: "1.1.0", strategy: "link" });
    expect(result.maintenance).toEqual({ updated: 0, added: 1, skipped: 0 });
  } finally {
    await workspace.cleanup();
  }
});

test.each([
  "skip",
  "backup-replace",
] as const)("respects local changes with %s in a shared update/add plan", async (decision) => {
  const workspace = await createTestWorkspace();
  try {
    await installSkill({
      skillId: "project-foundation",
      agents: ["codex"],
      scope: "user",
      strategy: "link",
      context: workspace.context,
    });
    const root = getManagedStore("user", workspace.context, "project-foundation");
    await writeFile(join(root, "SKILL.md"), "Local changes.\n");
    workspace.context.version = "2.0.0";
    const prepared = await prepareMaintainSkill({
      skillId: "project-foundation",
      agents: ["claude"],
      updateGroupIds: [root],
      scope: "user",
      strategy: "link",
      context: workspace.context,
      hooks: { onModifiedUpdate: async () => decision },
    });
    expect(prepared.breaking).toBe(decision === "backup-replace");
    const result = await prepared.execute();
    if (decision === "skip") {
      expect(await readFile(join(root, "SKILL.md"), "utf8")).toBe("Local changes.\n");
      expect(
        await Bun.file(
          join(
            getTargetPath("claude", "user", workspace.context, "project-foundation"),
            "SKILL.md",
          ),
        ).exists(),
      ).toBe(false);
      expect(result.maintenance).toEqual({ updated: 0, added: 0, skipped: 2 });
    } else {
      expect(result.backups).toHaveLength(1);
      expect(await readFile(join(result.backups[0]?.path ?? "", "skill", "SKILL.md"), "utf8")).toBe(
        "Local changes.\n",
      );
      expect(result.maintenance).toEqual({ updated: 1, added: 1, skipped: 0 });
    }
  } finally {
    await workspace.cleanup();
  }
});

test("keeps current local modifications when offering an addition to a shared store", async () => {
  const workspace = await createTestWorkspace();
  try {
    await installSkill({
      skillId: "project-foundation",
      agents: ["codex"],
      scope: "user",
      strategy: "link",
      context: workspace.context,
    });
    const root = getManagedStore("user", workspace.context, "project-foundation");
    await writeFile(join(root, "SKILL.md"), "Local changes.\n");
    const prepared = await prepareMaintainSkill({
      skillId: "project-foundation",
      agents: ["claude"],
      updateGroupIds: [],
      scope: "user",
      strategy: "link",
      context: workspace.context,
    });
    const result = await prepared.execute();
    expect(result.changed).toEqual([]);
    expect(prepared.preview.every((entry) => entry.action === "skip")).toBe(true);
    expect(result.skipped).toContain(
      getTargetPath("claude", "user", workspace.context, "project-foundation"),
    );
    expect(result.maintenance).toEqual({ updated: 0, added: 0, skipped: 1 });
    expect(await readFile(join(root, "SKILL.md"), "utf8")).toBe("Local changes.\n");
  } finally {
    await workspace.cleanup();
  }
});

test("a later failure never rolls back concurrent edits in a kept shared store", async () => {
  const workspace = await createTestWorkspace();
  try {
    await installSkill({
      skillId: "project-foundation",
      agents: ["codex"],
      scope: "user",
      strategy: "link",
      context: workspace.context,
    });
    const root = getManagedStore("user", workspace.context, "project-foundation");
    await writeFile(join(root, "SKILL.md"), "Local changes.\n");
    const kept = await prepareMaintainSkill({
      skillId: "project-foundation",
      agents: ["claude"],
      updateGroupIds: [],
      scope: "user",
      strategy: "link",
      context: workspace.context,
    });
    const later = {
      preview: [],
      execute: async () => {
        await writeFile(join(root, "SKILL.md"), "Concurrent edits.\n");
        throw new Error("Later failure");
      },
    };
    await expect(combinePreparedOperations([kept, later]).execute()).rejects.toThrow(
      "Later failure",
    );
    expect(await readFile(join(root, "SKILL.md"), "utf8")).toBe("Concurrent edits.\n");
  } finally {
    await workspace.cleanup();
  }
});

test("rolls back an earlier mixed plan when a later addition changes after preview", async () => {
  const workspace = await createTestWorkspace();
  try {
    await installSkill({
      skillId: "project-foundation",
      agents: ["codex"],
      scope: "user",
      strategy: "link",
      context: workspace.context,
    });
    const root = getManagedStore("user", workspace.context, "project-foundation");
    const before = await readFile(join(root, "SKILL.md"), "utf8");
    workspace.context.version = "1.1.0";
    const updateAndAdd = await prepareMaintainSkill({
      skillId: "project-foundation",
      agents: ["claude"],
      updateGroupIds: [root],
      scope: "user",
      strategy: "link",
      context: workspace.context,
    });
    const later = await prepareMaintainSkill({
      skillId: "teach",
      agents: ["codex"],
      updateGroupIds: [],
      scope: "user",
      strategy: "copy",
      context: workspace.context,
    });
    const raced = getTargetPath("codex", "user", workspace.context, "teach");
    await writeFile(raced, "Concurrent content.\n");
    await expect(combinePreparedOperations([updateAndAdd, later]).execute()).rejects.toThrow(
      "changed after preview",
    );
    expect(await readFile(join(root, "SKILL.md"), "utf8")).toBe(before);
    expect(await readReceipt(root)).toMatchObject({ version: "1.0.0", intendedAgents: ["codex"] });
    expect(
      await Bun.file(
        join(getTargetPath("claude", "user", workspace.context, "project-foundation"), "SKILL.md"),
      ).exists(),
    ).toBe(false);
    expect(await readFile(raced, "utf8")).toBe("Concurrent content.\n");
  } finally {
    await workspace.cleanup();
  }
});

test("a mixed plan rejects concurrent edits before updating anything", async () => {
  const workspace = await createTestWorkspace();
  try {
    await installSkill({
      skillId: "project-foundation",
      agents: ["codex"],
      scope: "user",
      strategy: "copy",
      context: workspace.context,
    });
    const root = getTargetPath("codex", "user", workspace.context, "project-foundation");
    workspace.context.version = "1.1.0";
    const prepared = await prepareMaintainSkill({
      skillId: "project-foundation",
      agents: ["claude"],
      updateGroupIds: [root],
      scope: "user",
      strategy: "copy",
      context: workspace.context,
    });
    await writeFile(join(root, "SKILL.md"), "Concurrent edits.\n");
    await expect(prepared.execute()).rejects.toThrow("changed after preview");
    expect(await readFile(join(root, "SKILL.md"), "utf8")).toBe("Concurrent edits.\n");
    expect(await readReceipt(root)).toMatchObject({ version: "1.0.0" });
  } finally {
    await workspace.cleanup();
  }
});
