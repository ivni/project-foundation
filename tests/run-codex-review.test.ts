import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { SKILL_IDS, SKILLS } from "../packages/cli/src/skills.ts";
import {
  buildCodexArguments,
  buildReviewerPrompt,
  classifyCodexFailure,
  parseArguments,
  readStreamTail,
  validateReviewResult,
} from "../packages/run-codex-review-loop/scripts/run-codex-review.ts";

function reviewResult(
  status: "CLEAN" | "FINDINGS" | "BLOCKED",
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
) {
  return {
    schema_version: 1,
    status,
    scope: {
      reviewed_paths: ["src/example.ts"],
      excluded_paths: ["notes.txt"],
      notes: [],
    },
    findings:
      severity === undefined
        ? []
        : [
            {
              id: "F-001",
              fingerprint: "example:missing-guard",
              severity,
              title: "Missing guard",
              path: "src/example.ts",
              line: 12,
              evidence: "The changed branch dereferences an optional value.",
              impact: "A realistic request can fail.",
              recommendation: "Handle the absent value before dereferencing it.",
            },
          ],
    limitations: status === "BLOCKED" ? ["The task scope is unavailable."] : [],
    summary: "Reviewed the task changes.",
  };
}

describe("run-codex-review-loop registry", () => {
  test("registers the fourth packaged skill", () => {
    expect(SKILL_IDS).toContain("run-codex-review-loop");
    expect(SKILLS["run-codex-review-loop"].label).toBe("Codex Review Loop");
  });
});

describe("Codex review wrapper arguments", () => {
  test("pins the exact reviewer profile and read-only execution", () => {
    const contextPath = join(process.cwd(), "context.md");
    const options = parseArguments([
      "--context-file",
      contextPath,
      "--pass",
      "2",
      "--timeout-ms",
      "9000",
    ]);
    const outputPath = join(process.cwd(), "review.json");
    const args = buildCodexArguments(options, outputPath);

    expect(options.pass).toBe(2);
    expect(options.timeoutMs).toBe(9000);
    expect(args).toContain("read-only");
    expect(args).toContain("gpt-5.6-sol");
    expect(args).toContain('model_reasoning_effort="xhigh"');
    expect(args).toContain("--ephemeral");
    expect(args).toContain("--strict-config");
    expect(args).toContain("--output-schema");
    expect(args.at(-1)).toBe("-");
  });

  test("requires a context file and a bounded pass number", () => {
    expect(() => parseArguments(["--pass", "1"])).toThrow("--context-file is required");
    expect(() => parseArguments(["--context-file", "context.md", "--pass", "6"])).toThrow(
      "--pass must be between 1 and 5",
    );
  });

  test("rejects profile and schema overrides in the strict wrapper", () => {
    expect(() =>
      parseArguments(["--context-file", "context.md", "--pass", "1", "--model", "other"]),
    ).toThrow("unknown option: --model");
    expect(() =>
      parseArguments([
        "--context-file",
        "context.md",
        "--pass",
        "1",
        "--schema-file",
        "other.json",
      ]),
    ).toThrow("unknown option: --schema-file");
  });

  test("builds a delimited fresh-review prompt", () => {
    const prompt = buildReviewerPrompt("Stay read-only.", "Task: fix the parser.", 3);
    expect(prompt).toContain("reviewer pass 3 of at most 5");
    expect(prompt).toContain("<reviewer_contract>");
    expect(prompt).toContain("<task_context>");
    expect(prompt).toContain("Return only one JSON");
  });

  test("classifies authentication and model capability failures", () => {
    expect(classifyCodexFailure("HTTP error: 401 Unauthorized, Missing bearer token")).toBe(
      "authentication_required",
    );
    expect(classifyCodexFailure("model_not_found: requested model is unavailable")).toBe(
      "model_unavailable",
    );
    expect(classifyCodexFailure("process exited unexpectedly")).toBe("codex_failed");
  });

  test("keeps only a bounded diagnostic tail", async () => {
    const stream = new Blob(["a".repeat(128), "final"]).stream();
    expect(await readStreamTail(stream, 16)).toBe(`${"a".repeat(11)}final`);
  });
});

describe("Codex review result validation", () => {
  test("allows CLEAN with low residual findings", () => {
    expect(validateReviewResult(reviewResult("CLEAN", "LOW")).status).toBe("CLEAN");
  });

  test("requires blocking findings and states to agree", () => {
    expect(() => validateReviewResult(reviewResult("CLEAN", "MEDIUM"))).toThrow(
      "CLEAN cannot contain blocking findings",
    );
    expect(() => validateReviewResult(reviewResult("FINDINGS", "LOW"))).toThrow(
      "FINDINGS requires a critical, high, or medium finding",
    );
  });

  test("requires a limitation when the reviewer is blocked", () => {
    const result = reviewResult("BLOCKED");
    result.limitations = [];
    expect(() => validateReviewResult(result)).toThrow("BLOCKED requires at least one limitation");
  });

  test("rejects a clean result that reviewed no path", () => {
    const result = reviewResult("CLEAN");
    result.scope.reviewed_paths = [];
    expect(() => validateReviewResult(result)).toThrow("CLEAN requires at least one reviewed path");
  });

  test("rejects duplicate root-cause fingerprints", () => {
    const result = reviewResult("FINDINGS", "HIGH");
    const first = result.findings[0];
    if (first === undefined) throw new Error("test fixture is missing a finding");
    result.findings.push({ ...first, id: "F-002" });
    expect(() => validateReviewResult(result)).toThrow("duplicate finding fingerprint");
  });
});
