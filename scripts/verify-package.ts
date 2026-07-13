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

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const processResult = Bun.spawnSync(
  [npmExecutable, "pack", "--dry-run", "--json", "--ignore-scripts"],
  {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  },
);
if (processResult.exitCode !== 0) {
  throw new Error(processResult.stderr.toString() || "npm pack failed");
}

const output = processResult.stdout.toString();
const packResults: unknown = JSON.parse(output);
if (!Array.isArray(packResults) || packResults.length !== 1) {
  throw new Error("npm pack returned an unexpected result.");
}
const packResult = packResults[0] as { files?: Array<{ path?: unknown }> };
if (!Array.isArray(packResult.files)) {
  throw new Error("npm pack did not return a file manifest.");
}
const packedFiles = new Set(
  packResult.files.map((entry) => {
    if (typeof entry.path !== "string") {
      throw new Error("npm pack returned an invalid file manifest entry.");
    }
    return entry.path;
  }),
);
for (const path of requiredPackedFiles) {
  if (!packedFiles.has(path)) throw new Error(`Published package is missing ${path}`);
}

const forbidden = [
  "packages/cli/src",
  "packages/cli/test",
  ...SKILL_IDS.map((skillId) => `packages/${skillId}/package.json`),
  ".discovery.tmp.md",
  ".git/",
];
for (const path of forbidden) {
  const normalized = path.replace(/\/$/, "");
  if ([...packedFiles].some((file) => file === normalized || file.startsWith(`${normalized}/`))) {
    throw new Error(`Published package unexpectedly includes ${path}`);
  }
}

process.stdout.write(
  `Package contents verified (${SKILL_IDS.length} skill payloads, ${packedFiles.size} files).\n`,
);
