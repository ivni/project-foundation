import type { SkillId } from "./skills.ts";

export const AGENT_IDS = ["codex", "claude", "pi", "opencode", "hermes"] as const;

export type AgentId = (typeof AGENT_IDS)[number];
export type { SkillId } from "./skills.ts";
export type Scope = "user" | "project";
export type Strategy = "copy" | "link";

export interface RuntimeContext {
  cwd: string;
  home: string;
  platform: NodeJS.Platform;
  env: Record<string, string | undefined>;
  payloadRoot: string;
  version: string;
}

export interface Receipt {
  kind: "project-foundation-installation";
  schema: 2;
  package: "@ivni/project-foundation";
  skillId: SkillId;
  version: string;
  scope: Scope;
  strategy: Strategy;
  intendedAgents: AgentId[];
  payloadHash: string;
  files: Record<string, string>;
}

export interface TargetInspection {
  agent: AgentId;
  targetPath: string;
  exists: boolean;
  link: boolean;
  brokenLink: boolean;
  physicalRoot: string;
  receipt?: Receipt | undefined;
  modified: boolean;
  currentFiles?: Record<string, string> | undefined;
  inspectionError?: string | undefined;
}

export interface InstallationGroup {
  id: string;
  physicalRoot: string;
  scope: Scope;
  strategy: Strategy;
  receipt: Receipt;
  targets: TargetInspection[];
  modified: boolean;
}

export type ConflictAction = "adopt" | "replace" | "backup-replace" | "leave";
export type ModifiedUpdateAction = "replace" | "backup-replace" | "skip";
export type ModifiedRemoveAction = "remove" | "backup-remove" | "keep";

export interface BackupRecord {
  path: string;
  skillId: SkillId;
  agent: AgentId;
  scope: Scope;
  version: string;
  createdAt: string;
  bytes: number;
}

export interface OperationResult {
  changed: string[];
  skipped: string[];
  backups: BackupRecord[];
  notes: string[];
}

export interface MutationPreviewEntry {
  action:
    | "adopt"
    | "backup"
    | "create"
    | "link"
    | "migrate"
    | "remove"
    | "replace"
    | "skip"
    | "update";
  path: string;
  detail: string;
}

export interface PreparedOperation {
  preview: MutationPreviewEntry[];
  breaking?: boolean;
  execute: () => Promise<OperationResult>;
}

export interface OperationHooks {
  onExistingConflict?: (inspection: TargetInspection, diff: string) => Promise<ConflictAction>;
  onModifiedUpdate?: (group: InstallationGroup, diff: string) => Promise<ModifiedUpdateAction>;
  onModifiedRemove?: (group: InstallationGroup, diff: string) => Promise<ModifiedRemoveAction>;
}

export class CancelledError extends Error {
  constructor(message = "Operation cancelled.") {
    super(message);
    this.name = "CancelledError";
  }
}

export class UserFacingError extends Error {
  readonly hint: string | undefined;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "UserFacingError";
    this.hint = hint;
  }
}
