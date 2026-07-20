export interface SkillDefinition {
  label: string;
  summary: string;
}

export const SKILLS = {
  "project-foundation": {
    label: "Project Foundation",
    summary: "Product contract, technical synthesis, and project artifacts",
  },
  "find-blind-spots": {
    label: "Find Blind Spots",
    summary: "Read-only classification and routing of unknowns",
  },
  "run-discovery-interview": {
    label: "Discovery Interview",
    summary: "Product value, functionality, and UX discovery",
  },
  "run-codex-review-loop": {
    label: "Codex Review Loop",
    summary: "Independent review, bounded fixes, and clean rechecks",
  },
  "run-claude-review-loop": {
    label: "Claude Review Loop",
    summary: "Independent Claude review, bounded fixes, and clean rechecks",
  },
} as const satisfies Record<string, SkillDefinition>;

export type SkillId = keyof typeof SKILLS;

export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];

export function isSkillId(value: unknown): value is SkillId {
  return typeof value === "string" && Object.hasOwn(SKILLS, value);
}
