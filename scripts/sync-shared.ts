import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { planWholeSync } from "./shared-blocks.ts";
import { HOST_REGIONS, SHARED_BLOCKS, SHARED_REFERENCES } from "./shared-references.ts";

const root = join(import.meta.dir, "..");
const at = (relativePath: string) => join(root, ...relativePath.split("/"));
const readOrEmpty = async (path: string) => {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
};

// Everything is read and validated before the first write: whole-file references and marked blocks are
// one plan, and any error anywhere refuses the whole run with the tree untouched.
const references = [];
for (const reference of SHARED_REFERENCES) {
  const canonical = await readFile(at(reference.source), "utf8");
  const copies = [];
  for (const copy of reference.copies)
    copies.push({ file: copy, content: await readOrEmpty(at(copy)) });
  references.push({ source: reference.source, canonical, copies });
}

const byDestination = new Map<string, { marker: string; canonical: string }[]>();
for (const block of SHARED_BLOCKS) {
  const canonical = await readFile(at(block.source), "utf8");
  for (const copy of block.copies) {
    const list = byDestination.get(copy) ?? [];
    list.push({ marker: block.marker, canonical });
    byDestination.set(copy, list);
  }
}
const blockDestinations = [];
for (const [file, blocks] of byDestination) {
  blockDestinations.push({
    file,
    content: await readFile(at(file), "utf8"),
    blocks,
    hostRegions: HOST_REGIONS[file] ?? [],
  });
}

const plan = planWholeSync({ references, blockDestinations });
if (plan.errors.length > 0) {
  throw new Error(
    `Shared sync refused; nothing was written:\n${plan.errors.map((error) => `- ${error}`).join("\n")}`,
  );
}
for (const write of plan.writes) {
  await mkdir(dirname(at(write.file)), { recursive: true });
  await writeFile(at(write.file), write.content, "utf8");
  process.stdout.write(`Synced ${write.file}\n`);
}
process.stdout.write(
  plan.writes.length === 0
    ? `Shared text already in sync (${SHARED_REFERENCES.length} references, ${SHARED_BLOCKS.length} blocks).\n`
    : `Shared text synced (${plan.writes.length} copies rewritten).\n`,
);
