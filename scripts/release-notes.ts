import { readFile } from "node:fs/promises";
import { join } from "node:path";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error("Usage: bun scripts/release-notes.ts <version>");
}

const changelog = await readFile(join(import.meta.dir, "..", "CHANGELOG.md"), "utf8");
const lines = changelog.split("\n");
const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
if (start === -1) throw new Error(`CHANGELOG.md has no section for ${version}`);
const next = lines.findIndex(
  (line, index) => index > start && (line.startsWith("## [") || /^\[[^\]]+\]:\s+/.test(line)),
);
const section = lines
  .slice(start + 1, next === -1 ? undefined : next)
  .join("\n")
  .trim();
if (!section) throw new Error(`CHANGELOG.md section ${version} is empty`);
process.stdout.write(`${section}\n`);
