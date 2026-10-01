import { expect, test } from "bun:test";
import { join } from "node:path";
import { getTargetPath } from "../src/agents.ts";
import { installSkill, removeSkill } from "../src/operations.ts";
import { payloadMatches, readReceipt, snapshotPackagedPayload } from "../src/payload.ts";
import { createTestWorkspace } from "./helpers.ts";

test.each([
  "copy",
  "link",
] as const)("installs real feature payloads independently and removes only the selected %s installation", async (strategy) => {
  const workspace = await createTestWorkspace();
  const targets: string[] = [];
  try {
    for (const skillId of ["plan-feature", "run-feature-stage"] as const) {
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
  } finally {
    await workspace.cleanup();
  }
});
