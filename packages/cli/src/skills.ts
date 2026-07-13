export interface SkillDefinition {
  label: string;
  summary: string;
}

export const SKILLS = {
  "project-foundation": {
    label: "Project Foundation",
    summary: "Architecture, process, and project artifacts",
  },
  "find-blind-spots": {
    label: "Find Blind Spots",
    summary: "Read-only search for consequential unknowns",
  },
  "run-discovery-interview": {
    label: "Discovery Interview",
    summary: "One-decision-at-a-time product discovery",
  },
} as const satisfies Record<string, SkillDefinition>;

export type SkillId = keyof typeof SKILLS;

export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];

export function isSkillId(value: unknown): value is SkillId {
  return typeof value === "string" && Object.hasOwn(SKILLS, value);
}
