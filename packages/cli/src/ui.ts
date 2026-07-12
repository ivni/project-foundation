import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isCancel, MultiSelectPrompt, SelectPrompt, TextPrompt, updateSettings } from "@clack/core";
import { CancelledError } from "./types.ts";

const colorEnabled = !process.env.NO_COLOR && process.stdout.isTTY;
const ansi = (code: number, value: string): string =>
  colorEnabled ? `\u001B[${code}m${value}\u001B[0m` : value;

export const theme = {
  accent: (value: string) => ansi(34, value),
  success: (value: string) => ansi(32, value),
  warning: (value: string) => ansi(33, value),
  danger: (value: string) => ansi(31, value),
  muted: (value: string) => ansi(2, value),
  strong: (value: string) => ansi(1, value),
};

const unicodeEnabled =
  process.platform !== "win32" ||
  Boolean(process.env.WT_SESSION || process.env.TERM_PROGRAM || process.env.ConEmuANSI === "ON");

const glyph = {
  guide: unicodeEnabled ? "│" : "|",
  branch: unicodeEnabled ? "├" : "+",
  end: unicodeEnabled ? "└" : "`",
  cursor: unicodeEnabled ? "›" : ">",
  selected: unicodeEnabled ? "◆" : "[x]",
  empty: unicodeEnabled ? "◇" : "[ ]",
  success: unicodeEnabled ? "✓" : "OK",
  warning: "!",
  error: "x",
};

updateSettings({
  messages: { cancel: "Cancelled", error: "Something went wrong" },
  withGuide: false,
});

interface Choice<T> {
  value: T;
  label: string;
  hint?: string | undefined;
  disabled?: boolean;
}

function heading(message: string): string {
  return `${theme.accent(glyph.branch)} ${theme.strong(message)}`;
}

function submitted(message: string, value: string): string {
  return `${theme.success(glyph.success)} ${theme.muted(message)}\n  ${value}`;
}

function cancelled<T>(value: symbol | T | undefined): T {
  if (isCancel(value) || value === undefined) throw new CancelledError();
  return value;
}

export function intro(title: string, subtitle: string): void {
  const width = Math.min(62, Math.max(32, process.stdout.columns ?? 62));
  process.stdout.write(`\n${theme.accent("─".repeat(width))}\n`);
  process.stdout.write(`${theme.strong(title)}\n${theme.muted(subtitle)}\n`);
  process.stdout.write(`${theme.accent("─".repeat(width))}\n\n`);
}

export function outro(message: string): void {
  process.stdout.write(`\n${theme.success(glyph.success)} ${message}\n\n`);
}

export function info(message: string): void {
  process.stdout.write(`${theme.accent(glyph.guide)} ${message}\n`);
}

export function warn(message: string): void {
  process.stdout.write(`${theme.warning(glyph.warning)} ${message}\n`);
}

export function failure(message: string): void {
  process.stderr.write(`${theme.danger(glyph.error)} ${message}\n`);
}

export function note(title: string, lines: string[]): void {
  process.stdout.write(`\n${heading(title)}\n`);
  for (const line of lines) process.stdout.write(`${theme.muted(glyph.guide)} ${line}\n`);
  process.stdout.write("\n");
}

export async function select<T>(options: {
  message: string;
  choices: Choice<T>[];
  initialValue?: T;
}): Promise<T> {
  const prompt = new SelectPrompt<Choice<T>>({
    options: options.choices,
    ...(options.initialValue === undefined ? {} : { initialValue: options.initialValue }),
    render() {
      const selectedChoice = this.options.find((choice) => choice.value === this.value);
      if (this.state === "submit") {
        return submitted(options.message, selectedChoice?.label ?? String(this.value));
      }
      if (this.state === "cancel") return `${theme.warning(glyph.warning)} Cancelled`;
      const rows = this.options.map((choice, index) => {
        const active = index === this.cursor;
        const marker = active ? theme.accent(glyph.cursor) : " ";
        const label = choice.disabled
          ? theme.muted(choice.label)
          : active
            ? theme.accent(choice.label)
            : choice.label;
        const hint = choice.hint ? ` ${theme.muted(choice.hint)}` : "";
        return `${marker} ${label}${hint}`;
      });
      return `${heading(options.message)}\n${rows.join("\n")}`;
    },
  });
  return cancelled(await prompt.prompt());
}

export async function multiselect<T>(options: {
  message: string;
  choices: Choice<T>[];
  initialValues?: T[];
  required?: boolean;
}): Promise<T[]> {
  const prompt = new MultiSelectPrompt<Choice<T>>({
    options: options.choices,
    initialValues: options.initialValues ?? [],
    required: options.required ?? false,
    render() {
      const selected = this.value ?? [];
      if (this.state === "submit") {
        const labels = this.options
          .filter((choice) => selected.includes(choice.value))
          .map((choice) => choice.label);
        return submitted(options.message, labels.join(", ") || "None");
      }
      if (this.state === "cancel") return `${theme.warning(glyph.warning)} Cancelled`;
      const rows = this.options.map((choice, index) => {
        const active = index === this.cursor;
        const checked = selected.includes(choice.value);
        const marker = checked ? theme.accent(glyph.selected) : theme.muted(glyph.empty);
        const cursor = active ? theme.accent(glyph.cursor) : " ";
        const label = choice.disabled
          ? theme.muted(choice.label)
          : active
            ? theme.accent(choice.label)
            : choice.label;
        const hint = choice.hint ? ` ${theme.muted(choice.hint)}` : "";
        return `${cursor} ${marker} ${label}${hint}`;
      });
      return `${heading(options.message)}\n${rows.join("\n")}\n${theme.muted("  Space toggles. Enter confirms.")}`;
    },
  });
  return cancelled(await prompt.prompt());
}

export async function text(options: {
  message: string;
  defaultValue?: string;
  placeholder?: string;
  validate?: (value: string | undefined) => string | undefined;
}): Promise<string> {
  const prompt = new TextPrompt({
    ...(options.defaultValue === undefined ? {} : { defaultValue: options.defaultValue }),
    ...(options.placeholder === undefined ? {} : { placeholder: options.placeholder }),
    ...(options.validate === undefined ? {} : { validate: options.validate }),
    render() {
      if (this.state === "submit") return submitted(options.message, this.value ?? "");
      if (this.state === "cancel") return `${theme.warning(glyph.warning)} Cancelled`;
      const error = this.state === "error" ? `\n${theme.danger(this.error)}` : "";
      return `${heading(options.message)}\n${theme.accent(glyph.end)} ${this.userInputWithCursor}${error}`;
    },
  });
  return cancelled(await prompt.prompt());
}

export async function confirm(message: string, initialValue = true): Promise<boolean> {
  return select({
    message,
    initialValue,
    choices: [
      { value: true, label: "Yes" },
      { value: false, label: "No" },
    ],
  });
}

function parsePager(value: string): string[] {
  const matches = value.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  return matches.map((part) => part.replace(/^"|"$/g, ""));
}

export async function showDiff(diff: string): Promise<void> {
  if (!diff.trim()) {
    info("No content differences found.");
    return;
  }
  const pager = process.env.PAGER?.trim();
  if (pager && process.stdin.isTTY && process.stdout.isTTY) {
    const directory = await mkdtemp(join(tmpdir(), "project-foundation-diff-"));
    const path = join(directory, "changes.diff");
    try {
      await writeFile(path, diff, "utf8");
      const command = parsePager(pager);
      if (command.length > 0) {
        const child = Bun.spawn([...command, path], {
          stdin: "inherit",
          stdout: "inherit",
          stderr: "inherit",
        });
        await child.exited;
        return;
      }
    } catch {
      warn("The configured pager could not be opened. Using the built-in viewer.");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  const pageSize = Math.max(8, (process.stdout.rows ?? 24) - 6);
  const lines = diff.split("\n");
  for (let start = 0; start < lines.length; start += pageSize) {
    const page = lines.slice(start, start + pageSize).map((line) => {
      if (line.startsWith("+++") || line.startsWith("---")) return theme.strong(line);
      if (line.startsWith("+")) return theme.success(line);
      if (line.startsWith("-")) return theme.danger(line);
      return line;
    });
    process.stdout.write(`\n${page.join("\n")}\n`);
    if (start + pageSize < lines.length) {
      const next = await confirm(
        `Show ${Math.min(pageSize, lines.length - start - pageSize)} more lines?`,
      );
      if (!next) break;
    }
  }
}
