import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { SKILL_IDS, SKILLS } from "../packages/cli/src/skills.ts";
import {
  buildClaudeArguments,
  buildClaudeEnvironment,
  buildClaudeProfileProbeArguments,
  buildReviewerPrompt,
  classifyClaudeFailure,
  extractClaudeDiagnostic,
  parseArguments,
  parseClaudeReviewEnvelope,
  readStreamTail,
  reportedModels,
  selectClaudeDiagnostic,
  validateReviewResult,
  verifyReportedModels,
} from "../packages/run-claude-review-loop/scripts/run-claude-review.ts";

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

describe("run-claude-review-loop registry", () => {
  test("registers the packaged skill", () => {
    expect(SKILL_IDS).toContain("run-claude-review-loop");
    expect(SKILLS["run-claude-review-loop"].label).toBe("Claude Review Loop");
  });
});

describe("Claude review wrapper arguments", () => {
  test("pins Fable xhigh and excludes shell access", () => {
    const args = buildClaudeArguments('{"type":"object"}');
    expect(args).toContain("fable");
    expect(args).toContain("xhigh");
    expect(args).toContain("Read,Grep,Glob");
    expect(args).toContain("plan");
    expect(args).toContain("--safe-mode");
    expect(args).toContain("--no-session-persistence");
    expect(args).toContain("--json-schema");
    expect(args).not.toContain("Bash");
    expect(args).not.toContain("--dangerously-skip-permissions");

    const probeArgs = buildClaudeProfileProbeArguments();
    expect(probeArgs).toContain("fable");
    expect(probeArgs).toContain("xhigh");
    expect(probeArgs).toContain("text");
    expect(probeArgs).toContain("");
  });

  test("removes environment overrides but keeps authentication inputs", () => {
    const environment = buildClaudeEnvironment({
      PATH: "bin",
      ANTHROPIC_API_KEY: "test-key",
      ANTHROPIC_MODEL: "other",
      CLAUDE_CODE_EFFORT_LEVEL: "low",
      CLAUDE_CODE_SUBAGENT_MODEL: "other-child",
      CLAUDE_CODE_FORCE_SESSION_PERSISTENCE: "1",
      DEBUG: "1",
      OTEL_LOG_RAW_API_BODIES: "file:C:\\private-logs",
    });
    expect(environment.PATH).toBe("bin");
    expect(environment.ANTHROPIC_API_KEY).toBe("test-key");
    expect(environment.ANTHROPIC_MODEL).toBeUndefined();
    expect(environment.CLAUDE_CODE_EFFORT_LEVEL).toBeUndefined();
    expect(environment.CLAUDE_CODE_SUBAGENT_MODEL).toBeUndefined();
    expect(environment.CLAUDE_CODE_FORCE_SESSION_PERSISTENCE).toBeUndefined();
    expect(environment.DEBUG).toBeUndefined();
    expect(environment.OTEL_LOG_RAW_API_BODIES).toBeUndefined();
    expect(environment.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBe("1");
    expect(environment.DISABLE_AUTOUPDATER).toBe("1");
    expect(environment.DISABLE_UPDATES).toBe("1");
    expect(environment.DISABLE_TELEMETRY).toBe("1");
    expect(environment.DO_NOT_TRACK).toBe("1");
  });

  test("requires a context file and a bounded pass number", () => {
    expect(() => parseArguments(["--pass", "1"])).toThrow("--context-file is required");
    expect(parseArguments(["--context-file", "context.md", "--pass", "8"]).pass).toBe(8);
    expect(() => parseArguments(["--context-file", "context.md", "--pass", "9"])).toThrow(
      "--pass must be between 1 and 8",
    );
  });

  test("rejects profile and schema overrides", () => {
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

  test("resolves supplied paths and builds a delimited prompt", () => {
    const options = parseArguments([
      "--context-file",
      join(process.cwd(), "context.md"),
      "--pass",
      "3",
      "--timeout-ms",
      "9000",
    ]);
    const prompt = buildReviewerPrompt("Stay read-only.", "Task: fix the parser.", options.pass);
    expect(options.timeoutMs).toBe(9000);
    expect(prompt).toContain("reviewer pass 3 of at most 8");
    expect(prompt).toContain("<reviewer_contract>");
    expect(prompt).toContain("<task_context>");
    expect(prompt).toContain("Return only one JSON");
  });

  test("classifies authentication and model capability failures", () => {
    expect(classifyClaudeFailure("401: OAuth access token has expired. Re-authenticate.")).toBe(
      "authentication_required",
    );
    expect(classifyClaudeFailure("requested model is unavailable for this account")).toBe(
      "model_unavailable",
    );
    expect(classifyClaudeFailure("process exited unexpectedly")).toBe("claude_failed");
  });

  test("extracts the human error without leaking envelope metadata", () => {
    const diagnostic = extractClaudeDiagnostic(
      JSON.stringify({
        is_error: true,
        result: "Failed to authenticate.",
        session_id: "private-session-id",
      }),
    );
    expect(diagnostic).toBe("Failed to authenticate.");
    expect(diagnostic).not.toContain("private-session-id");

    const errorsDiagnostic = extractClaudeDiagnostic(
      JSON.stringify({
        is_error: true,
        errors: ["Schema retry limit reached.", "No structured result."],
        session_id: "another-private-session-id",
      }),
    );
    expect(errorsDiagnostic).toBe("Schema retry limit reached.; No structured result.");
    expect(errorsDiagnostic).not.toContain("another-private-session-id");

    expect(
      selectClaudeDiagnostic(
        JSON.stringify({ is_error: true, result: "Public model error", session_id: "hidden" }),
        "harmless startup warning",
      ),
    ).toBe("Public model error");
    expect(selectClaudeDiagnostic("{}", "Useful stderr diagnostic")).toBe(
      "Useful stderr diagnostic",
    );
    expect(selectClaudeDiagnostic("null", "Useful stderr diagnostic")).toBe(
      "Useful stderr diagnostic",
    );
    expect(selectClaudeDiagnostic('{"result":"   "}', "Useful stderr diagnostic")).toBe(
      "Useful stderr diagnostic",
    );
    expect(selectClaudeDiagnostic('{"errors":[]}', "Useful stderr diagnostic")).toBe(
      "Useful stderr diagnostic",
    );
  });

  test("rejects a CLI-reported fallback away from Fable", () => {
    const models = reportedModels({
      modelUsage: { "claude-fable-5": {}, "claude-sonnet-fallback": {} },
    });
    expect(models).toEqual(["claude-fable-5", "claude-sonnet-fallback"]);
    expect(() => verifyReportedModels(models)).toThrow("non-Fable runtime model");
    expect(() => verifyReportedModels(["claude-fable-5"])).not.toThrow();
    expect(() => verifyReportedModels([])).toThrow("did not report the runtime model");
    expect(() => verifyReportedModels(["provider-deployment-123"])).toThrow(
      "non-Fable runtime model",
    );
    expect(() => verifyReportedModels(["claude-opus-4-8"])).toThrow("non-Fable runtime model");
    expect(() => verifyReportedModels(["not-fable-model"])).toThrow("non-Fable runtime model");
    expect(reportedModels({ model: "fable", modelUsage: {} })).toEqual([]);
  });

  test("keeps only a bounded diagnostic tail", async () => {
    const stream = new Blob(["a".repeat(128), "final"]).stream();
    expect(await readStreamTail(stream, 16)).toBe(`${"a".repeat(11)}final`);
  });
});

describe("Claude review result validation", () => {
  test("accepts only a complete successful Fable envelope", () => {
    const envelope = {
      type: "result",
      subtype: "success",
      is_error: false,
      terminal_reason: "completed",
      permission_denials: [],
      modelUsage: { "claude-fable-5": {} },
      structured_output: reviewResult("CLEAN"),
    };
    expect(parseClaudeReviewEnvelope(envelope).runtimeModels).toEqual(["claude-fable-5"]);
    expect(() =>
      parseClaudeReviewEnvelope({
        ...envelope,
        permission_denials: [{ tool_name: "Read" }],
      }),
    ).toThrow("denied tool calls");
    expect(() =>
      parseClaudeReviewEnvelope({ ...envelope, terminal_reason: "hook_stopped" }),
    ).toThrow("terminal_reason=hook_stopped");
    expect(() => parseClaudeReviewEnvelope({ ...envelope, modelUsage: {} })).toThrow(
      "did not report the runtime model",
    );
    expect(() =>
      parseClaudeReviewEnvelope({ ...envelope, model: "fable", modelUsage: {} }),
    ).toThrow("did not report the runtime model");
    expect(() =>
      parseClaudeReviewEnvelope({
        type: "result",
        subtype: "error",
        is_error: true,
        result: "   ",
        errors: ["Useful structured error"],
      }),
    ).toThrow("Useful structured error");
  });

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
