import { lstat, readdir } from "node:fs/promises";
import { join } from "node:path";
import { SKILL_IDS } from "../packages/cli/src/skills.ts";

const root = join(import.meta.dir, "..");
const payloadEntries = [
  "SKILL.md",
  "agents",
  "assets",
  "references",
  "scripts",
  "templates",
] as const;
const required = ["dist/cli.js", "dist/cli.js.map", "docs"];
const requiredPackedFiles = [
  "dist/cli.js",
  "dist/cli.js.map",
  "docs/installation.md",
  "docs/release.md",
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
];

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function collectPackedFiles(absolute: string, packedPath: string): Promise<string[]> {
  const entry = await lstat(absolute);
  if (entry.isFile()) return [packedPath];
  if (!entry.isDirectory()) return [];

  const files: string[] = [];
  for (const child of await readdir(absolute, { withFileTypes: true })) {
    files.push(
      ...(await collectPackedFiles(join(absolute, child.name), `${packedPath}/${child.name}`)),
    );
  }
  return files;
}

for (const skillId of SKILL_IDS) {
  const skillRoot = join(root, "packages", skillId);
  required.push(`packages/${skillId}/SKILL.md`, `packages/${skillId}/agents/openai.yaml`);
  for (const entry of payloadEntries) {
    const absolute = join(skillRoot, entry);
    if (!(await pathExists(absolute))) continue;
    requiredPackedFiles.push(
      ...(await collectPackedFiles(absolute, `packages/${skillId}/${entry}`)),
    );
  }
}

for (const path of required) {
  await lstat(join(root, ...path.split("/")));
}

const processResult = Bun.spawnSync(
  [process.execPath, "pm", "pack", "--dry-run", "--ignore-scripts"],
  {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  },
);
if (processResult.exitCode !== 0) {
  throw new Error(processResult.stderr.toString() || "bun pm pack failed");
}

const output = processResult.stdout.toString();
for (const path of requiredPackedFiles) {
  if (!output.includes(path)) throw new Error(`Published package is missing ${path}`);
}

const forbidden = [
  "packages/cli/src",
  "packages/cli/test",
  ...SKILL_IDS.map((skillId) => `packages/${skillId}/package.json`),
  ".discovery.tmp.md",
  ".git/",
];
for (const path of forbidden) {
  if (output.includes(path)) throw new Error(`Published package unexpectedly includes ${path}`);
}

process.stdout.write(`Package contents verified (${SKILL_IDS.length} skill payloads).\n`);
