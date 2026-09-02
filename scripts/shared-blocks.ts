import { sharedBlockMarkers } from "./shared-references.ts";

export interface BlockRegion {
  before: string;
  body: string;
  after: string;
}

/**
 * A missing or duplicated marker pair is an error rather than a no-op: silently skipping a copy is how
 * one of three loops keeps an older rule while the other two move on.
 */
export function readBlockRegion(content: string, marker: string): BlockRegion | string {
  const { open, close } = sharedBlockMarkers(marker);
  const openCount = content.split(open).length - 1;
  const closeCount = content.split(close).length - 1;
  if (openCount === 0 && closeCount === 0) return `missing marker ${open}`;
  if (openCount !== 1 || closeCount !== 1) {
    return `marker ${open} must appear exactly once with its closing marker`;
  }
  const openIndex = content.indexOf(open);
  const closeIndex = content.indexOf(close);
  if (closeIndex < openIndex) return `marker ${close} appears before ${open}`;
  return {
    before: content.slice(0, openIndex + open.length),
    body: content.slice(openIndex + open.length, closeIndex),
    after: content.slice(closeIndex),
  };
}

/** The generated body is always one blank line away from its markers, so the copy stays readable. */
export function renderBlockBody(canonical: string): string {
  return `\n\n${canonical.trim()}\n\n`;
}

export function writeBlockRegion(region: BlockRegion, canonical: string): string {
  return `${region.before}${renderBlockBody(canonical)}${region.after}`;
}

/**
 * Everything outside a shared block and outside a declared host region must be identical across the
 * review loops. Without this, text that is host-independent can still live as three hand-kept copies —
 * which is how four rules added in one change ended up unsynchronized while the drift check passed, and
 * how two older divergences survived in the copies for as long as they did.
 */
export interface ResidueLine {
  text: string;
  /** 1-based line in the source file, so a drift report points at something a reader can open. */
  sourceLine: number;
}

/**
 * Everything outside a shared block and outside a declared host region must be identical across the
 * review loops. Without this, text that is host-independent can still live as three hand-kept copies —
 * which is how four rules added in one change ended up unsynchronized while the drift check passed, and
 * how two older divergences survived in the copies for as long as they did.
 *
 * The frontmatter is per-skill by definition and is YAML, where an HTML marker is a scalar rather than a
 * comment, so it is collapsed here and checked as YAML elsewhere. Each collapsed region keeps the source
 * line it started on.
 */
export function skillResidue(content: string): ResidueLine[] {
  const lines = content.split("\n");
  const out: ResidueLine[] = [];
  let index = 0;
  if (lines[0] === "---") {
    const closing = lines.indexOf("---", 1);
    if (closing > 0) {
      out.push({ text: "@@frontmatter@@", sourceLine: 1 });
      index = closing + 1;
    }
  }
  const opener = /^<!-- (shared|host):([a-z-]+) -->$/;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    const match = opener.exec(line);
    if (match === null) {
      out.push({ text: line, sourceLine: index + 1 });
      index += 1;
      continue;
    }
    const closer = `<!-- /${match[1]}:${match[2]} -->`;
    const end = lines.indexOf(closer, index + 1);
    if (end < 0) {
      // Swallowing the rest of the file would hide every later line from the comparison.
      throw new Error(`line ${index + 1}: ${line} has no closing ${closer}`);
    }
    out.push({ text: `@@${match[1]}:${match[2]}@@`, sourceLine: index + 1 });
    index = end + 1;
  }
  return out;
}

export function firstResidueDifference(
  left: ResidueLine[],
  right: ResidueLine[],
): { leftLine: number; rightLine: number; left: string; right: string } | null {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const a = left[index];
    const b = right[index];
    if (a?.text !== b?.text) {
      return {
        leftLine: a?.sourceLine ?? left.at(-1)?.sourceLine ?? 0,
        rightLine: b?.sourceLine ?? right.at(-1)?.sourceLine ?? 0,
        left: a?.text ?? "<end of file>",
        right: b?.text ?? "<end of file>",
      };
    }
  }
  return null;
}

/**
 * A region that matches the marker syntax but is registered nowhere is the escape from the residue check:
 * three copies can each carry it with a different body, and every residue shows the same placeholder.
 * So before residues are compared, every shared marker must be one this file is registered to carry, and
 * every opener must have exactly one closer after it.
 */
export function validateMarkers(
  content: string,
  registeredSharedMarkers: readonly string[],
  registeredHostRegions: readonly string[] | null = null,
): string[] {
  const errors: string[] = [];
  const lines = content.split("\n");
  const marker = /^<!-- (\/?)(shared|host):([a-z-]+) -->$/;
  // One LIFO stack across both kinds: a closer must match the innermost open region, so crossed regions
  // — a opened, b opened, a closed — are rejected instead of collapsing an ambiguous span.
  const stack: { key: string; line: number }[] = [];
  const seen = new Set<string>();
  for (const [index, line] of lines.entries()) {
    const match = marker.exec(line);
    if (match === null) continue;
    const [, slash, kind, name] = match;
    const key = `${kind}:${name}`;
    if (slash === "") {
      if (kind === "shared" && !registeredSharedMarkers.includes(name ?? "")) {
        errors.push(`line ${index + 1}: shared block ${name} is not registered for this file`);
      }
      if (
        kind === "host" &&
        registeredHostRegions !== null &&
        !registeredHostRegions.includes(name ?? "")
      ) {
        errors.push(`line ${index + 1}: host region ${name} is not registered for this file`);
      }
      if (seen.has(key)) errors.push(`line ${index + 1}: ${key} is opened more than once`);
      seen.add(key);
      stack.push({ key, line: index + 1 });
    } else {
      const top = stack.at(-1);
      if (top === undefined) {
        errors.push(`line ${index + 1}: closing ${key} without an opener before it`);
      } else if (top.key !== key) {
        errors.push(
          `line ${index + 1}: closing ${key} while ${top.key} (opened at line ${top.line}) is still open`,
        );
        stack.pop();
      } else {
        stack.pop();
      }
    }
  }
  for (const { key, line } of stack) errors.push(`line ${line}: ${key} is never closed`);
  return errors;
}

/**
 * The frontmatter ends at a line that is exactly `---`, not at the first line that begins with three
 * dashes. A prefix search stops early on a line like `---oops`, parses only the valid head, and passes a
 * payload a host then refuses. Returns null when the document carries no frontmatter.
 */
export function extractFrontmatter(content: string): string | null {
  const lines = content.split("\n");
  if (lines[0] !== "---") return null;
  const closing = lines.indexOf("---", 1);
  if (closing < 0) return null;
  return lines.slice(1, closing).join("\n");
}

/**
 * Compares one residue group on its own, so a failure elsewhere — an unrelated payload's frontmatter, a
 * drifted block — never hides a drift report here. The verifier used to skip every group as soon as any
 * error existed, and a multi-error change then needed one run per error to see them all.
 */
export function compareResidueGroup(files: { file: string; content: string }[]): string[] {
  const [reference, ...others] = files;
  if (reference === undefined) return [];
  let referenceResidue: ResidueLine[];
  try {
    referenceResidue = skillResidue(reference.content);
  } catch (error) {
    return [`${reference.file}: ${error instanceof Error ? error.message : String(error)}`];
  }
  const errors: string[] = [];
  for (const other of others) {
    let otherResidue: ResidueLine[];
    try {
      otherResidue = skillResidue(other.content);
    } catch (error) {
      errors.push(`${other.file}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const difference = firstResidueDifference(referenceResidue, otherResidue);
    if (difference !== null) {
      errors.push(
        `${other.file}:${difference.rightLine}: text outside shared blocks and host regions differs from ${reference.file}:${difference.leftLine} — move it into a shared block or wrap it in a host region\n    ${reference.file}:${difference.leftLine}: ${difference.left}\n    ${other.file}:${difference.rightLine}: ${difference.right}`,
      );
    }
  }
  return errors;
}

export interface SyncDestination {
  file: string;
  content: string;
}

export interface SyncPlan {
  errors: string[];
  writes: { file: string; content: string }[];
}

/**
 * Every destination is validated and fully assembled in memory before anything is written. The generator
 * used to persist each block as it went, so on a malformed file it could erase a neighbouring region and
 * only then discover the marker error — leaving the tree partly rewritten mid-repair.
 */
export function planSharedSync(
  destinations: SyncDestination[],
  blocks: { marker: string; canonical: string }[],
  registeredHostRegions: readonly string[],
): SyncPlan {
  const errors: string[] = [];
  const writes: { file: string; content: string }[] = [];
  for (const destination of destinations) {
    const problems = validateMarkers(
      destination.content,
      blocks.map((block) => block.marker),
      registeredHostRegions,
    );
    if (problems.length > 0) {
      for (const problem of problems) errors.push(`${destination.file}: ${problem}`);
      continue;
    }
    let next = destination.content;
    let failed = false;
    for (const block of blocks) {
      const region = readBlockRegion(next, block.marker);
      if (typeof region === "string") {
        errors.push(`${destination.file}: ${region}`);
        failed = true;
        break;
      }
      next = writeBlockRegion(region, block.canonical);
    }
    if (failed) continue;
    // The assembled output is validated too: a canonical block can carry a marker of its own, and checking
    // only the input let sync report success while the verifier then failed on every rewritten copy.
    const rendered = validateMarkers(
      next,
      blocks.map((block) => block.marker),
      registeredHostRegions,
    );
    if (rendered.length > 0) {
      for (const problem of rendered) errors.push(`${destination.file} (after sync): ${problem}`);
      continue;
    }
    if (next !== destination.content) writes.push({ file: destination.file, content: next });
  }
  return errors.length > 0 ? { errors, writes: [] } : { errors, writes };
}

export interface WholeSyncInput {
  references: { source: string; canonical: string; copies: { file: string; content: string }[] }[];
  blockDestinations: {
    file: string;
    content: string;
    blocks: { marker: string; canonical: string }[];
    hostRegions: readonly string[];
  }[];
}

/**
 * One plan for everything the generator touches — whole-file copies and marked blocks alike — so that a
 * malformed block destination refuses the copies too. Copying references first and refusing afterwards
 * left the tree half rewritten under a message that said nothing had been written.
 */
export function planWholeSync(input: WholeSyncInput): SyncPlan {
  const errors: string[] = [];
  const writes: { file: string; content: string }[] = [];
  for (const destination of input.blockDestinations) {
    const plan = planSharedSync(
      [{ file: destination.file, content: destination.content }],
      destination.blocks,
      destination.hostRegions,
    );
    errors.push(...plan.errors);
    writes.push(...plan.writes);
  }
  for (const reference of input.references) {
    for (const copy of reference.copies) {
      if (copy.content !== reference.canonical)
        writes.push({ file: copy.file, content: reference.canonical });
    }
  }
  return errors.length > 0 ? { errors, writes: [] } : { errors, writes };
}
