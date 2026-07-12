import { AGENTS, getTargetPath } from "./agents.ts";
import type { AgentId, RuntimeContext, Scope } from "./types.ts";

const TARGET_PRIORITY: AgentId[] = ["codex", "claude", "pi", "opencode", "hermes"];

export interface PlannedTarget {
  owner: AgentId;
  intendedAgents: AgentId[];
  path: string;
}

export function planNativeTargets(
  intendedAgents: AgentId[],
  scope: Scope,
  context: RuntimeContext,
  projectRoot?: string,
): PlannedTarget[] {
  const remaining = new Set(intendedAgents);
  const targets: PlannedTarget[] = [];

  for (const owner of TARGET_PRIORITY) {
    if (!remaining.has(owner)) continue;
    if (scope === "project" && !AGENTS[owner].projectDirectory) continue;
    const covered = AGENTS[owner].discoveredBy.filter((agent) => remaining.has(agent));
    if (covered.length === 0) continue;
    targets.push({
      owner,
      intendedAgents: covered,
      path: getTargetPath(owner, scope, context, projectRoot),
    });
    for (const agent of covered) remaining.delete(agent);
  }

  return targets;
}

export function agentsCoveredByOwner(owner: AgentId, candidates: AgentId[]): AgentId[] {
  return AGENTS[owner].discoveredBy.filter((agent) => candidates.includes(agent));
}
