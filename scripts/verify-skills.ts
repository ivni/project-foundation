import { lstat, readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { isSkillId, SKILL_IDS } from "../packages/cli/src/skills.ts";
import { SHARED_REFERENCES } from "./shared-references.ts";

const root = join(import.meta.dir, "..");
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

async function markdownFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await markdownFiles(path)));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
  }
  return files;
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

const packageEntries = await readdir(join(root, "packages"), { withFileTypes: true });
for (const entry of packageEntries) {
  if (!entry.isDirectory()) continue;
  if (!(await pathExists(join(root, "packages", entry.name, "SKILL.md")))) continue;
  if (!isSkillId(entry.name)) {
    errors.push(`packages/${entry.name}: payload directory is missing from the skill registry`);
  }
}

for (const skillId of SKILL_IDS) {
  const directory = `packages/${skillId}`;
  const skillRoot = join(root, "packages", skillId);
  const skillPath = join(skillRoot, "SKILL.md");
  const openAiPath = join(skillRoot, "agents", "openai.yaml");
  if (!(await pathExists(skillPath))) {
    errors.push(`${directory}/SKILL.md: missing registered payload`);
    continue;
  }
  const content = await readFile(skillPath, "utf8");
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];

  /**
   * Claude Code and Pi read `disable-model-invocation` from the frontmatter; Codex, OpenCode, and
   * Hermes read their own metadata and ignore unknown fields. One payload therefore carries the
   * portable pair, and `agents/openai.yaml` must agree with it.
   */
  let userInvokedInSkill = false;
  if (!frontmatter) {
    errors.push(`${directory}/SKILL.md: missing YAML frontmatter`);
  } else {
    const fields = frontmatter
      .split(/\r?\n/)
      .map((line) => line.match(/^([a-z][a-z0-9_-]*):/)?.[1])
      .filter((field): field is string => Boolean(field));
    if (fields[0] !== "name" || fields[1] !== "description") {
      errors.push(`${directory}/SKILL.md: frontmatter must start with name then description`);
    }
    const unsupported = fields.slice(2).filter((field) => field !== "disable-model-invocation");
    if (unsupported.length > 0) {
      errors.push(`${directory}/SKILL.md: unsupported frontmatter field ${unsupported.join(", ")}`);
    }
    if (!frontmatter.includes(`name: ${skillId}`)) {
      errors.push(`${directory}/SKILL.md: expected name ${skillId}`);
    }
    const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim();
    if (!description) errors.push(`${directory}/SKILL.md: missing description`);

    const invocationFlag = frontmatter.match(/^disable-model-invocation:\s*(.+)$/m)?.[1]?.trim();
    if (invocationFlag !== undefined && invocationFlag !== "true") {
      errors.push(
        `${directory}/SKILL.md: disable-model-invocation must be true or be omitted entirely`,
      );
    }
    userInvokedInSkill = invocationFlag === "true";
  }

  if (content.split(/\r?\n/).length > 500) {
    errors.push(`${directory}/SKILL.md: exceeds 500 lines`);
  }
  if (/\bTODO\b|\[TODO/i.test(content)) {
    errors.push(`${directory}/SKILL.md: contains an unresolved TODO`);
  }
  if (!(await pathExists(openAiPath))) {
    errors.push(`${directory}/agents/openai.yaml: missing`);
  } else {
    const openAi = await readFile(openAiPath, "utf8");
    if (!openAi.includes(`$${skillId}`)) {
      errors.push(`${directory}/agents/openai.yaml: default prompt must name $${skillId}`);
    }
    const implicit = openAi.match(/^\s*allow_implicit_invocation:\s*(.+)$/m)?.[1]?.trim();
    if (implicit !== "true" && implicit !== "false") {
      errors.push(
        `${directory}/agents/openai.yaml: policy.allow_implicit_invocation must be declared as true or false`,
      );
    } else if (userInvokedInSkill === (implicit === "true")) {
      errors.push(
        `${directory}: invocation policy disagrees across harnesses — SKILL.md ${
          userInvokedInSkill ? "disables" : "allows"
        } model invocation while openai.yaml sets allow_implicit_invocation: ${implicit}`,
      );
    }
  }

  for (const markdownPath of await markdownFiles(skillRoot)) {
    const markdown = await readFile(markdownPath, "utf8");
    if (!markdown.endsWith("\n")) {
      errors.push(`${markdownPath}: missing final newline`);
    }
    if (/[ \t]+$/m.test(markdown)) errors.push(`${markdownPath}: trailing whitespace`);
    const relativeMarkdownPath = relative(skillRoot, markdownPath).replaceAll("\\", "/");
    if (relativeMarkdownPath.startsWith("templates/")) continue;
    const targets = [...markdown.matchAll(/!?\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)/g)].map(
      (match) => match[1],
    );
    for (const rawTarget of targets) {
      if (!rawTarget) continue;
      const target = localTarget(rawTarget);
      if (!target) continue;
      if (!(await pathExists(resolve(dirname(markdownPath), target)))) {
        errors.push(`${markdownPath}: missing local link target ${target}`);
      }
    }
  }
}

for (const reference of SHARED_REFERENCES) {
  const sourcePath = join(root, ...reference.source.split("/"));
  if (!(await pathExists(sourcePath))) {
    errors.push(`${reference.source}: missing canonical shared reference`);
    continue;
  }
  const canonical = await readFile(sourcePath, "utf8");
  for (const copy of reference.copies) {
    const copyPath = join(root, ...copy.split("/"));
    if (!(await pathExists(copyPath))) {
      errors.push(`${copy}: missing generated copy of ${reference.source}`);
      continue;
    }
    if ((await readFile(copyPath, "utf8")) !== canonical) {
      errors.push(`${copy}: drifted from ${reference.source} — run bun run sync:shared`);
    }
  }
}

if (errors.length > 0) {
  throw new Error(`Skill verification failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
}

process.stdout.write(
  `Skills verified (${SKILL_IDS.length} payloads, ${SHARED_REFERENCES.length} shared references).\n`,
);
