import { describe, expect, test } from "bun:test";
import { getTargetPath } from "../src/agents.ts";
import { planNativeTargets } from "../src/topology.ts";
import { createTestWorkspace } from "./helpers.ts";

describe("native target planning", () => {
  test("deduplicates agents that discover Codex skill paths", async () => {
    const workspace = await createTestWorkspace();
    try {
      const plans = planNativeTargets(["codex", "pi", "opencode"], "user", workspace.context);
      expect(plans).toHaveLength(1);
      expect(plans[0]?.owner).toBe("codex");
      expect(plans[0]?.intendedAgents).toEqual(["codex", "pi", "opencode"]);
    } finally {
      await workspace.cleanup();
    }
  });

  test("uses Claude as the shared location for Claude and OpenCode", async () => {
    const workspace = await createTestWorkspace();
    try {
      const plans = planNativeTargets(["claude", "opencode"], "user", workspace.context);
      expect(plans).toEqual([
        {
          owner: "claude",
          intendedAgents: ["claude", "opencode"],
          path: getTargetPath("claude", "user", workspace.context),
        },
      ]);
    } finally {
      await workspace.cleanup();
    }
  });
});
