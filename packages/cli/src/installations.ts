import { lstat, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { getManagedStore, getTargetPath } from "./agents.ts";
import { hashSnapshot, readReceipt, snapshotPayload } from "./payload.ts";
import type {
  AgentId,
  InstallationGroup,
  RuntimeContext,
  Scope,
  TargetInspection,
} from "./types.ts";
import { AGENT_IDS } from "./types.ts";

async function statOrUndefined(
  path: string,
): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
  try {
    return await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function samePath(left: string, right: string, context: RuntimeContext): boolean {
  const a = resolve(left);
  const b = resolve(right);
  return context.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

async function isCanonicalManagedStore(
  physicalRoot: string,
  expectedStore: string,
  context: RuntimeContext,
): Promise<boolean> {
  const storeEntry = await statOrUndefined(expectedStore);
  if (!storeEntry?.isDirectory() || storeEntry.isSymbolicLink()) return false;
  return samePath(physicalRoot, await realpath(expectedStore), context);
}

export async function inspectTarget(
  agent: AgentId,
  scope: Scope,
  context: RuntimeContext,
  projectRoot?: string,
): Promise<TargetInspection> {
  const targetPath = getTargetPath(agent, scope, context, projectRoot);
  const stat = await statOrUndefined(targetPath);
  if (!stat) {
    return {
      agent,
      targetPath,
      exists: false,
      link: false,
      brokenLink: false,
      physicalRoot: targetPath,
      modified: false,
    };
  }

  const link = stat.isSymbolicLink();
  let physicalRoot = targetPath;
  if (link) {
    try {
      physicalRoot = resolve(await realpath(targetPath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          agent,
          targetPath,
          exists: true,
          link: true,
          brokenLink: true,
          physicalRoot: targetPath,
          modified: false,
        };
      }
      throw error;
    }
  }

  let receipt = await readReceipt(physicalRoot);
  if (receipt) {
    const linkIsCanonical =
      receipt.strategy === "link" &&
      link &&
      (await isCanonicalManagedStore(
        physicalRoot,
        getManagedStore(scope, context, projectRoot),
        context,
      ));
    const topologyIsManaged =
      receipt.scope === scope &&
      ((receipt.strategy === "copy" && !link && samePath(physicalRoot, targetPath, context)) ||
        linkIsCanonical);
    if (!topologyIsManaged) receipt = undefined;
  }
  let currentFiles: Record<string, string> | undefined;
  let modified = false;
  if (receipt) {
    currentFiles = await snapshotPayload(physicalRoot);
    modified = hashSnapshot(currentFiles) !== receipt.payloadHash;
  }

  return {
    agent,
    targetPath,
    exists: true,
    link,
    brokenLink: false,
    physicalRoot,
    receipt,
    modified,
    currentFiles,
  };
}

export async function scanScope(
  scope: Scope,
  context: RuntimeContext,
  projectRoot?: string,
): Promise<{ inspections: TargetInspection[]; groups: InstallationGroup[] }> {
  const supported = AGENT_IDS.filter((agent) => !(scope === "project" && agent === "hermes"));
  const inspections = await Promise.all(
    supported.map((agent) => inspectTarget(agent, scope, context, projectRoot)),
  );
  const grouped = new Map<string, TargetInspection[]>();

  for (const inspection of inspections) {
    if (!inspection.exists || inspection.brokenLink || !inspection.receipt) continue;
    const existing = grouped.get(inspection.physicalRoot) ?? [];
    existing.push(inspection);
    grouped.set(inspection.physicalRoot, existing);
  }

  const groups: InstallationGroup[] = [];
  for (const [physicalRoot, targets] of grouped) {
    const receipt = targets[0]?.receipt;
    if (!receipt) continue;
    groups.push({
      id: physicalRoot,
      physicalRoot,
      scope,
      strategy: receipt.strategy,
      receipt,
      targets,
      modified: targets.some((target) => target.modified),
    });
  }

  return {
    inspections,
    groups: groups.sort((a, b) => a.physicalRoot.localeCompare(b.physicalRoot)),
  };
}
