import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = join(
  import.meta.dir,
  "..",
  "packages",
  "project-foundation",
  "templates",
  "check-agent-contract.sh",
);

/**
 * Each case gets its own directory, so a fixture never observes another case's contract or pointer:
 * the gate reads whatever sits in its working directory, and a shared one would make every result
 * evidence about the last writer instead of about the case.
 */
async function runGate(
  files: Record<string, string>,
  environment: Record<string, string> = {},
): Promise<{ exitCode: number; stderr: string; stdout: string }> {
  const directory = await mkdtemp(join(tmpdir(), "agent-contract-gate-"));
  try {
    for (const [name, content] of Object.entries(files)) {
      await writeFile(join(directory, name), content);
    }
    const result = Bun.spawnSync([bash ?? "bash", script], {
      cwd: directory,
      env: { ...process.env, ...environment },
      stdout: "pipe",
      stderr: "pipe",
    });
    return {
      exitCode: result.exitCode,
      stderr: result.stderr.toString(),
      stdout: result.stdout.toString(),
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const contract = "# AGENTS.md\n\nThe contract.\n";

/**
 * The shipped gate is a POSIX shell script and CI also runs on Windows, where a POSIX shell is not
 * guaranteed. The fixtures skip there rather than reddening a runner over a template that platform
 * never executes — but on any other platform a missing shell fails the suite instead of quietly
 * skipping the only mechanism that holds the pointer rule.
 */
const bash = Bun.which("bash");

test.skipIf(process.platform === "win32")("a POSIX shell is available to run the gate", () => {
  expect(bash).not.toBeNull();
});

describe.skipIf(bash === null)("agent contract gate", () => {
  test("passes a contract within budget beside a pointer-only harness file", async () => {
    const result = await runGate({ "AGENTS.md": contract, "CLAUDE.md": "@AGENTS.md\n" });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ok");
  });

  /**
   * A configured pointer that does not exist is the one failure the harness cannot report itself:
   * Claude Code reads CLAUDE.md, so without that file it silently sees no contract at all.
   */
  test("fails when a configured harness pointer is missing", async () => {
    const result = await runGate({ "AGENTS.md": contract });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CLAUDE.md");
  });

  /** An empty override means "unset" the way the shell means it, not "no limit". */
  test("falls back to the default budget when an override is empty", async () => {
    const result = await runGate(
      { "AGENTS.md": `${"line\n".repeat(400)}`, "CLAUDE.md": "@AGENTS.md\n" },
      { AGENT_CONTRACT_MAX_LINES: "" },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("limit 300");
  });

  test("passes when the project declares that it has no harness pointer", async () => {
    const result = await runGate({ "AGENTS.md": contract }, { AGENT_CONTRACT_POINTERS: "" });
    expect(result.exitCode).toBe(0);
  });

  /** A limit that is not a number must stop the run, not skip the comparison that uses it. */
  test.each([
    ["AGENT_CONTRACT_MAX_LINES", "300L"],
    ["AGENT_CONTRACT_MAX_LINES", "0"],
    ["AGENT_CONTRACT_MAX_BYTES", "-1"],
  ])("fails when %s is set to %p", async (variable, value) => {
    const result = await runGate(
      { "AGENTS.md": `${"line\n".repeat(400)}`, "CLAUDE.md": "@AGENTS.md\n" },
      { [variable]: value },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(variable);
  });

  test("fails when the canonical contract is missing", async () => {
    const result = await runGate({ "CLAUDE.md": "@AGENTS.md\n" });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("missing");
  });

  test.each([
    ["over the line budget", `${"line\n".repeat(301)}`, { AGENT_CONTRACT_MAX_BYTES: "1000000" }],
    ["over the byte budget", `${"x".repeat(15361)}\n`, {}],
  ])("fails a contract %s", async (_label, body, environment) => {
    const result = await runGate({ "AGENTS.md": body }, environment);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("limit");
  });

  /**
   * Every one of these is a harness file that carries rules of its own, which is the second contract
   * the gate exists to prevent. A check that only looks for the import line, counts lines loosely, or
   * matches headings that start in column one calls most of them clean.
   */
  test.each([
    ["plain rules after the import", "@AGENTS.md\n\nAlways run the linter.\nNever push to main.\n"],
    ["an indented heading", "@AGENTS.md\n\n  ## Local rules\n\n- be careful\n"],
    ["a setext heading", "@AGENTS.md\n\nLocal rules\n-----------\n"],
    ["no import at all", "# Project rules\n\nDo the thing.\n"],
    ["an empty file", ""],
    ["a commented-out import", "<!-- @AGENTS.md -->\n"],
    ["two imports", "@AGENTS.md\n@docs/extra.md\n"],
  ])("fails a harness file with %s", async (_label, pointer) => {
    const result = await runGate({ "AGENTS.md": contract, "CLAUDE.md": pointer });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("CLAUDE.md");
  });

  /** The contract path is data, not a pattern: a dot in it must match a dot. */
  test("fails a harness file whose import only matches the contract path as a regex", async () => {
    const result = await runGate({ "AGENTS.md": contract, "CLAUDE.md": "@AGENTSxmd\n" });
    expect(result.exitCode).toBe(1);
  });

  test("honors configured paths and limits", async () => {
    const result = await runGate(
      { "CONTRACT.md": contract, "CLAUDE.md": "@CONTRACT.md\n" },
      { AGENT_CONTRACT: "CONTRACT.md", AGENT_CONTRACT_POINTERS: "CLAUDE.md" },
    );
    expect(result.exitCode).toBe(0);
  });
});
