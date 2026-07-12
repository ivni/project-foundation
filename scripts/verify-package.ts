import { lstat } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const required = [
  "dist/cli.js",
  "dist/cli.js.map",
  "packages/skill/SKILL.md",
  "packages/skill/agents/openai.yaml",
  "packages/skill/references",
  "packages/skill/templates",
] as const;

const requiredPackedFiles = [
  "dist/cli.js",
  "dist/cli.js.map",
  "packages/skill/SKILL.md",
  "packages/skill/agents/openai.yaml",
  "packages/skill/references/artifacts.md",
  "packages/skill/templates/discovery.md",
] as const;

for (const path of required) {
  await lstat(join(root, ...path.split("/")));
}

const processResult = Bun.spawnSync(["bun", "pm", "pack", "--dry-run", "--ignore-scripts"], {
  cwd: root,
  stdout: "pipe",
  stderr: "pipe",
});
if (processResult.exitCode !== 0) {
  throw new Error(processResult.stderr.toString() || "bun pm pack failed");
}

const output = processResult.stdout.toString();
for (const path of requiredPackedFiles) {
  if (!output.includes(path)) throw new Error(`Published package is missing ${path}`);
}

const forbidden = ["packages/cli/src", "packages/cli/test", ".discovery.tmp.md", ".git/"];
for (const path of forbidden) {
  if (output.includes(path)) throw new Error(`Published package unexpectedly includes ${path}`);
}

process.stdout.write("Package contents verified.\n");
