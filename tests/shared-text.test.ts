import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SKILL_IDS } from "../packages/cli/src/skills.ts";
import {
  compareResidueGroup,
  extractFrontmatter,
  firstResidueDifference,
  planSharedSync,
  planWholeSync,
  readBlockRegion,
  renderBlockBody,
  skillResidue,
  validateMarkers,
} from "../scripts/shared-blocks.ts";
import {
  RESIDUE_IDENTICAL_GROUPS,
  RESIDUE_IDENTICAL_SKILLS,
  SHARED_BLOCKS,
  SHARED_REFERENCES,
} from "../scripts/shared-references.ts";

const root = join(import.meta.dir, "..");
const read = (relativePath: string) => readFile(join(root, ...relativePath.split("/")), "utf8");

/**
 * One table over every copy, rather than the same assertions repeated inside each loop's own test file.
 * A rule added to two of the three review loops used to pass CI in silence, because each test file only
 * ever looked inside its own package.
 */
describe("shared normative text", () => {
  for (const reference of SHARED_REFERENCES) {
    for (const copy of reference.copies) {
      test(`${copy} matches ${reference.source}`, async () => {
        expect(await read(copy)).toBe(await read(reference.source));
      });
    }
  }

  for (const block of SHARED_BLOCKS) {
    for (const copy of block.copies) {
      test(`${copy} carries block ${block.marker}`, async () => {
        const region = readBlockRegion(await read(copy), block.marker);
        expect(typeof region).not.toBe("string");
        if (typeof region === "string") return;
        expect(region.body).toBe(renderBlockBody(await read(block.source)));
      });
    }
  }

  test("every review loop carries every shared block", () => {
    const loops = [
      "packages/run-claude-review-loop/SKILL.md",
      "packages/run-codex-review-loop/SKILL.md",
      "packages/run-qwen-review-loop/SKILL.md",
    ];
    const skillBlocks = SHARED_BLOCKS.filter((block) =>
      block.copies.some((copy) => copy.endsWith("SKILL.md")),
    );
    expect(skillBlocks.length).toBeGreaterThan(0);
    for (const block of skillBlocks) {
      expect([...block.copies].sort()).toEqual([...loops].sort());
    }
  });

  test("no host-independent text survives outside a shared block or a host region", async () => {
    const [reference, ...others] = RESIDUE_IDENTICAL_SKILLS;
    expect(reference).toBeDefined();
    expect(others.length).toBeGreaterThan(0);
    const expected = skillResidue(await read(reference as string));
    for (const other of others) {
      expect(firstResidueDifference(expected, skillResidue(await read(other)))).toBeNull();
    }
  });

  test("the residue check reports the line where an unsynchronized rule appears", () => {
    const left = skillResidue("a\n<!-- host:x -->\nleft only\n<!-- /host:x -->\nshared\n");
    const right = skillResidue("a\n<!-- host:x -->\nright only\n<!-- /host:x -->\ndrifted\n");
    expect(firstResidueDifference(left, right)).toEqual({
      leftLine: 5,
      rightLine: 5,
      left: "shared",
      right: "drifted",
    });
  });

  test("the reviewer contract keeps one host-specific bullet outside the shared blocks", async () => {
    const contracts =
      SHARED_BLOCKS.find((block) => block.marker === "reviewer-contract-body")?.copies ?? [];
    expect(contracts.length).toBeGreaterThan(1);
    const locals = new Set<string>();
    for (const contract of contracts) {
      const content = await read(contract);
      const intro = readBlockRegion(content, "reviewer-contract-intro");
      const body = readBlockRegion(content, "reviewer-contract-body");
      expect(typeof intro).not.toBe("string");
      expect(typeof body).not.toBe("string");
      if (typeof intro === "string" || typeof body === "string") return;
      const region = readBlockRegion(
        content.replace(
          /<!-- (\/?)host:inspection-boundary -->/g,
          "<!-- $1shared:inspection-boundary -->",
        ),
        "inspection-boundary",
      );
      expect(typeof region).not.toBe("string");
      if (typeof region === "string") return;
      // The host bullet lives in its own declared region, so the residue check can cover the contract
      // while each host still states its own inspection boundary.
      expect(region.body.trim().startsWith("-")).toBe(true);
      locals.add(region.body.trim());
    }
    // Each host states its own inspection boundary, so the three bullets must stay distinct.
    expect(locals.size).toBe(contracts.length);
  });
});

describe("the checks cover every payload they claim to", () => {
  test("the three reviewer contracts are residue-identical, not only block-identical", () => {
    const groups = RESIDUE_IDENTICAL_GROUPS.map((group) => [...group].sort());
    const contracts = [
      "packages/run-claude-review-loop/references/reviewer-contract.md",
      "packages/run-codex-review-loop/references/reviewer-contract.md",
      "packages/run-qwen-review-loop/references/reviewer-contract.md",
    ];
    // A rule appended after the last generated block, or beside the host bullet, changes no block and used
    // to pass verification: the contract needs the same outer-structure check the skills have.
    expect(groups).toContainEqual(contracts);
  });

  test("every registered payload's frontmatter is parsed as YAML, not pattern-matched", async () => {
    for (const id of SKILL_IDS) {
      const text = await read(`packages/${id}/SKILL.md`);
      const frontmatter = extractFrontmatter(text);
      expect(frontmatter).not.toBeNull();
      const parsed = Bun.YAML.parse(frontmatter ?? "") as Record<string, unknown>;
      expect(typeof parsed.name).toBe("string");
    }
    // The verifier itself must apply the parser to all of them; its report names the count.
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync("bun", ["./scripts/verify-skills.ts"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(result.stdout).toContain(`${SKILL_IDS.length} frontmatters parsed`);
  });

  test("a residue difference is reported at the source line of each file", () => {
    const left =
      "---\nname: a\n---\n<!-- host:x -->\nleft one\nleft two\n<!-- /host:x -->\nshared\n";
    const right = "---\nname: b\n---\n<!-- host:x -->\nright\n<!-- /host:x -->\ndrifted\n";
    const difference = firstResidueDifference(skillResidue(left), skillResidue(right));
    expect(difference).not.toBeNull();
    // "shared" is on source line 8 of the left file and "drifted" on line 7 of the right one; a line
    // number counted after collapsing regions points at neither.
    expect(difference?.leftLine).toBe(8);
    expect(difference?.rightLine).toBe(7);
  });
});

describe("marker structure is validated before the residue is compared", () => {
  test("a shared marker not registered for the file is rejected", () => {
    const errors = validateMarkers(
      "---\nname: a\n---\n<!-- shared:new-rule -->\nbody A\n<!-- /shared:new-rule -->\n",
      ["review-scope"],
    );
    // Three copies could each carry this region with a different body; collapsed to one placeholder,
    // their residues would agree while the doctrine inside diverged.
    expect(errors.some((entry) => entry.includes("new-rule"))).toBe(true);
  });

  test("an opener without its closer is rejected instead of swallowing the file", () => {
    const errors = validateMarkers("<!-- host:x -->\nleft open\nshared text\n", []);
    expect(errors.some((entry) => entry.includes("host:x"))).toBe(true);
    expect(() => skillResidue("<!-- host:x -->\nleft open\n")).toThrow();
  });

  test("a closer that precedes its opener or repeats is rejected", () => {
    const errors = validateMarkers(
      "<!-- /host:x -->\n<!-- host:x -->\nbody\n<!-- /host:x -->\n<!-- /host:x -->\n",
      [],
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  test("the verifier applies the structure check to every residue-group file", () => {
    for (const group of RESIDUE_IDENTICAL_GROUPS) {
      for (const file of group) {
        const registered = SHARED_BLOCKS.filter((block) => block.copies.includes(file)).map(
          (block) => block.marker,
        );
        expect(registered.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("the checks read the document the way a host does", () => {
  test("a line that merely begins with --- is not the closing delimiter", () => {
    const text = "---\nname: a\ndescription: b\n---oops\nnot: yaml: here\n---\n\nbody\n";
    // A prefix search stopped at "---oops" and parsed only the valid head; a host parsing the whole
    // frontmatter sees the invalid tail and refuses the payload.
    expect(() => Bun.YAML.parse(extractFrontmatter(text) ?? "")).toThrow();
  });

  test("crossed regions are rejected", () => {
    const errors = validateMarkers(
      "<!-- host:a -->\n<!-- host:b -->\nx\n<!-- /host:a -->\n<!-- /host:b -->\n",
      [],
    );
    expect(errors.some((entry) => entry.includes("host:a") || entry.includes("host:b"))).toBe(true);
  });
});

describe("host regions carry only what differs by host", () => {
  test("a host region not registered for the group is rejected", () => {
    const errors = validateMarkers(
      "<!-- host:new-thing -->\nx\n<!-- /host:new-thing -->\n",
      [],
      ["title"],
    );
    expect(errors.some((entry) => entry.includes("new-thing"))).toBe(true);
  });

  test("no line inside a host region is repeated verbatim in another host's region of the same name", async () => {
    // A sentence present in two hosts' regions is common doctrine hiding behind a host boundary, where
    // the residue check cannot see it drift — which is how one loop lost the context-file cleanup rule.
    for (const group of RESIDUE_IDENTICAL_GROUPS) {
      const regions = new Map<string, Map<string, string>>();
      for (const file of group) {
        const content = await read(file);
        for (const match of content.matchAll(
          /<!-- host:([a-z-]+) -->\n([\s\S]*?)\n<!-- \/host:\1 -->/g,
        )) {
          const byFile = regions.get(match[1] ?? "") ?? new Map<string, string>();
          byFile.set(file, match[2] ?? "");
          regions.set(match[1] ?? "", byFile);
        }
      }
      for (const [name, byFile] of regions) {
        const seen = new Map<string, string>();
        for (const [file, body] of byFile) {
          for (const line of body.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.length < 40) continue;
            const other = seen.get(trimmed);
            expect(
              other === undefined,
              `host:${name}: "${trimmed.slice(0, 60)}…" appears in both ${other} and ${file}`,
            ).toBe(true);
            seen.set(trimmed, file);
          }
        }
      }
    }
  });

  test("residue drift is reported for a group even when another check already failed", () => {
    const errors = compareResidueGroup([
      { file: "a.md", content: "---\nname: a\n---\nshared\n" },
      { file: "b.md", content: "---\nname: b\n---\ndrifted\n" },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("b.md:4");
  });
});

describe("synchronization writes nothing until every destination is valid", () => {
  test("a crossed-region destination yields an error and no rewritten content", () => {
    const plan = planSharedSync(
      [
        {
          file: "x/SKILL.md",
          content:
            "---\nname: x\n---\n<!-- shared:a -->\nold a\n<!-- host:b -->\nkeep\n<!-- /shared:a -->\n<!-- /host:b -->\n",
        },
      ],
      [{ marker: "a", canonical: "new a\n" }],
      ["b"],
    );
    // The old loop rewrote block a in place and consumed the host region opened inside it; the crossed
    // closer was only noticed one iteration later, after the file on disk had already lost that text.
    expect(plan.errors.length).toBeGreaterThan(0);
    expect(plan.writes).toEqual([]);
  });

  test("a valid destination is rewritten once with every block applied", () => {
    const plan = planSharedSync(
      [
        {
          file: "x/SKILL.md",
          content:
            "---\nname: x\n---\n<!-- shared:a -->\nold a\n<!-- /shared:a -->\n<!-- shared:b -->\nold b\n<!-- /shared:b -->\n",
        },
      ],
      [
        { marker: "a", canonical: "new a\n" },
        { marker: "b", canonical: "new b\n" },
      ],
      [],
    );
    expect(plan.errors).toEqual([]);
    expect(plan.writes).toHaveLength(1);
    expect(plan.writes[0]?.content).toContain("new a");
    expect(plan.writes[0]?.content).toContain("new b");
    expect(plan.writes[0]?.content).not.toContain("old");
  });
});

describe("whole-file references and blocks are one plan", () => {
  test("a drifted reference is not copied while any block destination is malformed", () => {
    const plan = planWholeSync({
      references: [
        {
          source: "shared/x.md",
          canonical: "new\n",
          copies: [{ file: "p/x.md", content: "old\n" }],
        },
      ],
      blockDestinations: [
        {
          file: "q/SKILL.md",
          content: "---\nname: q\n---\n<!-- shared:a -->\nbody\n",
          blocks: [{ marker: "a", canonical: "body\n" }],
          hostRegions: [],
        },
      ],
    });
    // The reference loop used to copy first and the block loop refused afterwards, so the tree was half
    // rewritten under a message that said nothing had been written.
    expect(plan.errors.length).toBeGreaterThan(0);
    expect(plan.writes).toEqual([]);
  });

  test("with every destination valid, references and blocks are both written", () => {
    const plan = planWholeSync({
      references: [
        {
          source: "shared/x.md",
          canonical: "new\n",
          copies: [{ file: "p/x.md", content: "old\n" }],
        },
      ],
      blockDestinations: [
        {
          file: "q/SKILL.md",
          content: "---\nname: q\n---\n<!-- shared:a -->\nold a\n<!-- /shared:a -->\n",
          blocks: [{ marker: "a", canonical: "new a\n" }],
          hostRegions: [],
        },
      ],
    });
    expect(plan.errors).toEqual([]);
    expect(plan.writes.map((write) => write.file).sort()).toEqual(["p/x.md", "q/SKILL.md"]);
  });
});

describe("the plan validates what it is about to write, not only what it read", () => {
  test("a canonical block that carries a stray marker is refused before any write", () => {
    const plan = planSharedSync(
      [
        {
          file: "x/SKILL.md",
          content: "---\nname: x\n---\n<!-- shared:a -->\nold\n<!-- /shared:a -->\n",
        },
      ],
      [{ marker: "a", canonical: "new\n<!-- host:rogue -->\nsmuggled\n<!-- /host:rogue -->\n" }],
      [],
    );
    // The destination was valid going in; only the assembled output carried the unregistered region, and
    // an input-only preflight let sync report success while verify:skills then failed on every copy.
    expect(plan.errors.some((entry) => entry.includes("rogue"))).toBe(true);
    expect(plan.writes).toEqual([]);
  });
});
