#!/usr/bin/env bun

import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import packageJson from "../../../package.json";
import {
  AGENTS,
  createRuntimeContext,
  detectAgent,
  findProjectRoot,
  getTargetPath,
} from "./agents.ts";
import type { CleanupPreset } from "./backups.ts";
import { deleteBackups, listBackups, selectBackupsForCleanup } from "./backups.ts";
import { previewDiff } from "./diff.ts";
import {
  compareVersions,
  getManagedInstallations,
  prepareInstallSkill,
  prepareRemoveSkill,
  prepareUpdateSkill,
} from "./operations.ts";
import { resolvePublishedPayloadRoot } from "./payload.ts";
import { isRecoverableLinkPermissionError } from "./transaction.ts";
import type {
  AgentId,
  ConflictAction,
  InstallationGroup,
  ModifiedRemoveAction,
  ModifiedUpdateAction,
  MutationPreviewEntry,
  OperationHooks,
  OperationResult,
  RuntimeContext,
  Scope,
  Strategy,
  TargetInspection,
} from "./types.ts";
import { AGENT_IDS, CancelledError, UserFacingError } from "./types.ts";
import {
  confirm,
  failure,
  info,
  intro,
  multiselect,
  note,
  outro,
  select,
  showDiff,
  text,
  theme,
  warn,
} from "./ui.ts";

type MainAction = "install" | "update" | "remove" | "exit";
const debugEnabled = process.argv.includes("--debug");

async function pathIsDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

function context(): RuntimeContext {
  return createRuntimeContext({
    payloadRoot: resolvePublishedPayloadRoot(),
    version: packageJson.version,
  });
}

function agentChoices(scope?: Scope) {
  return AGENT_IDS.map((agent) => ({
    value: agent,
    label: AGENTS[agent].label,
    hint: scope === "project" && agent === "hermes" ? "User scope only" : undefined,
    disabled: scope === "project" && agent === "hermes",
  }));
}

async function chooseScope(initialValue: Scope = "user"): Promise<Scope> {
  return select({
    message: "Where should the skill be available?",
    initialValue,
    choices: [
      { value: "user", label: "User", hint: "Available across projects" },
      { value: "project", label: "Project", hint: "Stored inside one project" },
    ],
  });
}

async function chooseProjectRoot(ctx: RuntimeContext): Promise<string> {
  const detected = findProjectRoot(ctx.cwd);
  const projectRoot = resolve(
    await text({
      message: "Project root",
      defaultValue: detected,
      validate: (value) => (!value?.trim() ? "Enter a project directory." : undefined),
    }),
  );
  if (!(await pathIsDirectory(projectRoot))) {
    throw new UserFacingError(`Project directory does not exist: ${projectRoot}`);
  }
  return projectRoot;
}

function hooks(): OperationHooks {
  return {
    onExistingConflict: async (
      inspection: TargetInspection,
      diff: string,
    ): Promise<ConflictAction> => {
      if (!diff.trim()) {
        info(`Existing matching skill found at ${inspection.targetPath}. It will be adopted.`);
        return "adopt";
      }
      while (true) {
        const choices = inspection.inspectionError
          ? [
              { value: "show" as const, label: "Show inspection error" },
              { value: "backup-replace" as const, label: "Remove and back up" },
              { value: "leave" as const, label: "Keep", hint: "Skip this target" },
            ]
          : [
              {
                value: "show" as const,
                label: "Show diff",
                hint: previewDiff(diff, 3).split("\n")[0],
              },
              {
                value: "replace" as const,
                label: "Remove",
                hint: "Replace with the packaged skill",
              },
              { value: "backup-replace" as const, label: "Remove and back up" },
              { value: "leave" as const, label: "Keep", hint: "Skip this target" },
            ];
        const action = await select<"show" | ConflictAction>({
          message: `Existing content at ${inspection.targetPath}`,
          initialValue: "show",
          choices,
        });
        if (action === "show") await showDiff(diff);
        else return action;
      }
    },
    onModifiedUpdate: async (
      group: InstallationGroup,
      diff: string,
    ): Promise<ModifiedUpdateAction> => {
      while (true) {
        const action = await select<"show" | ModifiedUpdateAction>({
          message: `Local changes found at ${group.physicalRoot}`,
          initialValue: "show",
          choices: [
            { value: "show", label: "Show diff" },
            { value: "replace", label: "Update", hint: "Discard local changes" },
            { value: "backup-replace", label: "Back up and update" },
            { value: "skip", label: "Skip" },
          ],
        });
        if (action === "show") await showDiff(diff);
        else return action;
      }
    },
    onModifiedRemove: async (
      group: InstallationGroup,
      diff: string,
    ): Promise<ModifiedRemoveAction> => {
      while (true) {
        const action = await select<"show" | ModifiedRemoveAction>({
          message: `Local changes found at ${group.physicalRoot}`,
          initialValue: "show",
          choices: [
            { value: "show", label: "Show diff" },
            { value: "remove", label: "Remove" },
            { value: "backup-remove", label: "Back up and remove" },
            { value: "keep", label: "Keep" },
          ],
        });
        if (action === "show") await showDiff(diff);
        else return action;
      }
    },
  };
}

function formatTargets(agents: AgentId[], scope: Scope, ctx: RuntimeContext, projectRoot?: string) {
  return agents.map(
    (agent) => `${AGENTS[agent].label}: ${getTargetPath(agent, scope, ctx, projectRoot)}`,
  );
}

async function maybeCleanBackups(ctx: RuntimeContext, result: OperationResult): Promise<void> {
  if (result.backups.length === 0) return;
  note(
    "Backups created",
    result.backups.map((backup) => backup.path),
  );
  if (!(await confirm("Review backup retention now?", false))) return;
  const all = await listBackups(ctx);
  const preset = await select<CleanupPreset>({
    message: "Backup retention",
    initialValue: "keep-all",
    choices: [
      { value: "keep-all", label: "Keep all" },
      { value: "keep-three", label: "Keep latest 3", hint: "Per agent and scope" },
      { value: "older-than-30-days", label: "Remove older than 30 days" },
      { value: "delete-all", label: "Remove all backups" },
    ],
  });
  const removals = selectBackupsForCleanup(all, preset);
  if (removals.length === 0) {
    info("No backups selected for removal.");
    return;
  }
  note(
    "Backups to remove",
    removals.map((backup) => `${backup.path} (${formatBytes(backup.bytes)})`),
  );
  if (
    await confirm(`Remove ${removals.length} backup${removals.length === 1 ? "" : "s"}?`, false)
  ) {
    await deleteBackups(removals, ctx);
    info("Backup cleanup complete.");
  }
}

function reportResult(result: OperationResult, verb: string): void {
  if (result.changed.length > 0) note(`${verb} paths`, result.changed);
  if (result.skipped.length > 0) note("Skipped", result.skipped);
  for (const message of result.notes) info(message);
}

function previewLines(entries: MutationPreviewEntry[]): string[] {
  if (entries.length === 0) return ["No filesystem mutations are planned."];
  return entries.map((entry) => `${entry.action.toUpperCase()}: ${entry.path} (${entry.detail})`);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function confirmScopeCoexistence(options: {
  agents: AgentId[];
  scope: Scope;
  projectRoot?: string;
  context: RuntimeContext;
}): Promise<void> {
  const otherScope: Scope = options.scope === "user" ? "project" : "user";
  const otherProjectRoot =
    otherScope === "project" ? findProjectRoot(options.context.cwd) : undefined;
  const groups = await getManagedInstallations(otherScope, options.context, otherProjectRoot);
  const overlapping = [
    ...new Set(
      groups
        .flatMap((group) => group.receipt.intendedAgents)
        .filter((agent) => options.agents.includes(agent)),
    ),
  ];
  if (overlapping.length === 0) return;
  const labels = overlapping.map((agent) => AGENTS[agent].label).join(", ");
  note("Both scopes will contain this skill", [
    `Existing ${otherScope} scope: ${labels}`,
    `New ${options.scope} scope: ${labels}`,
    "Agent precedence rules decide which same-name skill is selected.",
  ]);
  if (!(await confirm("Continue with both scopes?"))) throw new CancelledError();
}

async function installFlow(ctx: RuntimeContext): Promise<void> {
  const detected = AGENT_IDS.filter((agent) => detectAgent(agent, ctx));
  let agents = await multiselect<AgentId>({
    message: "Choose agent environments",
    choices: agentChoices(),
    initialValues: detected,
    required: true,
  });
  let scope = await chooseScope();
  if (scope === "project" && agents.includes("hermes")) {
    warn("Hermes has no project-scoped skill directory, so it was removed from this selection.");
    agents = agents.filter((agent) => agent !== "hermes");
    if (agents.length === 0) throw new UserFacingError("No project-compatible agents remain.");
  }
  let projectRoot = scope === "project" ? await chooseProjectRoot(ctx) : undefined;
  let strategy: Strategy = await select({
    message: "How should files be installed?",
    initialValue: "link",
    choices: [
      { value: "link", label: "Link", hint: "One managed copy, shared by selected agents" },
      { value: "copy", label: "Copy", hint: "Independent files in each native location" },
    ],
  });

  while (true) {
    note("Selection", [
      `Scope: ${scope}`,
      `Method: ${strategy}`,
      ...formatTargets(agents, scope, ctx, projectRoot),
      "No mutating Git commands or .git writes. Project scope can change the working tree.",
    ]);
    const action = await select({
      message: "Continue to exact preflight?",
      initialValue: "install",
      choices: [
        { value: "install", label: "Review exact changes" },
        { value: "agents", label: "Change agents" },
        { value: "scope", label: "Change scope" },
        { value: "strategy", label: "Change method" },
        { value: "cancel", label: "Cancel" },
      ],
    });
    if (action === "cancel") throw new CancelledError();
    if (action === "agents") {
      agents = await multiselect({
        message: "Choose agent environments",
        choices: agentChoices(scope),
        initialValues: agents.filter((agent) => !(scope === "project" && agent === "hermes")),
        required: true,
      });
      continue;
    }
    if (action === "scope") {
      scope = await chooseScope(scope);
      if (scope === "project") {
        agents = agents.filter((agent) => agent !== "hermes");
        projectRoot = await chooseProjectRoot(ctx);
      } else projectRoot = undefined;
      continue;
    }
    if (action === "strategy") {
      strategy = await select({
        message: "How should files be installed?",
        initialValue: strategy,
        choices: [
          { value: "link", label: "Link" },
          { value: "copy", label: "Copy" },
        ],
      });
      continue;
    }
    break;
  }

  if (projectRoot && !(await pathIsDirectory(projectRoot))) {
    throw new UserFacingError(`Project directory does not exist: ${projectRoot}`);
  }
  await confirmScopeCoexistence({
    agents,
    scope,
    context: ctx,
    ...(projectRoot ? { projectRoot } : {}),
  });
  let result: OperationResult;
  while (true) {
    try {
      const prepared = await prepareInstallSkill({
        agents,
        scope,
        strategy,
        context: ctx,
        ...(projectRoot ? { projectRoot } : {}),
        hooks: hooks(),
      });
      note("Exact mutation preview", previewLines(prepared.preview));
      if (!(await confirm("Apply exactly these changes?"))) throw new CancelledError();
      info("Applying the installation plan...");
      result = await prepared.execute();
      break;
    } catch (error) {
      if (
        ctx.platform !== "win32" ||
        strategy !== "link" ||
        !isRecoverableLinkPermissionError(error)
      ) {
        throw error;
      }
      while (true) {
        const fallback = await select({
          message: "Windows could not create directory links",
          initialValue: "copy",
          choices: [
            { value: "copy", label: "Install copies instead" },
            { value: "help", label: "Show help" },
            { value: "cancel", label: "Cancel" },
          ],
        });
        if (fallback === "cancel") throw new CancelledError();
        if (fallback === "help") {
          note("Allow directory junctions on Windows", [
            "Project Foundation uses directory junctions, which normally do not need Developer Mode.",
            "Check write access to the target and whether endpoint policy blocks junctions.",
            "You can use the copy strategy when directory links are restricted.",
            "The installer never elevates itself.",
          ]);
          continue;
        }
        strategy = "copy";
        info("Continuing with copy strategy.");
        break;
      }
    }
  }
  reportResult(result, "Installed");
  await maybeCleanBackups(ctx, result);
  if (await confirm("Show agent discovery checks?", false)) {
    note(
      "Check the installation",
      agents.map((agent) => `${AGENTS[agent].label}: ${AGENTS[agent].manualCheck}`),
    );
  }
  outro("Project Foundation is ready.");
}

async function chooseManagedScope(ctx: RuntimeContext): Promise<{
  scope: Scope;
  projectRoot?: string;
  groups: InstallationGroup[];
}> {
  const scope = await chooseScope();
  const projectRoot = scope === "project" ? await chooseProjectRoot(ctx) : undefined;
  const groups = await getManagedInstallations(scope, ctx, projectRoot);
  return { scope, ...(projectRoot ? { projectRoot } : {}), groups };
}

function groupLabel(group: InstallationGroup): string {
  const agents = group.receipt.intendedAgents.map((agent) => AGENTS[agent].label).join(", ");
  return `${agents}  ${theme.muted(`v${group.receipt.version} ${group.strategy}`)}`;
}

async function updateFlow(ctx: RuntimeContext): Promise<void> {
  const selection = await chooseManagedScope(ctx);
  const newer = selection.groups.filter(
    (group) => compareVersions(group.receipt.version, ctx.version) > 0,
  );
  const outdated = selection.groups.filter(
    (group) => compareVersions(group.receipt.version, ctx.version) < 0,
  );
  if (outdated.length === 0) {
    if (newer.length > 0) {
      warn("Managed installations are newer than this package. Run with @latest.");
    } else {
      info(
        selection.groups.length === 0
          ? "No managed installations found."
          : "Everything is current.",
      );
    }
    return;
  }
  const groupIds = await multiselect({
    message: "Choose installations to update",
    choices: outdated.map((group) => ({
      value: group.id,
      label: groupLabel(group),
      hint: group.physicalRoot,
    })),
    initialValues: outdated.map((group) => group.id),
    required: true,
  });
  const prepared = await prepareUpdateSkill({
    scope: selection.scope,
    context: ctx,
    groupIds,
    ...(selection.projectRoot ? { projectRoot: selection.projectRoot } : {}),
    hooks: hooks(),
  });
  if (prepared.breaking) {
    note("Breaking update", [
      ...previewLines(prepared.preview.filter((entry) => entry.action === "update")),
      "Review the matching release notes in CHANGELOG.md before continuing.",
    ]);
    if (!(await confirm("Continue with this breaking update?", false))) {
      throw new CancelledError();
    }
  }
  note("Exact mutation preview", previewLines(prepared.preview));
  if (!(await confirm("Apply exactly these changes?"))) throw new CancelledError();
  const result = await prepared.execute();
  reportResult(result, "Updated");
  await maybeCleanBackups(ctx, result);
  outro("Selected installations are up to date.");
}

async function removeFlow(ctx: RuntimeContext): Promise<void> {
  const selection = await chooseManagedScope(ctx);
  if (selection.groups.length === 0) {
    info("No managed installations found.");
    return;
  }
  const installedAgents = [
    ...new Set(selection.groups.flatMap((group) => group.receipt.intendedAgents)),
  ];
  const agents = await multiselect<AgentId>({
    message: "Choose agents to remove",
    choices: agentChoices(selection.scope).filter((choice) =>
      installedAgents.includes(choice.value),
    ),
    initialValues: [],
    required: true,
  });
  const prepared = await prepareRemoveSkill({
    agents,
    scope: selection.scope,
    context: ctx,
    ...(selection.projectRoot ? { projectRoot: selection.projectRoot } : {}),
    hooks: hooks(),
  });
  note("Exact mutation preview", [
    ...previewLines(prepared.preview),
    "Shared installations may be migrated so unselected agents keep working.",
  ]);
  if (!(await confirm("Apply exactly these changes?", false))) throw new CancelledError();
  const result = await prepared.execute();
  reportResult(result, "Removed");
  await maybeCleanBackups(ctx, result);
  outro("Removal complete.");
}

function printHelp(): void {
  process.stdout.write(`Project Foundation ${packageJson.version}\n\n`);
  process.stdout.write(
    "Usage:\n  bunx @ivni/project-foundation [install|update|remove] [--debug]\n\n",
  );
  process.stdout.write(
    "Run without a command to open the main menu. Mutating commands require a TTY.\n",
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((argument) => argument !== "--debug");
  if (args.includes("--help") || args.includes("-h")) return printHelp();
  if (args.includes("--version") || args.includes("-v")) {
    process.stdout.write(`${packageJson.version}\n`);
    return;
  }
  if (args.length > 1) {
    throw new UserFacingError(
      `Too many arguments: ${args.join(" ")}`,
      "Run with --help for usage.",
    );
  }
  const argument = args[0];
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new UserFacingError(
      "Interactive installation requires a terminal.",
      "Run bunx @ivni/project-foundation in a TTY.",
    );
  }
  const ctx = context();
  intro("Project Foundation", "Install one skill across your coding agents.");
  const valid = ["install", "update", "remove"] as const;
  if (argument && !valid.includes(argument as (typeof valid)[number])) {
    throw new UserFacingError(`Unknown command: ${argument}`, "Use install, update, or remove.");
  }
  const action: MainAction = argument
    ? (argument as MainAction)
    : await select({
        message: "What would you like to do?",
        initialValue: "install",
        choices: [
          { value: "install", label: "Install", hint: "Add the skill to agent environments" },
          { value: "update", label: "Update", hint: "Replace older managed installations" },
          { value: "remove", label: "Remove", hint: "Remove selected agent access" },
          { value: "exit", label: "Exit" },
        ],
      });
  if (action === "exit") throw new CancelledError("Nothing changed.");
  if (action === "install") await installFlow(ctx);
  else if (action === "update") await updateFlow(ctx);
  else await removeFlow(ctx);
}

try {
  await main();
} catch (error) {
  if (error instanceof CancelledError) {
    warn(error.message);
    process.exitCode = 0;
  } else if (error instanceof UserFacingError) {
    failure(error.message);
    if (error.hint) info(error.hint);
    process.exitCode = 1;
  } else {
    failure(error instanceof Error ? error.message : String(error));
    if (debugEnabled && error instanceof Error && error.stack) {
      process.stderr.write(`${theme.muted(error.stack)}\n`);
    }
    process.exitCode = 1;
  }
}
