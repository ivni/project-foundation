#!/usr/bin/env bun

import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import packageJson from "../../../package.json";
import { AGENTS, createRuntimeContext, detectAgent, findProjectRoot } from "./agents.ts";
import type { CleanupPreset } from "./backups.ts";
import { deleteBackups, listBackups, selectBackupsForCleanup } from "./backups.ts";
import { previewDiff } from "./diff.ts";
import type {
  InstallationConfiguration,
  MaintenanceAction,
  ManagedSkillGroup,
} from "./maintenance.ts";
import { discoverConfigurations, getMaintenanceCatalog, scanManagedSkills } from "./maintenance.ts";
import { getManagedInstallations, prepareMaintainSkill, prepareRemoveSkill } from "./operations.ts";
import { resolvePublishedPayloadRoot } from "./payload.ts";
import { SKILL_IDS, SKILLS } from "./skills.ts";
import { combinePreparedOperations } from "./suite.ts";
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
  PreparedOperation,
  RuntimeContext,
  Scope,
  SkillId,
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
    version: packageJson.version,
  });
}

function contextForSkill(ctx: RuntimeContext, skillId: SkillId): RuntimeContext {
  return { ...ctx, payloadRoot: resolvePublishedPayloadRoot(skillId) };
}

function skillChoices(skillIds: SkillId[] = [...SKILL_IDS]) {
  return skillIds.map((skillId) => ({
    value: skillId,
    label: SKILLS[skillId].label,
    hint: SKILLS[skillId].summary,
  }));
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
    message: "Where should the skills be available?",
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
      { value: "keep-three", label: "Keep latest 3", hint: "Per skill, agent, and scope" },
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
  skills: SkillId[];
  scope: Scope;
  projectRoot?: string;
  context: RuntimeContext;
}): Promise<void> {
  const otherScope: Scope = options.scope === "user" ? "project" : "user";
  const otherProjectRoot =
    otherScope === "project" ? findProjectRoot(options.context.cwd) : undefined;
  const overlapLines: string[] = [];
  for (const skillId of options.skills) {
    const groups = await getManagedInstallations(
      otherScope,
      contextForSkill(options.context, skillId),
      skillId,
      otherProjectRoot,
    );
    const overlapping = [
      ...new Set(
        groups
          .flatMap((group) => group.receipt.intendedAgents)
          .filter((agent) => options.agents.includes(agent)),
      ),
    ];
    if (overlapping.length > 0) {
      overlapLines.push(
        `${SKILLS[skillId].label}: ${overlapping.map((agent) => AGENTS[agent].label).join(", ")}`,
      );
    }
  }
  if (overlapLines.length === 0) return;
  note("Both scopes will contain the same skills", [
    ...overlapLines,
    `New scope: ${options.scope}; existing scope: ${otherScope}`,
    "Agent precedence rules decide which same-name skill is selected.",
  ]);
  if (!(await confirm("Continue with both scopes?"))) throw new CancelledError();
}

function configurationLabel(configuration: InstallationConfiguration): string {
  const agents = configuration.agents.map((agent) => AGENTS[agent].label).join(", ");
  return `${configuration.scope === "user" ? "User" : "Project"} · ${agents} · ${configuration.strategy}`;
}

async function chooseConfiguration(ctx: RuntimeContext): Promise<InstallationConfiguration> {
  const configurations = await discoverConfigurations(ctx, findProjectRoot(ctx.cwd));
  if (configurations.length > 0) {
    const key = await select({
      message: "Choose an installation configuration",
      initialValue: configurations[0]?.key ?? "new",
      choices: [
        ...configurations.map((configuration) => ({
          value: configuration.key,
          label: configurationLabel(configuration),
          hint: configuration.projectRoot ?? "Available across projects",
        })),
        {
          value: "new",
          label: "Choose different settings",
          hint: "Agents, scope, or installation method",
        },
      ],
    });
    const existing = configurations.find((configuration) => configuration.key === key);
    if (existing) return existing;
  }
  const scope = await chooseScope();
  const projectRoot = scope === "project" ? await chooseProjectRoot(ctx) : undefined;
  const agents = await multiselect<AgentId>({
    message: "Choose agent environments",
    choices: agentChoices(scope),
    initialValues: AGENT_IDS.filter(
      (agent) => !(scope === "project" && agent === "hermes") && detectAgent(agent, ctx),
    ),
    required: true,
  });
  const strategy = await select<Strategy>({
    message: "How should new files be installed?",
    initialValue: "link",
    choices: [
      { value: "link", label: "Link", hint: "One managed copy, shared by selected agents" },
      { value: "copy", label: "Copy", hint: "Independent files in each native location" },
    ],
  });
  return { key: "custom", scope, agents, strategy, ...(projectRoot ? { projectRoot } : {}) };
}

function actionChoice(action: MaintenanceAction, ctx: RuntimeContext) {
  if (action.kind === "add") {
    return {
      value: action.key,
      label: `Add · ${SKILLS[action.skillId].label} · ${action.agents.map((agent) => AGENTS[agent].label).join(", ")}`,
      hint: SKILLS[action.skillId].summary,
    };
  }
  return {
    value: action.key,
    label: `Update · ${groupLabel({ key: action.key, skillId: action.skillId, group: action.group })} -> v${ctx.version}`,
    hint: action.group.physicalRoot,
  };
}

async function maintainFlow(ctx: RuntimeContext): Promise<void> {
  let configuration = await chooseConfiguration(ctx);
  let selectedKeys: string[] | undefined;
  while (true) {
    if (configuration.projectRoot && !(await pathIsDirectory(configuration.projectRoot))) {
      throw new UserFacingError(`Project directory does not exist: ${configuration.projectRoot}`);
    }
    const catalog = await getMaintenanceCatalog(ctx, configuration);
    note("Configuration", [
      configurationLabel(configuration),
      ...(configuration.projectRoot ? [configuration.projectRoot] : []),
      "Existing installations keep their installation method.",
    ]);
    if (catalog.current.length > 0) {
      note(
        "Already current",
        catalog.current.map(
          (entry) => `${groupLabel(entry)}${entry.group.modified ? " · Local changes kept" : ""}`,
        ),
      );
    }
    if (catalog.newer.length > 0) {
      note("Newer than this package", catalog.newer.map(groupLabel));
      warn("Run with @latest to update these installations. Downgrades are not supported.");
    }
    if (catalog.actions.length === 0) {
      outro(
        catalog.newer.length > 0
          ? "No changes available with this package."
          : "All skills in this configuration are current.",
      );
      return;
    }
    info("Selected updates and additions will be applied together.");
    selectedKeys = await multiselect({
      message: "Choose updates and additions",
      choices: catalog.actions.map((action) => actionChoice(action, ctx)),
      initialValues: selectedKeys ?? catalog.initialValues,
    });
    const selected = catalog.actions.filter((action) => selectedKeys?.includes(action.key));
    if (selected.length === 0) {
      outro("Nothing selected. Nothing changed.");
      return;
    }
    const additions = selected.filter((action) => action.kind === "add");
    if (additions.length > 0) {
      await confirmScopeCoexistence({
        agents: [...new Set(additions.flatMap((action) => action.agents))],
        skills: [...new Set(additions.map((action) => action.skillId))],
        scope: configuration.scope,
        context: ctx,
        ...(configuration.projectRoot ? { projectRoot: configuration.projectRoot } : {}),
      });
    }
    const operations: PreparedOperation[] = [];
    for (const skillId of SKILL_IDS) {
      const actions = selected.filter((action) => action.skillId === skillId);
      if (actions.length === 0) continue;
      operations.push(
        await prepareMaintainSkill({
          skillId,
          agents: actions.flatMap((action) => (action.kind === "add" ? action.agents : [])),
          updateGroupIds: actions.flatMap((action) =>
            action.kind === "update" ? [action.group.id] : [],
          ),
          scope: configuration.scope,
          strategy: configuration.strategy,
          context: contextForSkill(ctx, skillId),
          ...(configuration.projectRoot ? { projectRoot: configuration.projectRoot } : {}),
          hooks: hooks(),
        }),
      );
    }
    const prepared = combinePreparedOperations(operations);
    if (prepared.breaking) {
      note("Breaking update", [
        "This plan includes a major-version update.",
        "Review the matching release notes in CHANGELOG.md before applying it.",
      ]);
    }
    note("Exact mutation preview", [
      ...previewLines(prepared.preview),
      "Shared files may affect every agent listed for an installation.",
    ]);
    const decision = await select({
      message: "Apply exactly these changes?",
      initialValue: prepared.breaking ? "cancel" : "apply",
      choices: [
        { value: "apply", label: "Apply changes" },
        { value: "skills", label: "Change selection" },
        { value: "configuration", label: "Change configuration" },
        { value: "cancel", label: "Cancel" },
      ],
    });
    if (decision === "cancel") throw new CancelledError();
    if (decision === "skills") continue;
    if (decision === "configuration") {
      configuration = await chooseConfiguration(ctx);
      selectedKeys = undefined;
      continue;
    }
    let result: OperationResult;
    try {
      info("Applying updates and additions...");
      result = await prepared.execute();
    } catch (error) {
      if (
        ctx.platform !== "win32" ||
        configuration.strategy !== "link" ||
        additions.length === 0 ||
        !isRecoverableLinkPermissionError(error)
      )
        throw error;
      note("Windows could not create directory links", [
        "The operation was rolled back. Check target write access and junction policy.",
        "You can retry additions as copies. Existing installations keep their method.",
      ]);
      if (!(await confirm("Review a new plan using copies for additions?", false)))
        throw new CancelledError();
      configuration = { ...configuration, strategy: "copy" };
      continue;
    }
    reportResult(result, "Changed");
    if (result.maintenance) {
      info(
        `Updated: ${result.maintenance.updated}; added: ${result.maintenance.added}; skipped: ${result.maintenance.skipped}.`,
      );
    }
    await maybeCleanBackups(ctx, result);
    if (result.changed.length > 0 && (await confirm("Show agent discovery checks?", false))) {
      note(
        "Check the installation",
        configuration.agents.flatMap((agent) =>
          [...new Set(selected.map((action) => action.skillId))].map(
            (skillId) =>
              `${AGENTS[agent].label} · ${SKILLS[skillId].label}: ${AGENTS[agent].manualCheck(skillId)}`,
          ),
        ),
      );
    }
    outro("Selected changes completed.");
    return;
  }
}

async function chooseManagedScope(ctx: RuntimeContext): Promise<{
  scope: Scope;
  projectRoot?: string;
  groups: ManagedSkillGroup[];
}> {
  const scope = await chooseScope();
  const projectRoot = scope === "project" ? await chooseProjectRoot(ctx) : undefined;
  const groups = await scanManagedSkills(ctx, scope, projectRoot);
  return { scope, ...(projectRoot ? { projectRoot } : {}), groups };
}

function groupLabel(entry: ManagedSkillGroup): string {
  const group = entry.group;
  const agents = group.receipt.intendedAgents.map((agent) => AGENTS[agent].label).join(", ");
  return `${SKILLS[entry.skillId].label} · ${agents}  ${theme.muted(`v${group.receipt.version} ${group.strategy}`)}`;
}

async function removeFlow(ctx: RuntimeContext): Promise<void> {
  const selection = await chooseManagedScope(ctx);
  if (selection.groups.length === 0) {
    info("No managed installations found.");
    return;
  }
  const installedSkills = SKILL_IDS.filter((skillId) =>
    selection.groups.some((entry) => entry.skillId === skillId),
  );
  const skills = await multiselect<SkillId>({
    message: "Choose skills to remove",
    choices: skillChoices(installedSkills),
    initialValues: installedSkills,
    required: true,
  });
  const selectedSkills = new Set(skills);
  const relevantGroups = selection.groups.filter((entry) => selectedSkills.has(entry.skillId));
  const installedAgents = [
    ...new Set(relevantGroups.flatMap((entry) => entry.group.receipt.intendedAgents)),
  ];
  const agents = await multiselect<AgentId>({
    message: "Choose agents to remove",
    choices: agentChoices(selection.scope).filter((choice) =>
      installedAgents.includes(choice.value),
    ),
    initialValues: [],
    required: true,
  });
  const operations: PreparedOperation[] = [];
  for (const skillId of skills) {
    operations.push(
      await prepareRemoveSkill({
        agents,
        skillId,
        scope: selection.scope,
        context: contextForSkill(ctx, skillId),
        ...(selection.projectRoot ? { projectRoot: selection.projectRoot } : {}),
        hooks: hooks(),
      }),
    );
  }
  const prepared = combinePreparedOperations(operations);
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
    "Install and update open the same wizard for updates and additions.\n" +
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
  intro("Project Foundation", "Install and update skills across your coding agents.");
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
          {
            value: "install",
            label: "Install / update",
            hint: "Update installed skills and add others",
          },
          { value: "remove", label: "Remove", hint: "Remove selected agent access" },
          { value: "exit", label: "Exit" },
        ],
      });
  if (action === "exit") throw new CancelledError("Nothing changed.");
  if (action === "install" || action === "update") await maintainFlow(ctx);
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
