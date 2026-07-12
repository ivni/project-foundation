import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRuntimeContext } from "../src/agents.ts";
import type { RuntimeContext } from "../src/types.ts";

export interface TestWorkspace {
  root: string;
  project: string;
  payload: string;
  context: RuntimeContext;
  cleanup: () => Promise<void>;
}

export async function createTestWorkspace(version = "1.0.0"): Promise<TestWorkspace> {
  const root = await mkdtemp(join(tmpdir(), "project-foundation-test-"));
  const home = join(root, "home");
  const project = join(root, "project");
  const payload = join(root, "payload");
  await Promise.all([
    mkdir(home, { recursive: true }),
    mkdir(project, { recursive: true }),
    mkdir(join(payload, "agents"), { recursive: true }),
    mkdir(join(payload, "references"), { recursive: true }),
    mkdir(join(payload, "templates"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(join(payload, "SKILL.md"), "# Project Foundation\n\nVersion one.\n"),
    writeFile(join(payload, "agents", "openai.yaml"), "name: Project Foundation\n"),
    writeFile(join(payload, "references", "guide.md"), "Guide one.\n"),
    writeFile(join(payload, "templates", "brief.md"), "Brief one.\n"),
  ]);
  const context = createRuntimeContext({
    cwd: project,
    home,
    payloadRoot: payload,
    version,
    env: {
      LOCALAPPDATA: join(root, "data"),
      XDG_CONFIG_HOME: join(root, "config"),
      XDG_DATA_HOME: join(root, "data"),
    },
  });
  return {
    root,
    project,
    payload,
    context,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}
