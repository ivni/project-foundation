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
