import { expect, test } from "bun:test";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getTargetPath } from "../src/agents.ts";
import { installSkill, removeSkill, updateSkill } from "../src/operations.ts";
import { payloadMatches, readReceipt, snapshotPackagedPayload } from "../src/payload.ts";
import { AGENT_IDS, type AgentId, type Scope, type Strategy } from "../src/types.ts";
import { createTestWorkspace } from "./helpers.ts";

test.each([
  "copy",
  "link",
] as const)("installs real feature payloads independently and removes only the selected %s installation", async (strategy) => {
  const workspace = await createTestWorkspace();
  const targets: string[] = [];
  try {
    for (const skillId of ["plan-feature", "run-feature-stage", "run-feature"] as const) {
      const payloadRoot = join(import.meta.dir, "..", "..", skillId);
      const context = { ...workspace.context, payloadRoot };
      await installSkill({ skillId, agents: ["codex"], scope: "user", strategy, context });
      const target = getTargetPath("codex", "user", context, skillId);
      targets.push(target);
      const snapshot = await snapshotPackagedPayload(payloadRoot);
      expect(await payloadMatches(target, snapshot)).toBe(true);
      expect(await readReceipt(target)).toMatchObject({ skillId, strategy });
      expect(await Bun.file(join(target, "references", "feature-workflow.md")).exists()).toBe(true);
    }

    expect(targets[0]).not.toBe(targets[1]);
    const planner = targets[0] as string;
    const executor = targets[1] as string;
    const orchestrator = targets[2] as string;
    expect(await Bun.file(join(orchestrator, "scripts", "orchestrator.ts")).exists()).toBe(true);
    expect(await Bun.file(join(planner, "assets", "feature-issue.md")).exists()).toBe(true);
    await removeSkill({
      skillId: "plan-feature",
      agents: ["codex"],
      scope: "user",
      context: {
        ...workspace.context,
        payloadRoot: join(import.meta.dir, "..", "..", "plan-feature"),
      },
    });
    expect(await Bun.file(join(planner, "SKILL.md")).exists()).toBe(false);
    expect(await Bun.file(join(executor, "SKILL.md")).exists()).toBe(true);
    expect(await readReceipt(executor)).toMatchObject({ skillId: "run-feature-stage", strategy });
    await removeSkill({
      skillId: "run-feature",
      agents: ["codex"],
      scope: "user",
      context: {
        ...workspace.context,
        payloadRoot: join(import.meta.dir, "..", "..", "run-feature"),
      },
    });
    expect(await Bun.file(join(orchestrator, "SKILL.md")).exists()).toBe(false);
    expect(await Bun.file(join(executor, "SKILL.md")).exists()).toBe(true);
  } finally {
    await workspace.cleanup();
  }
});

const workflows = [
  {
    orchestrator: "run-feature",
    executor: "run-feature-stage",
    requiredFiles: [
      "scripts/orchestrator.ts",
      "scripts/host-worker.ts",
      "references/feature-workflow.md",
      "references/issue-publication.md",
      "references/codex.md",
      "references/claude-code.md",
      "references/pi.md",
      "references/opencode.md",
      "references/hermes.md",
    ],
  },
  {
    orchestrator: "run-phase",
    executor: "run-subphase",
    requiredFiles: [
      "references/phase-workflow.md",
      "references/subphase-contract.md",
      "references/hosts.md",
    ],
  },
] as const;
const matrix: ((typeof workflows)[number] & {
  agent: AgentId;
  scope: Scope;
  strategy: Strategy;
  name: string;
})[] = [];
for (const workflow of workflows)
  for (const agent of AGENT_IDS)
    for (const scope of ["user", "project"] as const)
      for (const strategy of ["copy", "link"] as const)
        if (agent !== "hermes" || scope === "user")
          matrix.push({
            ...workflow,
            agent,
            scope,
            strategy,
            name: `${workflow.orchestrator}/${agent}/${scope}/${strategy}`,
          });

test.each(
  matrix,
)("orchestrator payload install/update/remove preserves its executor: $name", async ({
  agent,
  scope,
  strategy,
  orchestrator,
  executor,
  requiredFiles,
}) => {
  const workspace = await createTestWorkspace();
  try {
    const location = scope === "project" ? { projectRoot: workspace.project } : {};
    const payloadRoot = join(workspace.root, `packaged-${orchestrator}`);
    await cp(join(import.meta.dir, "..", "..", orchestrator), payloadRoot, { recursive: true });
    const context = { ...workspace.context, payloadRoot };
    const stageContext = {
      ...workspace.context,
      payloadRoot: join(import.meta.dir, "..", "..", executor),
    };
    await installSkill({
      skillId: executor,
      agents: [agent],
      scope,
      strategy,
      context: stageContext,
      ...location,
    });
    await installSkill({
      skillId: orchestrator,
      agents: [agent],
      scope,
      strategy,
      context,
      ...location,
    });
    const target = getTargetPath(agent, scope, context, orchestrator, location.projectRoot);
    const stage = getTargetPath(agent, scope, stageContext, executor, location.projectRoot);
    const stageSnapshot = await snapshotPackagedPayload(stageContext.payloadRoot);
    expect(await payloadMatches(target, await snapshotPackagedPayload(payloadRoot))).toBe(true);
    expect(await readReceipt(target)).toMatchObject({
      skillId: orchestrator,
      strategy,
      version: "1.0.0",
    });
    for (const path of requiredFiles)
      expect(await Bun.file(join(target, path)).exists()).toBe(true);
    expect(await readFile(join(target, "agents/openai.yaml"), "utf8")).toContain(
      "allow_implicit_invocation: true",
    );

    await mkdir(join(payloadRoot, "assets"), { recursive: true });
    await writeFile(join(payloadRoot, "assets/matrix-update.txt"), "Isolated payload update.\n");
    const updatedContext = { ...context, version: "1.1.0" };
    await updateSkill({ skillId: orchestrator, scope, context: updatedContext, ...location });
    expect(await payloadMatches(target, await snapshotPackagedPayload(payloadRoot))).toBe(true);
    expect(await readReceipt(target)).toMatchObject({
      skillId: orchestrator,
      strategy,
      version: "1.1.0",
    });
    expect(await readFile(join(target, "assets/matrix-update.txt"), "utf8")).toBe(
      "Isolated payload update.\n",
    );
    expect(await payloadMatches(stage, stageSnapshot)).toBe(true);

    await removeSkill({
      skillId: orchestrator,
      agents: [agent],
      scope,
      context: updatedContext,
      ...location,
    });
    expect(await Bun.file(join(target, "SKILL.md")).exists()).toBe(false);
    expect(await payloadMatches(stage, stageSnapshot)).toBe(true);
    expect(await readReceipt(stage)).toMatchObject({
      skillId: executor,
      strategy,
      version: "1.0.0",
    });
  } finally {
    await workspace.cleanup();
  }
});
