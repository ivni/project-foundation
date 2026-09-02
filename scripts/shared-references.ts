/**
 * A skill payload must stay self-contained, because a user can install one skill without the
 * others. Shared normative text therefore ships as a copy inside every payload that needs it, and
 * this registry keeps the copies generated from one canonical source so the meaning has a single
 * editable home. Run `bun run sync:shared` after editing a source; `verify:skills` fails on drift.
 */
export interface SharedReference {
  source: string;
  copies: string[];
}

/**
 * Some shared normative text has to stay inside a skill's own SKILL.md rather than move behind a link:
 * the sections below are the ones agents were measured violating, and a rule read only when a reference
 * is opened is weaker than one read with the skill. So these blocks are generated in place, delimited by
 * markers, and `verify:skills` fails when a copy drifts. That is what stops a rule added to two of three
 * loops from passing CI in silence.
 */
export interface SharedBlock {
  source: string;
  marker: string;
  copies: string[];
}

export function sharedBlockMarkers(marker: string): { open: string; close: string } {
  return { open: `<!-- shared:${marker} -->`, close: `<!-- /shared:${marker} -->` };
}

const REVIEW_LOOP_SKILLS = [
  "packages/run-claude-review-loop/SKILL.md",
  "packages/run-codex-review-loop/SKILL.md",
  "packages/run-qwen-review-loop/SKILL.md",
];

const REVIEWER_CONTRACTS = [
  "packages/run-claude-review-loop/references/reviewer-contract.md",
  "packages/run-codex-review-loop/references/reviewer-contract.md",
  "packages/run-qwen-review-loop/references/reviewer-contract.md",
];

/**
 * Groups of files whose text outside shared blocks and host regions must be identical within the group.
 * The reviewer contracts form their own group: a rule appended after the last generated block, or beside
 * the host-specific bullet, changes no block and would otherwise pass verification.
 */
export const RESIDUE_IDENTICAL_GROUPS: readonly (readonly string[])[] = [
  REVIEW_LOOP_SKILLS,
  REVIEWER_CONTRACTS,
];

/**
 * Host regions each residue group may carry. A region absent from this list fails verification, so a new
 * host boundary is a registry edit rather than a marker anyone can add — and the list documents exactly
 * which text is allowed to differ by host.
 */
export const HOST_REGIONS: Record<string, readonly string[]> = {
  "packages/run-claude-review-loop/SKILL.md": [
    "intro",
    "skill-id",
    "adapter",
    "context-file",
    "launch-step",
    "report-runtime",
  ],
  "packages/run-codex-review-loop/SKILL.md": [
    "intro",
    "skill-id",
    "adapter",
    "context-file",
    "launch-step",
    "report-runtime",
  ],
  "packages/run-qwen-review-loop/SKILL.md": [
    "intro",
    "skill-id",
    "adapter",
    "context-file",
    "launch-step",
    "report-runtime",
  ],
  "packages/run-claude-review-loop/references/reviewer-contract.md": [
    "title",
    "inspection-boundary",
  ],
  "packages/run-codex-review-loop/references/reviewer-contract.md": [
    "title",
    "inspection-boundary",
  ],
  "packages/run-qwen-review-loop/references/reviewer-contract.md": ["title", "inspection-boundary"],
};

/** The review-loop skills, the first residue group; kept for callers that need only those. */
export const RESIDUE_IDENTICAL_SKILLS = REVIEW_LOOP_SKILLS;

export const SHARED_BLOCKS: SharedBlock[] = [
  { source: "shared/review-scope.md", marker: "review-scope", copies: REVIEW_LOOP_SKILLS },
  {
    source: "shared/blocking-declaration.md",
    marker: "blocking-declaration",
    copies: REVIEW_LOOP_SKILLS,
  },
  {
    source: "shared/finding-classification.md",
    marker: "finding-classification",
    copies: REVIEW_LOOP_SKILLS,
  },
  { source: "shared/root-cause-fix.md", marker: "root-cause-fix", copies: REVIEW_LOOP_SKILLS },
  { source: "shared/stop-honestly.md", marker: "stop-honestly", copies: REVIEW_LOOP_SKILLS },
  {
    source: "shared/reviewer-contract-intro.md",
    marker: "reviewer-contract-intro",
    copies: REVIEWER_CONTRACTS,
  },
  {
    source: "shared/reviewer-contract-body.md",
    marker: "reviewer-contract-body",
    copies: REVIEWER_CONTRACTS,
  },
];

export const SHARED_REFERENCES: SharedReference[] = [
  {
    source: "shared/decision-routing.md",
    copies: [
      "packages/find-blind-spots/references/decision-routing.md",
      "packages/run-discovery-interview/references/decision-routing.md",
      "packages/project-foundation/references/decision-routing.md",
    ],
  },
  {
    source: "shared/subphase-contract.md",
    copies: [
      "packages/project-foundation/references/subphase-contract.md",
      "packages/run-subphase/references/subphase-contract.md",
    ],
  },
];
