import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { AgentId, RuntimeContext, Scope } from "./types.ts";

export interface AgentDefinition {
  id: AgentId;
  label: string;
  command: string;
  projectDirectory?: string;
  userDirectory: (context: RuntimeContext) => string;
  discoveredBy: AgentId[];
  manualCheck: string;
}

export const AGENTS: Record<AgentId, AgentDefinition> = {
  codex: {
    id: "codex",
    label: "Codex",
    command: "codex",
    projectDirectory: join(".agents", "skills"),
    userDirectory: ({ home }) => join(home, ".agents", "skills"),
    discoveredBy: ["codex", "pi", "opencode"],
    manualCheck: "Open the skills picker or type $project-foundation.",
  },
  claude: {
    id: "claude",
    label: "Claude Code",
    command: "claude",
    projectDirectory: join(".claude", "skills"),
    userDirectory: ({ home }) => join(home, ".claude", "skills"),
    discoveredBy: ["claude", "opencode"],
    manualCheck: "Start Claude Code and run /project-foundation.",
  },
  pi: {
    id: "pi",
    label: "Pi",
    command: "pi",
    projectDirectory: join(".pi", "skills"),
    userDirectory: ({ home }) => join(home, ".pi", "agent", "skills"),
    discoveredBy: ["pi"],
    manualCheck: "Start Pi and run /skill:project-foundation.",
  },
  opencode: {
    id: "opencode",
    label: "OpenCode",
    command: "opencode",
    projectDirectory: join(".opencode", "skills"),
    userDirectory: ({ home, env }) =>
      join(env.XDG_CONFIG_HOME || join(home, ".config"), "opencode", "skills"),
    discoveredBy: ["opencode"],
    manualCheck: "Start OpenCode and ask it to use project-foundation.",
  },
  hermes: {
    id: "hermes",
    label: "Hermes",
    command: "hermes",
    userDirectory: ({ home }) => join(home, ".hermes", "skills"),
    discoveredBy: ["hermes"],
    manualCheck: "Start Hermes and run /project-foundation.",
  },
};

export function createRuntimeContext(overrides: Partial<RuntimeContext> = {}): RuntimeContext {
  const env = { ...process.env } as Record<string, string | undefined>;
  return {
    cwd: overrides.cwd ?? process.cwd(),
    home: overrides.home ?? homedir(),
    platform: overrides.platform ?? process.platform,
    env: overrides.env ?? env,
    payloadRoot: overrides.payloadRoot ?? "",
    version: overrides.version ?? "1.0.1",
  };
}

export function getTargetDirectory(
  agent: AgentId,
  scope: Scope,
  context: RuntimeContext,
  projectRoot?: string,
): string {
  const definition = AGENTS[agent];
  if (scope === "project") {
    if (!definition.projectDirectory) {
      throw new Error(`${definition.label} does not support project scope.`);
    }
    if (!projectRoot) {
      throw new Error("Project root is required for project scope.");
    }
    return resolve(projectRoot, definition.projectDirectory);
  }
  return resolve(definition.userDirectory(context));
}

export function getTargetPath(
  agent: AgentId,
  scope: Scope,
  context: RuntimeContext,
  projectRoot?: string,
): string {
  return join(getTargetDirectory(agent, scope, context, projectRoot), "project-foundation");
}

export function getUserDataRoot(context: RuntimeContext): string {
  if (context.platform === "win32") {
    return resolve(
      context.env.LOCALAPPDATA || join(context.home, "AppData", "Local"),
      "project-foundation",
    );
  }
  if (context.platform === "darwin") {
    return resolve(context.home, "Library", "Application Support", "project-foundation");
  }
  return resolve(
    context.env.XDG_DATA_HOME || join(context.home, ".local", "share"),
    "project-foundation",
  );
}

export function getManagedStore(
  scope: Scope,
  context: RuntimeContext,
  projectRoot?: string,
): string {
  if (scope === "project") {
    if (!projectRoot) throw new Error("Project root is required for project scope.");
    return resolve(projectRoot, ".agents", "project-foundation", "skill");
  }
  return join(getUserDataRoot(context), "store", "skill");
}

export function detectAgent(agent: AgentId, context: RuntimeContext): boolean {
  const definition = AGENTS[agent];
  if (Bun.which(definition.command)) return true;
  const userSkillDirectory = definition.userDirectory(context);
  return existsSync(userSkillDirectory) || existsSync(dirname(userSkillDirectory));
}

export function findProjectRoot(cwd: string): string {
  if (!Bun.which("git")) return resolve(cwd);
  const result = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], {
    cwd,
    stdout: "pipe",
    stderr: "ignore",
  });
  if (result.exitCode === 0) {
    const root = result.stdout.toString().trim();
    if (root) return resolve(root);
  }
  return resolve(cwd);
}
