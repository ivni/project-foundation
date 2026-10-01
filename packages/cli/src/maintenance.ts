import { AGENTS } from "./agents.ts";
import { compareVersions, getManagedInstallations, needsPackageUpdate } from "./operations.ts";
import { hashSnapshot, resolvePublishedPayloadRoot, snapshotPackagedPayload } from "./payload.ts";
import { SKILL_IDS } from "./skills.ts";
import type {
  AgentId,
  InstallationGroup,
  RuntimeContext,
  Scope,
  SkillId,
  Strategy,
} from "./types.ts";
import { AGENT_IDS } from "./types.ts";

export interface ManagedSkillGroup {
  key: string;
  skillId: SkillId;
  group: InstallationGroup;
}

export interface InstallationConfiguration {
  key: string;
  scope: Scope;
  projectRoot?: string;
  agents: AgentId[];
  strategy: Strategy;
}

export type MaintenanceAction =
  | { key: string; kind: "update"; skillId: SkillId; group: InstallationGroup }
  | { key: string; kind: "add"; skillId: SkillId; agents: AgentId[] };

export async function scanManagedSkills(
  ctx: RuntimeContext,
  scope: Scope,
  projectRoot?: string,
): Promise<ManagedSkillGroup[]> {
  const groups = await Promise.all(
    SKILL_IDS.map(async (skillId) => {
      const installations = await getManagedInstallations(scope, ctx, skillId, projectRoot);
      return installations.map((group) => ({ key: `${skillId}:${group.id}`, skillId, group }));
    }),
  );
  return groups.flat();
}

export async function discoverConfigurations(
  ctx: RuntimeContext,
  projectRoot: string,
): Promise<InstallationConfiguration[]> {
  const scans = await Promise.all([
    scanManagedSkills(ctx, "user"),
    scanManagedSkills(ctx, "project", projectRoot),
  ]);
  const configurations = new Map<string, InstallationConfiguration>();
  for (const { group } of scans.flat()) {
    const root = group.scope === "project" ? projectRoot : undefined;
    const key = `${group.scope}:${root ?? ""}:${group.strategy}`;
    const existing = configurations.get(key);
    const agents = AGENT_IDS.filter(
      (agent) => group.receipt.intendedAgents.includes(agent) || existing?.agents.includes(agent),
    );
    if (agents.length === 0) continue;
    configurations.set(key, {
      key,
      agents,
      scope: group.scope,
      strategy: group.strategy,
      ...(root ? { projectRoot: root } : {}),
    });
  }
  return [...configurations.values()];
}

export async function getMaintenanceCatalog(
  ctx: RuntimeContext,
  configuration: InstallationConfiguration,
  payloadRootForSkill: (skillId: SkillId) => string = resolvePublishedPayloadRoot,
): Promise<{
  actions: MaintenanceAction[];
  initialValues: string[];
  current: ManagedSkillGroup[];
  newer: ManagedSkillGroup[];
}> {
  const groups = await scanManagedSkills(ctx, configuration.scope, configuration.projectRoot);
  const relevant = groups.filter(({ group }) =>
    group.targets.some((target) =>
      AGENTS[target.agent].discoveredBy.some((agent) => configuration.agents.includes(agent)),
    ),
  );
  const payloadHashes = new Map(
    await Promise.all(
      SKILL_IDS.map(
        async (skillId) =>
          [
            skillId,
            hashSnapshot(await snapshotPackagedPayload(payloadRootForSkill(skillId))),
          ] as const,
      ),
    ),
  );
  const actions: MaintenanceAction[] = [];
  const current: ManagedSkillGroup[] = [];
  const newer: ManagedSkillGroup[] = [];
  for (const entry of relevant) {
    if (compareVersions(entry.group.receipt.version, ctx.version) > 0) {
      newer.push(entry);
    } else if (
      needsPackageUpdate(entry.group.receipt, ctx.version, payloadHashes.get(entry.skillId) ?? "")
    ) {
      actions.push({
        key: `update:${entry.key}`,
        kind: "update",
        skillId: entry.skillId,
        group: entry.group,
      });
    } else {
      current.push(entry);
    }
  }
  for (const skillId of SKILL_IDS) {
    const covered = new Set(
      groups
        .filter((entry) => entry.skillId === skillId)
        .flatMap(({ group }) =>
          group.targets.flatMap((target) => AGENTS[target.agent].discoveredBy),
        ),
    );
    const missing = configuration.agents.filter((agent) => !covered.has(agent));
    if (missing.length > 0) {
      actions.push({ key: `add:${skillId}`, kind: "add", skillId, agents: missing });
    }
  }
  return {
    actions,
    current,
    newer,
    initialValues: actions
      .filter((action) => relevant.length === 0 || action.kind === "update")
      .map((action) => action.key),
  };
}
