import { describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { SKILL_IDS, SKILLS } from "../packages/cli/src/skills.ts";
import {
  assertPassAllowed,
  buildClaudeArguments,
  buildClaudeEnvironment,
  buildClaudeProfileProbeArguments,
  buildReviewerPrompt,
  classifyClaudeFailure,
  deriveVerdict,
  extractClaudeDiagnostic,
  parseArguments,
  parseClaudeReviewEnvelope,
  type ReviewClass,
  type ReviewSeverity,
  type ReviewStatus,
  readRunState,
  readStreamTail,
  recordCompletedPass,
  reportedModels,
  runStatePath,
  selectClaudeDiagnostic,
  validateReviewResult,
  verifyReportedModels,
} from "../packages/run-claude-review-loop/scripts/run-claude-review.ts";

const RUN_ID = "claude-run-0001";

function finding(index: number, findingClass: ReviewClass, severity: ReviewSeverity) {
  return {
    id: `F-00${index}`,
    fingerprint: `example:missing-guard-${index}`,
    class: findingClass,
    severity,
    title: "Missing guard",
    path: "src/example.ts",
    line: 12,
    evidence: "The changed branch dereferences an optional value.",
    impact: "A realistic request can fail.",
    recommendation: "Handle the absent value before dereferencing it.",
  };
}

function reviewResult(
  status: ReviewStatus,
  findings: Array<{ class: ReviewClass; severity: ReviewSeverity }> = [],
) {
  return {
    schema_version: 2,
    status,
    scope: {
      reviewed_paths: ["src/example.ts"],
      excluded_paths: ["notes.txt"],
      notes: [],
    },
    findings: findings.map((item, index) => finding(index + 1, item.class, item.severity)),
    limitations: status === "BLOCKED" ? ["The task scope is unavailable."] : [],
    summary: "Reviewed the task changes.",
  };
}

function runState(completedPasses: number[]) {
  return { schema_version: 1 as const, run_id: RUN_ID, completed_passes: completedPasses };
}

describe("run-claude-review-loop registry", () => {
  test("registers the packaged skill", () => {
    expect(SKILL_IDS).toContain("run-claude-review-loop");
    expect(SKILLS["run-claude-review-loop"].label).toBe("Claude Review Loop");
  });

  test("declares an explicit type for the structured output schema version", async () => {
    const schema = await Bun.file(
      join(process.cwd(), "packages/run-claude-review-loop/assets/review-result.schema.json"),
    ).json();

    expect(schema.properties.schema_version).toEqual({ type: "integer", const: 2 });
  });

  test("withholds the blocking threshold from the reviewer's own status enum", async () => {
    const schema = await Bun.file(
      join(process.cwd(), "packages/run-claude-review-loop/assets/review-result.schema.json"),
    ).json();

    expect(schema.properties.status.enum).toEqual(["REVIEWED", "BLOCKED"]);
    expect(schema.properties.findings.items.properties.class.enum).toEqual(["DEFECT", "ADVISORY"]);
    expect(schema.properties.findings.items.required).toContain("class");
  });

  test("keeps the blocking rule out of the reviewer contract", async () => {
    const contract = await Bun.file(
      join(process.cwd(), "packages/run-claude-review-loop/references/reviewer-contract.md"),
    ).text();

    expect(contract).not.toContain("never block");
    expect(contract).not.toContain("blocks `CLEAN`");
    expect(contract).toContain("You do not decide the outcome");
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
    expect(
      parseArguments(["--context-file", "context.md", "--run-id", RUN_ID, "--pass", "8"]).pass,
    ).toBe(8);
    expect(() =>
      parseArguments(["--context-file", "context.md", "--run-id", RUN_ID, "--pass", "9"]),
    ).toThrow("--pass must be between 1 and 8");
  });

  test("requires a reusable run identifier so the pass budget is enforceable", () => {
    expect(() => parseArguments(["--context-file", "context.md", "--pass", "1"])).toThrow(
      "--run-id is required",
    );
    expect(() =>
      parseArguments(["--context-file", "context.md", "--run-id", "short", "--pass", "1"]),
    ).toThrow("--run-id must be 8-64 characters");
    expect(() =>
      parseArguments(["--context-file", "context.md", "--run-id", "../escape", "--pass", "1"]),
    ).toThrow("--run-id must be 8-64 characters");
    expect(runStatePath(RUN_ID).endsWith(join("claude-review-runs", `${RUN_ID}.json`))).toBe(true);
  });

  test("rejects profile and schema overrides", () => {
    expect(() =>
      parseArguments([
        "--context-file",
        "context.md",
        "--run-id",
        RUN_ID,
        "--pass",
        "1",
        "--model",
        "other",
      ]),
    ).toThrow("unknown option: --model");
    expect(() =>
      parseArguments([
        "--context-file",
        "context.md",
        "--run-id",
        RUN_ID,
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
      "--run-id",
      RUN_ID,
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

describe("Claude review pass budget", () => {
  test("admits only the next pass in sequence", () => {
    expect(() => assertPassAllowed(runState([]), 1)).not.toThrow();
    expect(() => assertPassAllowed(runState([1, 2]), 3)).not.toThrow();
    expect(() => assertPassAllowed(runState([1, 2]), 2)).toThrow("expects pass 3, received pass 2");
    expect(() => assertPassAllowed(runState([1]), 5)).toThrow("expects pass 2, received pass 5");
  });

  test("refuses a ninth pass in the same run", () => {
    expect(() => assertPassAllowed(runState([1, 2, 3, 4, 5, 6, 7]), 8)).not.toThrow();
    expect(() => assertPassAllowed(runState([1, 2, 3, 4, 5, 6, 7, 8]), 9)).toThrow(
      "already completed the maximum of 8 reviewer passes",
    );
  });

  test("persists each completed pass so the budget actually advances", async () => {
    const runId = "claude-budget-roundtrip";
    const statePath = runStatePath(runId);
    await rm(statePath, { force: true });
    try {
      const fresh = await readRunState(runId);
      expect(fresh.completed_passes).toEqual([]);

      await recordCompletedPass(fresh, 1);
      const afterFirst = await readRunState(runId);
      expect(afterFirst.completed_passes).toEqual([1]);
      expect(() => assertPassAllowed(afterFirst, 1)).toThrow("expects pass 2, received pass 1");
      expect(() => assertPassAllowed(afterFirst, 2)).not.toThrow();

      await recordCompletedPass(afterFirst, 2);
      expect((await readRunState(runId)).completed_passes).toEqual([1, 2]);
    } finally {
      await rm(statePath, { force: true });
    }
  });
});

describe("Claude review verdict derivation", () => {
  test("blocks on a defect at medium or above", () => {
    for (const severity of ["CRITICAL", "HIGH", "MEDIUM"] as const) {
      const verdict = deriveVerdict(
        validateReviewResult(reviewResult("REVIEWED", [{ class: "DEFECT", severity }])),
      );
      expect(verdict.value).toBe("FINDINGS");
      expect(verdict.blocking_defects).toBe(1);
    }
  });

  test("clears a low defect and any advisory", () => {
    const verdict = deriveVerdict(
      validateReviewResult(
        reviewResult("REVIEWED", [
          { class: "DEFECT", severity: "LOW" },
          { class: "ADVISORY", severity: "HIGH" },
          { class: "ADVISORY", severity: "MEDIUM" },
        ]),
      ),
    );
    expect(verdict.value).toBe("CLEAN");
    expect(verdict.blocking_defects).toBe(0);
    expect(verdict.defects).toBe(1);
    expect(verdict.advisories).toBe(2);
  });

  test("clears an empty review and preserves a reviewer block", () => {
    expect(deriveVerdict(validateReviewResult(reviewResult("REVIEWED"))).value).toBe("CLEAN");
    expect(deriveVerdict(validateReviewResult(reviewResult("BLOCKED"))).value).toBe("BLOCKED");
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
      structured_output: reviewResult("REVIEWED"),
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

  test("rejects a reviewer-supplied verdict", () => {
    const result = { ...reviewResult("REVIEWED"), status: "CLEAN" };
    expect(() => validateReviewResult(result)).toThrow("status must be REVIEWED or BLOCKED");
  });

  test("requires a finding class", () => {
    const result = reviewResult("REVIEWED", [{ class: "DEFECT", severity: "HIGH" }]);
    const first = result.findings[0];
    if (first === undefined) throw new Error("test fixture is missing a finding");
    expect(() =>
      validateReviewResult({ ...result, findings: [{ ...first, class: "IMPORTANT" }] }),
    ).toThrow("class must be DEFECT or ADVISORY");
  });

  test("requires a limitation when the reviewer is blocked", () => {
    const result = reviewResult("BLOCKED");
    result.limitations = [];
    expect(() => validateReviewResult(result)).toThrow("BLOCKED requires at least one limitation");
  });

  test("rejects a completed review that reviewed no path", () => {
    const result = reviewResult("REVIEWED");
    result.scope.reviewed_paths = [];
    expect(() => validateReviewResult(result)).toThrow(
      "REVIEWED requires at least one reviewed path",
    );
  });

  test("rejects duplicate root-cause fingerprints", () => {
    const result = reviewResult("REVIEWED", [{ class: "DEFECT", severity: "HIGH" }]);
    const first = result.findings[0];
    if (first === undefined) throw new Error("test fixture is missing a finding");
    result.findings.push({ ...first, id: "F-002" });
    expect(() => validateReviewResult(result)).toThrow("duplicate finding fingerprint");
  });
});
