import { cp, lstat, mkdir, readlink, realpath, rm, symlink } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { AGENTS, getManagedStore } from "./agents.ts";
import { createBackup } from "./backups.ts";
import { createDirectoryDiff } from "./diff.ts";
import { inspectTarget, scanScope } from "./installations.ts";
import {
  createReceipt,
  hashFile,
  hashSnapshot,
  materializePayload,
  payloadMatches,
  readReceipt,
  snapshotPackagedPayload,
  snapshotPayload,
  writeReceipt,
} from "./payload.ts";
import { planNativeTargets } from "./topology.ts";
import { withTransaction } from "./transaction.ts";
import type {
  AgentId,
  BackupRecord,
  ConflictAction,
  InstallationGroup,
  MutationPreviewEntry,
  OperationHooks,
  OperationResult,
  PreparedOperation,
  Receipt,
  RuntimeContext,
  Scope,
  Strategy,
  TargetInspection,
} from "./types.ts";
import { UserFacingError } from "./types.ts";

export { compareVersions, isBreakingUpdate } from "./version.ts";

import { compareVersions, isBreakingUpdate } from "./version.ts";

interface OperationBase {
  scope: Scope;
  context: RuntimeContext;
  projectRoot?: string;
  hooks?: OperationHooks;
}

export interface InstallOptions extends OperationBase {
  agents: AgentId[];
  strategy: Strategy;
}

export interface UpdateOptions extends OperationBase {
  groupIds?: string[];
}

export interface RemoveOptions extends OperationBase {
  agents: AgentId[];
}

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function pathFingerprint(path: string): Promise<string> {
  try {
    const entry = await lstat(path);
    if (entry.isSymbolicLink()) return `link:${await readlink(path)}`;
    if (entry.isFile()) return `file:${await hashFile(path)}`;
    if (entry.isDirectory()) {
      const files = await snapshotPayload(path);
      const receipt = await readReceipt(path);
      return `directory:${hashSnapshot(files)}:${receipt ? JSON.stringify(receipt) : "no-receipt"}`;
    }
    return `other:${entry.mode}:${entry.size}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "missing";
    throw error;
  }
}

async function captureFingerprints(paths: string[]): Promise<Map<string, string>> {
  return new Map(
    await Promise.all(
      [...new Set(paths)].map(async (path) => [path, await pathFingerprint(path)] as const),
    ),
  );
}

async function verifyFingerprint(path: string, expected: string | undefined): Promise<void> {
  if (expected === undefined || (await pathFingerprint(path)) !== expected) {
    throw new UserFacingError(
      `Filesystem content changed after preview: ${path}`,
      "Nothing was changed. Run the operation again to review a fresh plan.",
    );
  }
}

async function verifyFingerprints(fingerprints: Map<string, string>): Promise<void> {
  for (const [path, expected] of fingerprints) {
    await verifyFingerprint(path, expected);
  }
}

function snapshotContext(context: RuntimeContext): RuntimeContext {
  return { ...context, env: { ...context.env } };
}

async function createLink(
  targetPath: string,
  source: string,
  context: RuntimeContext,
): Promise<void> {
  const targetParent = dirname(targetPath);
  await mkdir(targetParent, { recursive: true });
  const [canonicalParent, canonicalSource] = await Promise.all([
    realpath(targetParent),
    realpath(source),
  ]);
  const linkTarget =
    context.platform === "win32" ? canonicalSource : relative(canonicalParent, canonicalSource);
  await symlink(linkTarget, targetPath, context.platform === "win32" ? "junction" : "dir");
}

async function backupGroup(
  group: InstallationGroup,
  context: RuntimeContext,
): Promise<BackupRecord> {
  const agent = group.targets[0]?.agent ?? group.receipt.intendedAgents[0] ?? "codex";
  return createBackup({
    source: group.physicalRoot,
    agent,
    scope: group.scope,
    version: group.receipt.version,
    context,
  });
}

async function diffAgainstPackage(physicalRoot: string, context: RuntimeContext): Promise<string> {
  const packaged = await snapshotPackagedPayload(context.payloadRoot);
  const installed = await snapshotPayload(physicalRoot);
  return createDirectoryDiff(context.payloadRoot, physicalRoot, packaged, installed);
}

function mergeAgents(...groups: AgentId[][]): AgentId[] {
  return [...new Set(groups.flat())].sort();
}

async function verifyManagedTarget(
  agent: AgentId,
  scope: Scope,
  context: RuntimeContext,
  projectRoot: string | undefined,
  intendedAgents: AgentId[],
): Promise<void> {
  const inspection = await inspectTarget(agent, scope, context, projectRoot);
  const targetPath = inspection.targetPath;
  if (inspection.brokenLink || !inspection.receipt) {
    throw new UserFacingError(
      `Verification failed for ${targetPath}.`,
      "The operation was rolled back.",
    );
  }
  if (!intendedAgents.every((intended) => inspection.receipt?.intendedAgents.includes(intended))) {
    throw new UserFacingError(
      `Verification found an incomplete receipt at ${targetPath}.`,
      "The operation was rolled back.",
    );
  }
}

async function syntheticInspection(agent: AgentId, targetPath: string): Promise<TargetInspection> {
  const stat = await lstat(targetPath);
  const link = stat.isSymbolicLink();
  let physicalRoot = targetPath;
  let brokenLink = false;
  if (link) {
    try {
      physicalRoot = await realpath(targetPath);
    } catch {
      brokenLink = true;
    }
  }
  const receipt = brokenLink ? undefined : await readReceipt(physicalRoot);
  const currentFiles = receipt ? await snapshotPayload(physicalRoot) : undefined;
  return {
    agent,
    targetPath,
    exists: true,
    link,
    brokenLink,
    physicalRoot,
    receipt,
    currentFiles,
    modified:
      Boolean(receipt && currentFiles) && hashSnapshot(currentFiles ?? {}) !== receipt?.payloadHash,
  };
}

async function resolveConflict(
  inspection: TargetInspection,
  intendedAgents: AgentId[],
  scope: Scope,
  strategy: Strategy,
  context: RuntimeContext,
  hooks: OperationHooks,
): Promise<{ action: ConflictAction; receipt: Receipt; exact: boolean; diff: string }> {
  const expectedFiles = await snapshotPackagedPayload(context.payloadRoot);
  let currentFiles: Record<string, string> = {};
  let inspectionError: string | undefined;
  if (!inspection.brokenLink) {
    try {
      currentFiles = await snapshotPayload(inspection.physicalRoot);
    } catch (error) {
      inspectionError = error instanceof Error ? error.message : String(error);
    }
  }
  const exact =
    !inspection.brokenLink &&
    !inspection.link &&
    !inspectionError &&
    (await payloadMatches(inspection.physicalRoot, expectedFiles));
  const contentDiff = inspectionError
    ? `The existing content could not be fully inspected.\n${inspectionError}`
    : await createDirectoryDiff(
        context.payloadRoot,
        inspection.physicalRoot,
        expectedFiles,
        currentFiles,
      );
  const diff = inspection.brokenLink
    ? "The existing symbolic link is broken."
    : inspection.link
      ? `The existing path is a symbolic link to ${inspection.physicalRoot}.\n${contentDiff}`
      : contentDiff;
  const inspected = inspectionError ? { ...inspection, inspectionError } : inspection;
  const action = hooks.onExistingConflict
    ? await hooks.onExistingConflict(inspected, diff)
    : exact
      ? "adopt"
      : "leave";
  if (inspectionError && action !== "backup-replace" && action !== "leave") {
    throw new UserFacingError(
      `Cannot replace uninspected content at ${inspection.targetPath} without a backup.`,
      "Choose Remove and back up, or Keep.",
    );
  }
  return {
    action,
    exact,
    diff,
    receipt: createReceipt({
      version: context.version,
      scope,
      strategy,
      intendedAgents,
      files: exact ? currentFiles : expectedFiles,
    }),
  };
}

export async function prepareInstallSkill(options: InstallOptions): Promise<PreparedOperation> {
  const context = snapshotContext(options.context);
  const agents = [...options.agents];
  const scope = options.scope;
  const strategy = options.strategy;
  const projectRoot = options.projectRoot;
  if (agents.length === 0) {
    throw new UserFacingError("Select at least one agent.");
  }
  if (scope === "project" && agents.includes("hermes")) {
    throw new UserFacingError("Hermes does not support project-scoped skills.");
  }

  const hooks = options.hooks ?? {};
  const expectedFiles = await snapshotPackagedPayload(context.payloadRoot);
  const scanned = await scanScope(scope, context, projectRoot);
  const selected = new Set(agents);
  const covered = new Set<AgentId>();
  const receiptUpdates = new Map<string, Receipt>();
  const notes: string[] = [];

  for (const group of scanned.groups) {
    if (compareVersions(group.receipt.version, context.version) > 0) {
      throw new UserFacingError(
        `The installation at ${group.physicalRoot} is newer than this package.`,
        "Run the latest package. Downgrades are not supported.",
      );
    }
    const newlyCovered: AgentId[] = [];
    for (const target of group.targets) {
      for (const agent of AGENTS[target.agent].discoveredBy) {
        if (selected.has(agent)) {
          covered.add(agent);
          newlyCovered.push(agent);
        }
      }
    }
    if (newlyCovered.length > 0) {
      receiptUpdates.set(group.physicalRoot, {
        ...group.receipt,
        intendedAgents: mergeAgents(group.receipt.intendedAgents, newlyCovered),
      });
      notes.push(
        `${newlyCovered.map((agent) => AGENTS[agent].label).join(", ")} already discover the skill.`,
      );
    }
  }

  const remaining = agents.filter((agent) => !covered.has(agent));
  const plans = planNativeTargets(remaining, scope, context, projectRoot);
  const conflictActions = new Map<string, Awaited<ReturnType<typeof resolveConflict>>>();
  const backups: BackupRecord[] = [];

  for (const plan of plans) {
    if (!(await exists(plan.path))) continue;
    const inspection = await inspectTarget(plan.owner, scope, context, projectRoot);
    if (inspection.receipt) {
      notes.push(`${AGENTS[plan.owner].label} is already managed at ${plan.path}.`);
      continue;
    }
    conflictActions.set(
      plan.path,
      await resolveConflict(inspection, plan.intendedAgents, scope, strategy, context, hooks),
    );
  }

  const viablePlans = plans.filter((plan) => conflictActions.get(plan.path)?.action !== "leave");
  const viableAgents = viablePlans.flatMap((plan) => plan.intendedAgents);

  let linkStore = "";
  let linkReceipt: Receipt | undefined;
  let storeExisted = false;
  if (strategy === "link" && viablePlans.length > 0) {
    linkStore = getManagedStore(scope, context, projectRoot);
    storeExisted = await exists(linkStore);
    const storeEntry = storeExisted ? await lstat(linkStore) : undefined;
    const existingReceipt =
      storeEntry?.isDirectory() && !storeEntry.isSymbolicLink()
        ? await readReceipt(linkStore)
        : undefined;
    if (storeExisted) {
      if (!existingReceipt) {
        const inspection = await syntheticInspection(viablePlans[0]?.owner ?? "codex", linkStore);
        conflictActions.set(
          linkStore,
          await resolveConflict(inspection, viableAgents, scope, "link", context, hooks),
        );
      } else {
        if (compareVersions(existingReceipt.version, context.version) > 0) {
          throw new UserFacingError(
            `The managed store is newer than this package: ${linkStore}`,
            "Run the latest package. Downgrades are not supported.",
          );
        }
        linkReceipt = {
          ...existingReceipt,
          intendedAgents: mergeAgents(existingReceipt.intendedAgents, viableAgents),
        };
      }
    }
    linkReceipt ??= createReceipt({
      version: context.version,
      scope,
      strategy: "link",
      intendedAgents: viableAgents,
      files: expectedFiles,
    });
  }

  const skippedPlans = new Set<string>();
  for (const [path, conflict] of conflictActions) {
    if (conflict.action === "leave") skippedPlans.add(path);
    if (conflict.action === "adopt" && !conflict.exact) {
      throw new UserFacingError(`Cannot adopt a non-matching installation at ${path}.`);
    }
  }

  if (linkReceipt && !skippedPlans.has(linkStore)) {
    const activeAgents = plans
      .filter((plan) => !skippedPlans.has(plan.path))
      .flatMap((plan) => plan.intendedAgents);
    const existingAgents = (await readReceipt(linkStore))?.intendedAgents ?? [];
    linkReceipt = {
      ...linkReceipt,
      intendedAgents: mergeAgents(existingAgents, activeAgents),
    };
  }

  const touched = [
    ...receiptUpdates.keys(),
    ...plans.map((plan) => plan.path),
    ...(linkStore ? [linkStore] : []),
  ];
  const fingerprints = await captureFingerprints(touched);
  const preview: MutationPreviewEntry[] = [];
  for (const root of receiptUpdates.keys()) {
    preview.push({ action: "update", path: root, detail: "Extend the managed receipt" });
  }
  if (linkStore) {
    const conflict = conflictActions.get(linkStore);
    if (conflict?.action === "leave") {
      preview.push({ action: "skip", path: linkStore, detail: "Keep the existing managed store" });
    } else {
      if (conflict?.action === "backup-replace") {
        preview.push({ action: "backup", path: linkStore, detail: "Back up the existing store" });
      }
      preview.push({
        action:
          conflict?.action === "adopt"
            ? "adopt"
            : storeExisted
              ? conflict
                ? "replace"
                : "update"
              : "create",
        path: linkStore,
        detail: "Managed link payload",
      });
    }
  }
  for (const plan of plans) {
    const conflict = conflictActions.get(plan.path);
    if (conflict?.action === "leave" || skippedPlans.has(linkStore)) {
      preview.push({
        action: "skip",
        path: plan.path,
        detail: `${AGENTS[plan.owner].label} target`,
      });
      continue;
    }
    if (conflict?.action === "backup-replace") {
      preview.push({ action: "backup", path: plan.path, detail: "Back up existing content" });
    }
    if (strategy === "link") {
      preview.push({
        action: conflict ? "replace" : "link",
        path: plan.path,
        detail: `Link ${AGENTS[plan.owner].label} to ${linkStore}`,
      });
    } else {
      preview.push({
        action: conflict?.action === "adopt" ? "adopt" : conflict ? "replace" : "create",
        path: plan.path,
        detail: `${AGENTS[plan.owner].label} copy`,
      });
    }
  }

  let executed = false;
  return {
    preview,
    execute: async () => {
      if (executed) throw new Error("This prepared installation has already executed.");
      executed = true;
      const changed: string[] = [];
      const skipped: string[] = [];

      await withTransaction(
        touched,
        async (transaction) => {
          for (const [root, receipt] of receiptUpdates) {
            await transaction.beforeMutation(root);
            await writeReceipt(root, receipt);
            changed.push(root);
          }

          for (const [path, conflict] of conflictActions) {
            const plannedTargetBlockedByStore =
              skippedPlans.has(linkStore) && plans.some((plan) => plan.path === path);
            if (plannedTargetBlockedByStore) {
              skipped.push(path);
              continue;
            }
            if (conflict.action === "leave") {
              skipped.push(path);
              continue;
            }
            if (conflict.action === "backup-replace") {
              const plan = plans.find((candidate) => candidate.path === path);
              backups.push(
                await createBackup({
                  source: path,
                  agent: plan?.owner ?? "codex",
                  scope,
                  version: "unmanaged",
                  context,
                }),
              );
            }
            if (conflict.action === "adopt") {
              const isPlannedTarget = plans.some((plan) => plan.path === path);
              await transaction.beforeMutation(path);
              if (strategy === "link" && isPlannedTarget) {
                await rm(path, { recursive: true, force: true });
              } else {
                await writeReceipt(path, conflict.receipt);
                changed.push(path);
              }
            } else {
              await transaction.beforeMutation(path);
              await rm(path, { recursive: true, force: true });
            }
          }

          if (strategy === "link" && linkStore && !skippedPlans.has(linkStore)) {
            await transaction.beforeMutation(linkStore);
            const storeConflict = conflictActions.get(linkStore);
            if (storeConflict?.action === "adopt") {
              await writeReceipt(linkStore, linkReceipt as Receipt);
            } else if (!linkReceipt || !(await exists(linkStore))) {
              await materializePayload(context.payloadRoot, linkStore, linkReceipt as Receipt);
            } else {
              await writeReceipt(linkStore, linkReceipt);
            }
            changed.push(linkStore);
          }

          for (const plan of plans) {
            if (skippedPlans.has(plan.path) || skippedPlans.has(linkStore)) continue;
            const conflict = conflictActions.get(plan.path);
            if (conflict?.action === "adopt" && strategy === "copy") continue;
            if (await exists(plan.path)) continue;
            await transaction.beforeMutation(plan.path);
            if (strategy === "link") {
              await createLink(plan.path, linkStore, context);
            } else {
              const receipt = createReceipt({
                version: context.version,
                scope,
                strategy: "copy",
                intendedAgents: plan.intendedAgents,
                files: expectedFiles,
              });
              await materializePayload(context.payloadRoot, plan.path, receipt);
            }
            changed.push(plan.path);
          }

          for (const [root, receipt] of receiptUpdates) {
            const persisted = await readReceipt(root);
            if (
              !persisted ||
              !receipt.intendedAgents.every((agent) => persisted.intendedAgents.includes(agent))
            ) {
              throw new UserFacingError(
                `Verification found an incomplete receipt at ${root}.`,
                "The operation was rolled back.",
              );
            }
          }
          for (const plan of plans) {
            if (skippedPlans.has(plan.path) || skippedPlans.has(linkStore)) continue;
            await verifyManagedTarget(plan.owner, scope, context, projectRoot, plan.intendedAgents);
          }
        },
        {
          precondition: () => verifyFingerprints(fingerprints),
          pathPrecondition: (path) => verifyFingerprint(path, fingerprints.get(path)),
        },
      );

      return { changed: [...new Set(changed)], skipped: [...new Set(skipped)], backups, notes };
    },
  };
}

export async function installSkill(options: InstallOptions): Promise<OperationResult> {
  return (await prepareInstallSkill(options)).execute();
}

export async function prepareUpdateSkill(options: UpdateOptions): Promise<PreparedOperation> {
  const context = snapshotContext(options.context);
  const scope = options.scope;
  const projectRoot = options.projectRoot;
  const requestedGroupIds = options.groupIds ? [...options.groupIds] : undefined;
  const scanned = await scanScope(scope, context, projectRoot);
  const requested = requestedGroupIds ? new Set(requestedGroupIds) : undefined;
  const candidates = scanned.groups.filter((group) => !requested || requested.has(group.id));
  const expectedFiles = await snapshotPackagedPayload(context.payloadRoot);
  const decisions = new Map<string, "replace" | "backup-replace" | "skip">();
  const skipped: string[] = [];
  const backups: BackupRecord[] = [];
  const preview: MutationPreviewEntry[] = [];

  for (const group of candidates) {
    const comparison = compareVersions(group.receipt.version, context.version);
    if (comparison > 0) {
      throw new UserFacingError(
        `The installation at ${group.physicalRoot} is newer than this package.`,
        "Downgrades are not supported.",
      );
    }
    if (comparison === 0) {
      skipped.push(group.physicalRoot);
      preview.push({
        action: "skip",
        path: group.physicalRoot,
        detail: `Already at v${context.version}`,
      });
      continue;
    }
    if (group.modified) {
      const diff = await diffAgainstPackage(group.physicalRoot, context);
      const decision = options.hooks?.onModifiedUpdate
        ? await options.hooks.onModifiedUpdate(group, diff)
        : "skip";
      decisions.set(group.id, decision);
    } else {
      decisions.set(group.id, "replace");
    }
  }

  const selected = candidates.filter((group) => {
    const decision = decisions.get(group.id);
    if (decision === "skip") {
      skipped.push(group.physicalRoot);
      preview.push({
        action: "skip",
        path: group.physicalRoot,
        detail: `Keep modified v${group.receipt.version} installation`,
      });
    }
    return decision === "replace" || decision === "backup-replace";
  });

  for (const group of selected) {
    if (decisions.get(group.id) === "backup-replace") {
      preview.push({
        action: "backup",
        path: group.physicalRoot,
        detail: `Back up modified v${group.receipt.version} installation`,
      });
    }
    preview.push({
      action: "update",
      path: group.physicalRoot,
      detail: `v${group.receipt.version} -> v${context.version}; ${group.receipt.intendedAgents.map((agent) => AGENTS[agent].label).join(", ")}`,
    });
  }

  const touched = selected.map((group) => group.physicalRoot);
  const fingerprints = await captureFingerprints(touched);
  let executed = false;
  return {
    preview,
    breaking: selected.some((group) => isBreakingUpdate(group.receipt.version, context.version)),
    execute: async () => {
      if (executed) throw new Error("This prepared update has already executed.");
      executed = true;
      const changed: string[] = [];
      await withTransaction(
        touched,
        async (transaction) => {
          for (const group of selected) {
            if (decisions.get(group.id) === "backup-replace") {
              backups.push(await backupGroup(group, context));
            }
            const receipt = createReceipt({
              version: context.version,
              scope: group.scope,
              strategy: group.strategy,
              intendedAgents: group.receipt.intendedAgents,
              files: expectedFiles,
            });
            await transaction.beforeMutation(group.physicalRoot);
            await materializePayload(context.payloadRoot, group.physicalRoot, receipt);
            const persisted = await readReceipt(group.physicalRoot);
            const currentFiles = await snapshotPayload(group.physicalRoot);
            if (
              !persisted ||
              persisted.version !== context.version ||
              hashSnapshot(currentFiles) !== persisted.payloadHash
            ) {
              throw new UserFacingError(
                `Verification failed after updating ${group.physicalRoot}.`,
                "The operation was rolled back.",
              );
            }
            changed.push(group.physicalRoot);
          }
        },
        {
          precondition: () => verifyFingerprints(fingerprints),
          pathPrecondition: (path) => verifyFingerprint(path, fingerprints.get(path)),
        },
      );

      return {
        changed,
        skipped: [...new Set(skipped)],
        backups,
        notes: [],
      };
    },
  };
}

export async function updateSkill(options: UpdateOptions): Promise<OperationResult> {
  return (await prepareUpdateSkill(options)).execute();
}

async function ensureMigrationTargetsFree(
  group: InstallationGroup,
  paths: string[],
): Promise<void> {
  const current = new Set(group.targets.map((target) => resolve(target.targetPath)));
  for (const path of paths) {
    if (current.has(resolve(path))) continue;
    if (await exists(path)) {
      throw new UserFacingError(
        `Cannot migrate the installation because ${path} already exists.`,
        "Resolve the existing target and run Remove again.",
      );
    }
  }
}

export async function prepareRemoveSkill(options: RemoveOptions): Promise<PreparedOperation> {
  const context = snapshotContext(options.context);
  const scope = options.scope;
  const projectRoot = options.projectRoot;
  const agents = [...options.agents];
  const scanned = await scanScope(scope, context, projectRoot);
  const selected = new Set(agents);
  const affected = scanned.groups.filter((group) =>
    group.receipt.intendedAgents.some((agent) => selected.has(agent)),
  );
  const decisions = new Map<string, "remove" | "backup-remove" | "keep">();
  const backups: BackupRecord[] = [];
  const skipped: string[] = [];
  const notes = new Set<string>();

  for (const group of affected) {
    const remaining = group.receipt.intendedAgents.filter((agent) => !selected.has(agent));
    if (remaining.length === 0 && group.modified) {
      const diff = await diffAgainstPackage(group.physicalRoot, context);
      const decision = options.hooks?.onModifiedRemove
        ? await options.hooks.onModifiedRemove(group, diff)
        : "keep";
      decisions.set(group.id, decision);
    } else {
      decisions.set(group.id, "remove");
    }

    if (remaining.length > 0) {
      const plans = planNativeTargets(remaining, scope, context, projectRoot);
      await ensureMigrationTargetsFree(
        group,
        plans.map((plan) => plan.path),
      );
      for (const plan of plans) {
        const stillDiscovered = agents.filter((agent) =>
          AGENTS[plan.owner].discoveredBy.includes(agent),
        );
        if (stillDiscovered.length > 0) {
          notes.add(
            `${stillDiscovered.map((agent) => AGENTS[agent].label).join(", ")} may still discover the shared ${AGENTS[plan.owner].label} path.`,
          );
        }
      }
    }
  }

  const active = affected.filter((group) => {
    if (decisions.get(group.id) === "keep") {
      skipped.push(group.physicalRoot);
      return false;
    }
    return true;
  });
  const touched = active.flatMap((group) => {
    const remaining = group.receipt.intendedAgents.filter((agent) => !selected.has(agent));
    const newTargets = planNativeTargets(remaining, scope, context, projectRoot).map(
      (plan) => plan.path,
    );
    return [group.physicalRoot, ...group.targets.map((target) => target.targetPath), ...newTargets];
  });
  const fingerprints = await captureFingerprints(touched);
  const preview: MutationPreviewEntry[] = [];
  for (const group of affected) {
    const displayRoot =
      group.strategy === "link" ? getManagedStore(scope, context, projectRoot) : group.physicalRoot;
    if (decisions.get(group.id) === "keep") {
      preview.push({
        action: "skip",
        path: displayRoot,
        detail: "Keep modified installation",
      });
      continue;
    }
    if (decisions.get(group.id) === "backup-remove") {
      preview.push({
        action: "backup",
        path: displayRoot,
        detail: "Back up before removal",
      });
    }
    const remaining = group.receipt.intendedAgents.filter((agent) => !selected.has(agent));
    if (remaining.length === 0) {
      for (const target of group.targets) {
        preview.push({
          action: "remove",
          path: target.targetPath,
          detail: `${AGENTS[target.agent].label} target`,
        });
      }
      if (
        !group.targets.some((target) => resolve(target.targetPath) === resolve(group.physicalRoot))
      ) {
        preview.push({ action: "remove", path: displayRoot, detail: "Managed store" });
      }
      continue;
    }
    const plans = planNativeTargets(remaining, scope, context, projectRoot);
    if (group.strategy === "link") {
      preview.push({ action: "update", path: displayRoot, detail: "Update shared receipt" });
      for (const target of group.targets) {
        preview.push({
          action: "remove",
          path: target.targetPath,
          detail: "Remove old native link",
        });
      }
      for (const plan of plans) {
        preview.push({
          action: "link",
          path: plan.path,
          detail: `Link ${AGENTS[plan.owner].label} to ${displayRoot}`,
        });
      }
    } else {
      const currentTargets = new Set(group.targets.map((target) => resolve(target.targetPath)));
      const desired = new Set(plans.map((plan) => resolve(plan.path)));
      for (const plan of plans) {
        preview.push({
          action: currentTargets.has(resolve(plan.path)) ? "update" : "migrate",
          path: plan.path,
          detail: currentTargets.has(resolve(plan.path))
            ? "Update copy receipt"
            : `Copy installation for ${AGENTS[plan.owner].label}`,
        });
      }
      for (const target of group.targets) {
        if (!desired.has(resolve(target.targetPath))) {
          preview.push({ action: "remove", path: target.targetPath, detail: "Remove old copy" });
        }
      }
    }
  }

  let executed = false;
  return {
    preview,
    execute: async () => {
      if (executed) throw new Error("This prepared removal has already executed.");
      executed = true;
      const changed: string[] = [];

      await withTransaction(
        touched,
        async (transaction) => {
          for (const group of active) {
            const remaining = group.receipt.intendedAgents.filter((agent) => !selected.has(agent));
            if (decisions.get(group.id) === "backup-remove") {
              backups.push(await backupGroup(group, context));
            }

            if (remaining.length === 0) {
              for (const target of group.targets) {
                await transaction.beforeMutation(target.targetPath);
                await rm(target.targetPath, { recursive: true, force: true });
                changed.push(target.targetPath);
              }
              if (
                !group.targets.some(
                  (target) => resolve(target.targetPath) === resolve(group.physicalRoot),
                )
              ) {
                await transaction.beforeMutation(group.physicalRoot);
                await rm(group.physicalRoot, { recursive: true, force: true });
                changed.push(group.physicalRoot);
              }
              continue;
            }

            const plans = planNativeTargets(remaining, scope, context, projectRoot);
            if (group.strategy === "link") {
              await transaction.beforeMutation(group.physicalRoot);
              await writeReceipt(group.physicalRoot, {
                ...group.receipt,
                intendedAgents: remaining,
              });
              for (const target of group.targets) {
                await transaction.beforeMutation(target.targetPath);
                await rm(target.targetPath, { recursive: true, force: true });
                changed.push(target.targetPath);
              }
              for (const plan of plans) {
                await transaction.beforeMutation(plan.path);
                await createLink(plan.path, group.physicalRoot, context);
                changed.push(plan.path);
              }
            } else {
              const currentTargetPaths = new Set(
                group.targets.map((target) => resolve(target.targetPath)),
              );
              for (const plan of plans) {
                const receipt: Receipt = {
                  ...group.receipt,
                  intendedAgents: plan.intendedAgents,
                };
                await transaction.beforeMutation(plan.path);
                if (currentTargetPaths.has(resolve(plan.path))) {
                  await writeReceipt(plan.path, receipt);
                } else {
                  await mkdir(dirname(plan.path), { recursive: true });
                  await cp(group.physicalRoot, plan.path, { recursive: true, errorOnExist: true });
                  await writeReceipt(plan.path, receipt);
                }
                changed.push(plan.path);
              }
              const desired = new Set(plans.map((plan) => resolve(plan.path)));
              for (const target of group.targets) {
                if (!desired.has(resolve(target.targetPath))) {
                  await transaction.beforeMutation(target.targetPath);
                  await rm(target.targetPath, { recursive: true, force: true });
                  changed.push(target.targetPath);
                }
              }
            }
          }

          for (const group of active) {
            const remaining = group.receipt.intendedAgents.filter((agent) => !selected.has(agent));
            if (remaining.length === 0) {
              for (const target of group.targets) {
                if (await exists(target.targetPath)) {
                  throw new UserFacingError(
                    `Verification found a remaining target at ${target.targetPath}.`,
                    "The operation was rolled back.",
                  );
                }
              }
              continue;
            }
            for (const plan of planNativeTargets(remaining, scope, context, projectRoot)) {
              await verifyManagedTarget(
                plan.owner,
                scope,
                context,
                projectRoot,
                plan.intendedAgents,
              );
            }
          }
        },
        {
          precondition: () => verifyFingerprints(fingerprints),
          pathPrecondition: (path) => verifyFingerprint(path, fingerprints.get(path)),
        },
      );

      return { changed: [...new Set(changed)], skipped, backups, notes: [...notes] };
    },
  };
}

export async function removeSkill(options: RemoveOptions): Promise<OperationResult> {
  return (await prepareRemoveSkill(options)).execute();
}

export async function getManagedInstallations(
  scope: Scope,
  context: RuntimeContext,
  projectRoot?: string,
): Promise<InstallationGroup[]> {
  return (await scanScope(scope, context, projectRoot)).groups;
}

export async function getUnmanagedTargets(
  scope: Scope,
  context: RuntimeContext,
  projectRoot?: string,
): Promise<TargetInspection[]> {
  const scanned = await scanScope(scope, context, projectRoot);
  return scanned.inspections.filter(
    (inspection) => inspection.exists && (!inspection.receipt || inspection.brokenLink),
  );
}
