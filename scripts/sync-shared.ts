import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { SHARED_REFERENCES } from "./shared-references.ts";

const root = join(import.meta.dir, "..");
let written = 0;

for (const reference of SHARED_REFERENCES) {
  const source = join(root, ...reference.source.split("/"));
  const canonical = await readFile(source, "utf8");
  for (const copy of reference.copies) {
    const destination = join(root, ...copy.split("/"));
    let current: string | undefined;
    try {
      current = await readFile(destination, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (current === canonical) continue;
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
    written += 1;
    process.stdout.write(`Synced ${copy}\n`);
  }
}

process.stdout.write(
  written === 0
    ? `Shared references already in sync (${SHARED_REFERENCES.length} sources).\n`
    : `Shared references synced (${written} copies rewritten).\n`,
);
