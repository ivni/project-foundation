import { afterEach, describe, expect, test } from "bun:test";
import { lstat, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getManagedStore, getTargetPath } from "../src/agents.ts";
import {
  getManagedInstallations,
  installSkill,
  prepareInstallSkill,
  prepareRemoveSkill,
  prepareUpdateSkill,
  removeSkill,
  updateSkill,
} from "../src/operations.ts";
import {
  createReceipt,
  materializePayload,
  readReceipt,
  snapshotPackagedPayload,
} from "../src/payload.ts";
import type { TestWorkspace } from "./helpers.ts";
import { createTestWorkspace } from "./helpers.ts";

const workspaces: TestWorkspace[] = [];

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => workspace.cleanup()));
});

async function workspace(version = "1.0.0") {
  const value = await createTestWorkspace(version);
  workspaces.push(value);
  return value;
}

describe("installation operations", () => {
  test("rejects Hermes project scope", async () => {
    const current = await workspace();
    await expect(
      installSkill({
        agents: ["hermes"],
        scope: "project",
        strategy: "copy",
        projectRoot: current.project,
        context: current.context,
      }),
    ).rejects.toThrow("Hermes does not support project-scoped skills");
  });

  test("installs project links without writing outside planned skill roots", async () => {
    const current = await workspace();
    await installSkill({
      agents: ["claude", "opencode"],
      scope: "project",
      strategy: "link",
      projectRoot: current.project,
      context: current.context,
    });

    const store = getManagedStore("project", current.context, current.project);
    const claude = getTargetPath("claude", "project", current.context, current.project);
    expect((await lstat(claude)).isSymbolicLink()).toBe(true);
    expect((await readReceipt(store))?.intendedAgents).toEqual(["claude", "opencode"]);
    expect(await Bun.file(join(current.project, ".git")).exists()).toBe(false);
  });

  test("installs one managed copy for overlapping copy targets", async () => {
    const current = await workspace();
    await installSkill({
      agents: ["codex", "pi", "opencode"],
      scope: "user",
      strategy: "copy",
      context: current.context,
    });

    const codexPath = getTargetPath("codex", "user", current.context);
    expect((await readReceipt(codexPath))?.intendedAgents).toEqual(["codex", "opencode", "pi"]);
    expect(await Bun.file(join(codexPath, "SKILL.md")).exists()).toBe(true);
    expect(await Bun.file(getTargetPath("pi", "user", current.context)).exists()).toBe(false);
  });

  test("creates a shared store and a native link", async () => {
    const current = await workspace();
    await installSkill({
      agents: ["codex", "pi"],
      scope: "user",
      strategy: "link",
      context: current.context,
    });

    const target = getTargetPath("codex", "user", current.context);
    const store = getManagedStore("user", current.context);
    expect((await lstat(target)).isSymbolicLink()).toBe(true);
    expect((await readReceipt(store))?.intendedAgents).toEqual(["codex", "pi"]);
  });

  test("adopts exact unmanaged content into the requested link topology", async () => {
    const current = await workspace();
    const target = getTargetPath("codex", "user", current.context);
    const files = await snapshotPackagedPayload(current.payload);
    const receipt = createReceipt({
      version: current.context.version,
      scope: "user",
      strategy: "copy",
      intendedAgents: ["codex"],
      files,
    });
    await materializePayload(current.payload, target, receipt);
    await rm(join(target, ".project-foundation.json"));

    await installSkill({
      agents: ["codex"],
      scope: "user",
      strategy: "link",
      context: current.context,
      hooks: { onExistingConflict: async () => "adopt" },
    });

    expect((await lstat(target)).isSymbolicLink()).toBe(true);
    expect(await readReceipt(getManagedStore("user", current.context))).toBeDefined();
  });

  test("updates managed content and receipt version", async () => {
    const current = await workspace("1.0.0");
    await installSkill({
      agents: ["claude"],
      scope: "user",
      strategy: "copy",
      context: current.context,
    });
    await writeFile(join(current.payload, "SKILL.md"), "# Project Foundation\n\nVersion two.\n");
    current.context.version = "1.1.0";

    const result = await updateSkill({ scope: "user", context: current.context });
    const target = getTargetPath("claude", "user", current.context);
    expect(result.changed).toContain(target);
    expect((await readReceipt(target))?.version).toBe("1.1.0");
    expect(await readFile(join(target, "SKILL.md"), "utf8")).toContain("Version two");
  });

  test("rejects package downgrades", async () => {
    const current = await workspace("2.0.0");
    await installSkill({
      agents: ["codex"],
      scope: "user",
      strategy: "copy",
      context: current.context,
    });
    current.context.version = "1.9.0";

    await expect(updateSkill({ scope: "user", context: current.context })).rejects.toThrow(
      "newer than this package",
    );
  });

  test("backs up modified content before updating when requested", async () => {
    const current = await workspace("1.0.0");
    await installSkill({
      agents: ["pi"],
      scope: "user",
      strategy: "copy",
      context: current.context,
    });
    const target = getTargetPath("pi", "user", current.context);
    await writeFile(join(target, "SKILL.md"), "Local edits.\n");
    await writeFile(join(current.payload, "SKILL.md"), "Packaged update.\n");
    current.context.version = "1.1.0";

    const result = await updateSkill({
      scope: "user",
      context: current.context,
      hooks: { onModifiedUpdate: async () => "backup-replace" },
    });
    expect(result.backups).toHaveLength(1);
    expect(await readFile(join(result.backups[0]?.path ?? "", "skill", "SKILL.md"), "utf8")).toBe(
      "Local edits.\n",
    );
  });

  test("migrates a shared link when one agent is removed", async () => {
    const current = await workspace();
    await installSkill({
      agents: ["codex", "pi"],
      scope: "user",
      strategy: "link",
      context: current.context,
    });

    await removeSkill({ agents: ["codex"], scope: "user", context: current.context });

    const piPath = getTargetPath("pi", "user", current.context);
    expect((await lstat(piPath)).isSymbolicLink()).toBe(true);
    expect((await readReceipt(getManagedStore("user", current.context)))?.intendedAgents).toEqual([
      "pi",
    ]);
    expect(await Bun.file(getTargetPath("codex", "user", current.context)).exists()).toBe(false);
    expect(await getManagedInstallations("user", current.context)).toHaveLength(1);
  });

  test("preserves modified state when a shared copy is migrated", async () => {
    const current = await workspace();
    await installSkill({
      agents: ["codex", "pi"],
      scope: "user",
      strategy: "copy",
      context: current.context,
    });
    const codexPath = getTargetPath("codex", "user", current.context);
    await writeFile(join(codexPath, "SKILL.md"), "Local shared edits.\n");

    await removeSkill({ agents: ["codex"], scope: "user", context: current.context });

    const groups = await getManagedInstallations("user", current.context);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.receipt.intendedAgents).toEqual(["pi"]);
    expect(groups[0]?.modified).toBe(true);
    expect(await readFile(join(groups[0]?.physicalRoot ?? "", "SKILL.md"), "utf8")).toBe(
      "Local shared edits.\n",
    );
  });

  test("keeps a modified installation when removal is declined", async () => {
    const current = await workspace();
    await installSkill({
      agents: ["hermes"],
      scope: "user",
      strategy: "copy",
      context: current.context,
    });
    const target = getTargetPath("hermes", "user", current.context);
    await writeFile(join(target, "SKILL.md"), "Keep this local version.\n");

    const result = await removeSkill({
      agents: ["hermes"],
      scope: "user",
      context: current.context,
      hooks: { onModifiedRemove: async () => "keep" },
    });

    expect(result.skipped).toContain(target);
    expect(await readFile(join(target, "SKILL.md"), "utf8")).toBe("Keep this local version.\n");
  });

  test("leaves an unmanaged conflict untouched", async () => {
    const current = await workspace();
    const target = getTargetPath("hermes", "user", current.context);
    await mkdir(target, { recursive: true });
    await writeFile(join(target, "personal.txt"), "mine\n");

    const result = await installSkill({
      agents: ["hermes"],
      scope: "user",
      strategy: "copy",
      context: current.context,
      hooks: { onExistingConflict: async () => "leave" },
    });

    expect(result.skipped).toContain(target);
    expect(await readFile(join(target, "personal.txt"), "utf8")).toBe("mine\n");
  });

  test("does not claim skipped agents in a shared link receipt", async () => {
    const current = await workspace();
    const codex = getTargetPath("codex", "user", current.context);
    await mkdir(codex, { recursive: true });
    await writeFile(join(codex, "personal.txt"), "mine\n");

    await installSkill({
      agents: ["codex", "hermes"],
      scope: "user",
      strategy: "link",
      context: current.context,
      hooks: {
        onExistingConflict: async (inspection) =>
          inspection.targetPath === codex ? "leave" : "replace",
      },
    });

    expect(await readFile(join(codex, "personal.txt"), "utf8")).toBe("mine\n");
    expect((await readReceipt(getManagedStore("user", current.context)))?.intendedAgents).toEqual([
      "hermes",
    ]);
    expect((await lstat(getTargetPath("hermes", "user", current.context))).isSymbolicLink()).toBe(
      true,
    );
  });

  test("preserves native targets when a conflicting link store is kept", async () => {
    const current = await workspace();
    const target = getTargetPath("codex", "user", current.context);
    const store = getManagedStore("user", current.context);
    await mkdir(target, { recursive: true });
    await mkdir(store, { recursive: true });
    await writeFile(join(target, "native.txt"), "native\n");
    await writeFile(join(store, "store.txt"), "store\n");

    await installSkill({
      agents: ["codex"],
      scope: "user",
      strategy: "link",
      context: current.context,
      hooks: {
        onExistingConflict: async (inspection) =>
          inspection.targetPath === store ? "leave" : "replace",
      },
    });

    expect(await readFile(join(target, "native.txt"), "utf8")).toBe("native\n");
    expect(await readFile(join(store, "store.txt"), "utf8")).toBe("store\n");
    expect((await lstat(target)).isSymbolicLink()).toBe(false);
  });

  test("never manages or deletes a receipt behind an external native symlink", async () => {
    const current = await workspace();
    const target = getTargetPath("codex", "user", current.context);
    const external = join(current.root, "external-owned-directory");
    const files = await snapshotPackagedPayload(current.payload);
    await materializePayload(
      current.payload,
      external,
      createReceipt({
        version: "1.0.0",
        scope: "user",
        strategy: "copy",
        intendedAgents: ["codex"],
        files,
      }),
    );
    await mkdir(join(target, ".."), { recursive: true });
    await symlink(external, target, process.platform === "win32" ? "junction" : "dir");

    expect(await getManagedInstallations("user", current.context)).toEqual([]);
    expect((await updateSkill({ scope: "user", context: current.context })).changed).toEqual([]);
    expect(
      (await removeSkill({ agents: ["codex"], scope: "user", context: current.context })).changed,
    ).toEqual([]);
    expect(await Bun.file(join(external, "SKILL.md")).exists()).toBe(true);
    expect((await lstat(target)).isSymbolicLink()).toBe(true);
  });

  test("never auto-adopts a symlinked canonical store", async () => {
    const current = await workspace();
    const store = getManagedStore("user", current.context);
    const external = join(current.root, "external-store");
    const files = await snapshotPackagedPayload(current.payload);
    await materializePayload(
      current.payload,
      external,
      createReceipt({
        version: "1.0.0",
        scope: "user",
        strategy: "link",
        intendedAgents: ["codex"],
        files,
      }),
    );
    await mkdir(join(store, ".."), { recursive: true });
    await symlink(external, store, process.platform === "win32" ? "junction" : "dir");

    const prepared = await prepareInstallSkill({
      agents: ["codex"],
      scope: "user",
      strategy: "link",
      context: current.context,
    });
    expect(prepared.preview.some((entry) => entry.action === "skip" && entry.path === store)).toBe(
      true,
    );
    await prepared.execute();
    expect((await lstat(store)).isSymbolicLink()).toBe(true);
    expect(await readReceipt(external)).toBeDefined();
    expect(await Bun.file(getTargetPath("codex", "user", current.context)).exists()).toBe(false);
  });

  test("rejects malformed and scope-mismatched receipts", async () => {
    const current = await workspace();
    const target = getTargetPath("claude", "user", current.context);
    const files = await snapshotPackagedPayload(current.payload);
    await materializePayload(
      current.payload,
      target,
      createReceipt({
        version: "1.0.0",
        scope: "project",
        strategy: "copy",
        intendedAgents: ["claude"],
        files,
      }),
    );
    expect(await getManagedInstallations("user", current.context)).toEqual([]);

    const receipt = createReceipt({
      version: "1.0.0",
      scope: "user",
      strategy: "copy",
      intendedAgents: ["claude"],
      files,
    });
    await writeFile(
      join(target, ".project-foundation.json"),
      JSON.stringify({ ...receipt, version: "1.0.0/../../../escaped" }),
    );
    expect(await readReceipt(target)).toBeUndefined();
  });

  test("detects local package manifests before update", async () => {
    const current = await workspace("1.0.0");
    await installSkill({
      agents: ["pi"],
      scope: "user",
      strategy: "copy",
      context: current.context,
    });
    const target = getTargetPath("pi", "user", current.context);
    await writeFile(join(target, "package.json"), '{"private":true}\n');
    expect((await getManagedInstallations("user", current.context))[0]?.modified).toBe(true);
    current.context.version = "1.1.0";
    let prompted = false;
    const result = await updateSkill({
      scope: "user",
      context: current.context,
      hooks: {
        onModifiedUpdate: async (_group, diff) => {
          prompted = true;
          expect(diff).toContain("package.json");
          return "skip";
        },
      },
    });
    expect(prompted).toBe(true);
    expect(result.skipped).toContain(target);
    expect(await Bun.file(join(target, "package.json")).exists()).toBe(true);
  });

  test("records local symlinks as modifications without following them", async () => {
    const current = await workspace("1.0.0");
    await installSkill({
      agents: ["hermes"],
      scope: "user",
      strategy: "copy",
      context: current.context,
    });
    const target = getTargetPath("hermes", "user", current.context);
    const external = join(current.root, "external-link-target");
    await mkdir(external);
    await writeFile(join(external, "secret.txt"), "do not follow\n");
    await symlink(
      external,
      join(target, "local-link"),
      process.platform === "win32" ? "junction" : "dir",
    );
    expect((await getManagedInstallations("user", current.context))[0]?.modified).toBe(true);
    current.context.version = "1.1.0";
    let shownDiff = "";
    await updateSkill({
      scope: "user",
      context: current.context,
      hooks: {
        onModifiedUpdate: async (_group, diff) => {
          shownDiff = diff;
          return "skip";
        },
      },
    });
    expect(shownDiff).toContain("[symbolic link ->");
    expect(shownDiff).not.toContain("do not follow");
    expect(await readFile(join(external, "secret.txt"), "utf8")).toBe("do not follow\n");
  });

  test("prepared install preview lists only exact deduplicated mutations", async () => {
    const current = await workspace();
    const prepared = await prepareInstallSkill({
      agents: ["codex", "pi", "opencode"],
      scope: "user",
      strategy: "link",
      context: current.context,
    });
    const paths = prepared.preview.map((entry) => entry.path);
    expect(paths).toContain(getManagedStore("user", current.context));
    expect(paths).toContain(getTargetPath("codex", "user", current.context));
    expect(paths).not.toContain(getTargetPath("pi", "user", current.context));
    expect(paths).not.toContain(getTargetPath("opencode", "user", current.context));
  });

  test("skipping every link target does not create an orphan store", async () => {
    const current = await workspace();
    const target = getTargetPath("codex", "user", current.context);
    await mkdir(target, { recursive: true });
    await writeFile(join(target, "personal.txt"), "mine\n");
    const prepared = await prepareInstallSkill({
      agents: ["codex"],
      scope: "user",
      strategy: "link",
      context: current.context,
      hooks: { onExistingConflict: async () => "leave" },
    });
    expect(prepared.preview).toEqual([{ action: "skip", path: target, detail: "Codex target" }]);
    await prepared.execute();
    expect(await Bun.file(getManagedStore("user", current.context)).exists()).toBe(false);
  });

  test("prepared removal preview exposes migration paths before execution", async () => {
    const current = await workspace();
    await installSkill({
      agents: ["codex", "pi"],
      scope: "user",
      strategy: "link",
      context: current.context,
    });
    const prepared = await prepareRemoveSkill({
      agents: ["codex"],
      scope: "user",
      context: current.context,
    });
    const paths = prepared.preview.map((entry) => entry.path);
    expect(paths).toContain(getManagedStore("user", current.context));
    expect(paths).toContain(getTargetPath("codex", "user", current.context));
    expect(paths).toContain(getTargetPath("pi", "user", current.context));
    expect(prepared.preview.some((entry) => entry.action === "link")).toBe(true);
  });

  test("prepared operations abort when filesystem state changes after preview", async () => {
    const current = await workspace();
    const target = getTargetPath("codex", "user", current.context);
    const prepared = await prepareInstallSkill({
      agents: ["codex"],
      scope: "user",
      strategy: "copy",
      context: current.context,
    });
    await mkdir(target, { recursive: true });
    await writeFile(join(target, "arrived-after-preview.txt"), "keep\n");

    await expect(prepared.execute()).rejects.toThrow("changed after preview");
    expect(await readFile(join(target, "arrived-after-preview.txt"), "utf8")).toBe("keep\n");
    expect(await readReceipt(target)).toBeUndefined();
  });

  test("prepared updates expose exact changes and detect empty-directory races", async () => {
    const current = await workspace("1.0.0");
    await installSkill({
      agents: ["claude"],
      scope: "user",
      strategy: "copy",
      context: current.context,
    });
    const target = getTargetPath("claude", "user", current.context);
    await mkdir(join(target, "empty-before-preview"));
    expect((await getManagedInstallations("user", current.context))[0]?.modified).toBe(true);

    current.context.version = "1.1.0";
    const prepared = await prepareUpdateSkill({
      scope: "user",
      context: current.context,
      hooks: {
        onModifiedUpdate: async (_group, diff) => {
          expect(diff).toContain("empty-before-preview/");
          expect(diff).toContain("[directory]");
          return "replace";
        },
      },
    });
    expect(prepared.preview).toContainEqual({
      action: "update",
      path: target,
      detail: "v1.0.0 -> v1.1.0; Claude Code",
    });

    await mkdir(join(target, "empty-after-preview"));
    await expect(prepared.execute()).rejects.toThrow("changed after preview");
    expect((await lstat(join(target, "empty-after-preview"))).isDirectory()).toBe(true);
    expect((await readReceipt(target))?.version).toBe("1.0.0");
  });

  test("recognizes canonical stores beneath symlinked data parents", async () => {
    const current = await workspace();
    const realData = join(current.root, "real-data");
    const linkedData = join(current.root, "linked-data");
    await mkdir(realData);
    await symlink(realData, linkedData, process.platform === "win32" ? "junction" : "dir");
    current.context.env.LOCALAPPDATA = linkedData;
    current.context.env.XDG_DATA_HOME = linkedData;

    await installSkill({
      agents: ["codex"],
      scope: "user",
      strategy: "link",
      context: current.context,
    });

    const groups = await getManagedInstallations("user", current.context);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.strategy).toBe("link");
    expect(groups[0]?.receipt.intendedAgents).toEqual(["codex"]);
  });

  test("migrates links across logical roots with different canonical depths", async () => {
    const current = await workspace();
    const realRoot = join(current.root, "nested", "real-root");
    const aliasRoot = join(current.root, "alias-root");
    await Promise.all([
      mkdir(join(realRoot, "home"), { recursive: true }),
      mkdir(join(realRoot, "data"), { recursive: true }),
    ]);
    await symlink(realRoot, aliasRoot, process.platform === "win32" ? "junction" : "dir");
    current.context.home = join(aliasRoot, "home");
    current.context.env.LOCALAPPDATA = join(aliasRoot, "data");
    current.context.env.XDG_DATA_HOME = join(aliasRoot, "data");

    await installSkill({
      agents: ["codex", "pi"],
      scope: "user",
      strategy: "link",
      context: current.context,
    });
    await removeSkill({ agents: ["codex"], scope: "user", context: current.context });

    const piTarget = getTargetPath("pi", "user", current.context);
    expect((await lstat(piTarget)).isSymbolicLink()).toBe(true);
    expect((await readReceipt(piTarget))?.intendedAgents).toEqual(["pi"]);
  });

  test("prepared installs use captured inputs when caller options later mutate", async () => {
    const current = await workspace("1.0.0");
    const target = getTargetPath("codex", "user", current.context);
    const options = {
      agents: ["codex" as const],
      scope: "user" as const,
      strategy: "copy" as const,
      context: current.context,
    };
    const prepared = await prepareInstallSkill(options);
    options.agents.splice(0, 1);
    current.context.version = "2.0.0";
    current.context.payloadRoot = join(current.root, "missing-payload");
    current.context.home = join(current.root, "different-home");

    await prepared.execute();
    const receipt = await readReceipt(target);
    expect(receipt?.version).toBe("1.0.0");
    expect(receipt?.strategy).toBe("copy");
    expect(receipt?.intendedAgents).toEqual(["codex"]);
  });

  test("prepared updates use captured version and payload after caller context mutates", async () => {
    const current = await workspace("1.0.0");
    await installSkill({
      agents: ["pi"],
      scope: "user",
      strategy: "copy",
      context: current.context,
    });
    const target = getTargetPath("pi", "user", current.context);
    current.context.version = "1.1.0";
    const prepared = await prepareUpdateSkill({ scope: "user", context: current.context });
    expect(prepared.preview[0]?.detail).toContain("v1.0.0 -> v1.1.0");
    current.context.version = "2.0.0";
    current.context.payloadRoot = join(current.root, "missing-payload");

    await prepared.execute();
    expect((await readReceipt(target))?.version).toBe("1.1.0");
  });

  test("summarizes high-complexity modified-file diffs without building an LCS matrix", async () => {
    const current = await workspace("1.0.0");
    await writeFile(join(current.payload, "SKILL.md"), "a\n".repeat(20_000));
    await installSkill({
      agents: ["hermes"],
      scope: "user",
      strategy: "copy",
      context: current.context,
    });
    const target = getTargetPath("hermes", "user", current.context);
    await writeFile(join(target, "SKILL.md"), "b\n".repeat(20_000));
    current.context.version = "1.1.0";
    let diff = "";
    await updateSkill({
      scope: "user",
      context: current.context,
      hooks: {
        onModifiedUpdate: async (_group, value) => {
          diff = value;
          return "skip";
        },
      },
    });
    expect(diff).toContain("inline diff omitted");
    expect(diff.length).toBeLessThan(10_000);
  });
});
