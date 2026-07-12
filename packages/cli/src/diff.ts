import { lstat, readFile, readlink } from "node:fs/promises";
import { join } from "node:path";

type Change = { type: "same" | "add" | "remove"; line: string };
type DiffText = { text: string; omitted?: string };

const MAX_INLINE_BYTES = 256 * 1024;
const MAX_MATRIX_CELLS = 2_000_000;
const MAX_INLINE_LINES = 4_000;
const MAX_CHANGED_FILES = 200;

function lineChanges(before: string[], after: string[]): Change[] | undefined {
  const rows = before.length + 1;
  const columns = after.length + 1;
  if (before.length + after.length > MAX_INLINE_LINES || rows * columns > MAX_MATRIX_CELLS) {
    return undefined;
  }
  const table = new Uint32Array(rows * columns);
  const at = (row: number, column: number) => row * columns + column;

  for (let row = before.length - 1; row >= 0; row -= 1) {
    for (let column = after.length - 1; column >= 0; column -= 1) {
      table[at(row, column)] =
        before[row] === after[column]
          ? (table[at(row + 1, column + 1)] ?? 0) + 1
          : Math.max(table[at(row + 1, column)] ?? 0, table[at(row, column + 1)] ?? 0);
    }
  }

  const changes: Change[] = [];
  let row = 0;
  let column = 0;
  while (row < before.length && column < after.length) {
    if (before[row] === after[column]) {
      changes.push({ type: "same", line: before[row] ?? "" });
      row += 1;
      column += 1;
    } else if ((table[at(row + 1, column)] ?? 0) >= (table[at(row, column + 1)] ?? 0)) {
      changes.push({ type: "remove", line: before[row] ?? "" });
      row += 1;
    } else {
      changes.push({ type: "add", line: after[column] ?? "" });
      column += 1;
    }
  }
  while (row < before.length) {
    changes.push({ type: "remove", line: before[row] ?? "" });
    row += 1;
  }
  while (column < after.length) {
    changes.push({ type: "add", line: after[column] ?? "" });
    column += 1;
  }
  return changes;
}

async function textOrEmpty(path: string): Promise<DiffText> {
  try {
    const entry = await lstat(path);
    if (entry.isSymbolicLink()) return { text: `[symbolic link -> ${await readlink(path)}]` };
    if (entry.isDirectory()) return { text: "[directory]" };
    if (!entry.isFile()) return { text: `[unsupported filesystem entry: mode ${entry.mode}]` };
    if (entry.size > MAX_INLINE_BYTES) {
      return {
        text: "",
        omitted: `${entry.size} bytes exceeds the ${MAX_INLINE_BYTES}-byte inline limit`,
      };
    }
    return { text: await readFile(path, "utf8") };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { text: "" };
    throw error;
  }
}

export async function createDirectoryDiff(
  expectedRoot: string,
  actualRoot: string,
  expectedFiles: Record<string, string>,
  actualFiles: Record<string, string>,
): Promise<string> {
  const paths = [...new Set([...Object.keys(expectedFiles), ...Object.keys(actualFiles)])].sort();
  const changedPaths = paths.filter((path) => expectedFiles[path] !== actualFiles[path]);
  const output: string[] = [];
  for (const path of changedPaths.slice(0, MAX_CHANGED_FILES)) {
    const expected = await textOrEmpty(join(expectedRoot, ...path.split("/")));
    const actual = await textOrEmpty(join(actualRoot, ...path.split("/")));
    output.push(`--- packaged/${path}`);
    output.push(`+++ installed/${path}`);
    if (expected.omitted || actual.omitted) {
      output.push(
        `! inline diff omitted: packaged ${expected.omitted ?? "within limits"}; installed ${actual.omitted ?? "within limits"}`,
      );
      continue;
    }
    const beforeLines = expected.text.split("\n");
    const afterLines = actual.text.split("\n");
    const changes = lineChanges(beforeLines, afterLines);
    if (!changes) {
      output.push(
        `! inline diff omitted: ${beforeLines.length} packaged lines and ${afterLines.length} installed lines exceed complexity limits`,
      );
      continue;
    }
    for (const change of changes) {
      const prefix = change.type === "same" ? " " : change.type === "add" ? "+" : "-";
      output.push(`${prefix}${change.line}`);
    }
  }
  if (changedPaths.length > MAX_CHANGED_FILES) {
    output.push(`... ${changedPaths.length - MAX_CHANGED_FILES} more changed paths omitted`);
  }
  return output.join("\n");
}

export function previewDiff(diff: string, maximumLines = 24): string {
  const lines = diff.split("\n");
  if (lines.length <= maximumLines) return diff;
  return `${lines.slice(0, maximumLines).join("\n")}\n... ${lines.length - maximumLines} more lines`;
}
