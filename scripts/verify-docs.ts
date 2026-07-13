import { lstat, readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import packageJson from "../package.json";

const root = join(import.meta.dir, "..");
const rootDocuments = ["README.md", "CHANGELOG.md", "CONTRIBUTING.md", "SECURITY.md"];
const docs = (await readdir(join(root, "docs")))
  .filter((path) => path.endsWith(".md"))
  .map((path) => `docs/${path}`);
const publicDocuments = [...rootDocuments, ...docs];
const errors: string[] = [];

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function localTarget(rawTarget: string): string | undefined {
  const target = rawTarget.replace(/^<|>$/g, "");
  if (target.startsWith("#") || /^[a-z][a-z\d+.-]*:/i.test(target)) return undefined;
  const withoutFragment = target.split("#", 1)[0]?.split("?", 1)[0];
  if (!withoutFragment) return undefined;
  try {
    return decodeURIComponent(withoutFragment);
  } catch {
    return withoutFragment;
  }
}

for (const document of publicDocuments) {
  const absoluteDocument = join(root, ...document.split("/"));
  const content = await readFile(absoluteDocument, "utf8");

  if (!content.endsWith("\n")) errors.push(`${document}: missing final newline`);
  if (/[ \t]+$/m.test(content)) errors.push(`${document}: trailing whitespace`);

  const h1Count = content.match(/^# [^#]/gm)?.length ?? 0;
  if (h1Count !== 1) errors.push(`${document}: expected exactly one level-one heading`);

  const fenceCount = content.match(/^```/gm)?.length ?? 0;
  if (fenceCount % 2 !== 0) errors.push(`${document}: unclosed fenced code block`);

  const targets = [
    ...content.matchAll(/!?\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)/g),
    ...content.matchAll(/^\[[^\]]+\]:\s*(<[^>]+>|\S+)/gm),
  ].map((match) => match[1]);

  for (const rawTarget of targets) {
    if (!rawTarget) continue;
    const target = localTarget(rawTarget);
    if (!target) continue;
    const absoluteTarget = resolve(dirname(absoluteDocument), target);
    if (!(await pathExists(absoluteTarget))) {
      errors.push(`${document}: missing local link target ${target}`);
    }
  }
}

const packageFiles = new Set(packageJson.files);
for (const entry of ["README.md", "CHANGELOG.md", "LICENSE", "docs"]) {
  if (!packageFiles.has(entry)) errors.push(`package.json: files is missing ${entry}`);
}

const changelog = await readFile(join(root, "CHANGELOG.md"), "utf8");
if (!changelog.includes("## [Unreleased]")) {
  errors.push("CHANGELOG.md: missing Unreleased section");
}
if (!changelog.includes(`## [${packageJson.version}] - `)) {
  errors.push(`CHANGELOG.md: missing release heading for ${packageJson.version}`);
}
if (
  !changelog.includes(
    `[Unreleased]: https://github.com/ivni/project-foundation/compare/v${packageJson.version}...HEAD`,
  )
) {
  errors.push(`CHANGELOG.md: Unreleased comparison must start at v${packageJson.version}`);
}
const releaseLink = changelog
  .split("\n")
  .find((line) =>
    line.startsWith(`[${packageJson.version}]: https://github.com/ivni/project-foundation/`),
  );
if (!releaseLink?.endsWith(`v${packageJson.version}`)) {
  errors.push(`CHANGELOG.md: missing release link for v${packageJson.version}`);
}

const releaseGuide = await readFile(join(root, "docs", "release.md"), "utf8");
if (/git tag(?:\s+-a)?\s+v\d+\.\d+\.\d+/.test(releaseGuide)) {
  errors.push("docs/release.md: use a version placeholder instead of a released tag");
}

const releaseNotesResult = Bun.spawnSync(
  [process.execPath, join(root, "scripts", "release-notes.ts"), packageJson.version],
  { cwd: root, stdout: "pipe", stderr: "pipe" },
);
if (releaseNotesResult.exitCode !== 0) {
  errors.push(
    `scripts/release-notes.ts: ${releaseNotesResult.stderr.toString().trim() || "failed"}`,
  );
} else if (/^\[[^\]]+\]:\s+/m.test(releaseNotesResult.stdout.toString())) {
  errors.push("scripts/release-notes.ts: release notes contain changelog link definitions");
}

if (errors.length > 0) {
  throw new Error(
    `Documentation verification failed:\n${errors.map((error) => `- ${error}`).join("\n")}`,
  );
}

process.stdout.write(
  `Documentation verified (${publicDocuments.length} files, package ${packageJson.version}).\n`,
);
