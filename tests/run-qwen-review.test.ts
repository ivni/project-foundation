import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SKILL_IDS, SKILLS } from "../packages/cli/src/skills.ts";
import {
  assertPassAllowed,
  buildQwenArguments,
  buildQwenEnvironment,
  buildQwenSettings,
  buildReviewerPrompt,
  classifyQwenFailure,
  deriveRunId,
  deriveVerdict,
  extractQwenDiagnostic,
  extractReviewJson,
  isRunStateExpired,
  parseArguments,
  parseQwenReviewEnvelope,
  type ReviewClass,
  type ReviewSeverity,
  type ReviewStatus,
  type RunState,
  readRunState,
  readStreamTail,
  recordCompletedPass,
  reportedModels,
  runStateDirectory,
  runStatePath,
  selectQwenDiagnostic,
  validateReviewResult,
  verifyReportedModels,
} from "../packages/run-qwen-review-loop/scripts/run-qwen-review.ts";

const RUN_ID = "qwen-run-00001";
const NOW = 1_770_000_000_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

function runState(completedPasses: number[], updatedAt: number = NOW): RunState {
  return {
    schema_version: 2,
    run_id: RUN_ID,
    created_at: NOW,
    updated_at: updatedAt,
    passes: completedPasses.map((pass) => ({ pass, tree_digest: null })),
  };
}

describe("run-qwen-review-loop registry", () => {
  test("registers the packaged skill", () => {
    expect(SKILL_IDS).toContain("run-qwen-review-loop");
    expect(SKILLS["run-qwen-review-loop"].label).toBe("Qwen Review Loop");
  });

  test("declares an explicit type for the structured output schema version", async () => {
    const schema = await Bun.file(
      join(process.cwd(), "packages/run-qwen-review-loop/assets/review-result.schema.json"),
    ).json();

    expect(schema.properties.schema_version).toEqual({ type: "integer", const: 2 });
  });

  test("withholds the blocking threshold from the reviewer's own status enum", async () => {
    const schema = await Bun.file(
      join(process.cwd(), "packages/run-qwen-review-loop/assets/review-result.schema.json"),
    ).json();

    expect(schema.properties.status.enum).toEqual(["REVIEWED", "BLOCKED"]);
    expect(schema.properties.findings.items.properties.class.enum).toEqual(["DEFECT", "ADVISORY"]);
    expect(schema.properties.findings.items.required).toContain("class");
  });

  test("keeps the blocking rule, the pass budget, and a clean inventory out of the contract", async () => {
    const contract = await Bun.file(
      join(process.cwd(), "packages/run-qwen-review-loop/references/reviewer-contract.md"),
    ).text();

    expect(contract).not.toContain("never block");
    expect(contract).not.toContain("blocks `CLEAN`");
    expect(contract).toContain("You do not decide the outcome");
    expect(contract).not.toContain("confirmed-clean");
    expect(contract).not.toContain("costs a pass");
  });

  test("names exactly three outcomes for a validated defect", async () => {
    const skill = await Bun.file(
      join(process.cwd(), "packages/run-qwen-review-loop/SKILL.md"),
    ).text();

    expect(skill).toContain("**`fixed`**");
    expect(skill).toContain("**`deferred`**");
    expect(skill).toContain("**`escalated`**");
    expect(skill).not.toContain("is a bug and gets fixed");
    expect(skill).not.toContain("confirmed-clean inventory");
  });
});

describe("Qwen review wrapper arguments", () => {
  test("pins the exact reviewer model and plan approval mode", () => {
    const contextPath = join(process.cwd(), "context.md");
    const options = parseArguments([
      "--context-file",
      contextPath,
      "--run-id",
      RUN_ID,
      "--pass",
      "2",
      "--timeout-ms",
      "9000",
    ]);
    const args = buildQwenArguments();

    expect(options.pass).toBe(2);
    expect(options.runId).toBe(RUN_ID);
    expect(options.timeoutMs).toBe(9000);
    expect(args).toContain("qwen3.8-max");
    expect(args).toContain("--approval-mode");
    expect(args).toContain("plan");
    expect(args).toContain("--output-format");
    expect(args).toContain("json");
  });

  test("pins reasoning effort and empties MCP servers through the system settings file", () => {
    const settings = buildQwenSettings();

    expect(settings).toEqual({
      model: { reasoningEffort: "xhigh" },
      tools: { approvalMode: "plan" },
      mcpServers: {},
    });
  });

  test("strips profile overrides while keeping the configured authentication", () => {
    const environment = buildQwenEnvironment("/state/settings.json", {
      OPENAI_MODEL: "other-model",
      QWEN_CODE_SYSTEM_SETTINGS_PATH: "/attacker/settings.json",
      QWEN_CODE_SYSTEM_DEFAULTS_PATH: "/attacker/defaults.json",
      QWEN_SANDBOX: "docker",
      OPENAI_API_KEY: "sk-keep",
      OPENAI_BASE_URL: "https://example.invalid/v1",
      PATH: "/usr/bin",
    });

    expect(environment.OPENAI_MODEL).toBeUndefined();
    expect(environment.QWEN_CODE_SYSTEM_DEFAULTS_PATH).toBeUndefined();
    expect(environment.QWEN_SANDBOX).toBeUndefined();
    expect(environment.QWEN_CODE_SYSTEM_SETTINGS_PATH).toBe("/state/settings.json");
    expect(environment.OPENAI_API_KEY).toBe("sk-keep");
    expect(environment.OPENAI_BASE_URL).toBe("https://example.invalid/v1");
    expect(environment.PATH).toBe("/usr/bin");
  });

  test("requires a context file and a bounded pass number", () => {
    expect(() => parseArguments(["--pass", "1"])).toThrow("--context-file is required");
    expect(
      parseArguments(["--context-file", "context.md", "--run-id", RUN_ID, "--pass", "10"]).pass,
    ).toBe(10);
    expect(() =>
      parseArguments(["--context-file", "context.md", "--run-id", RUN_ID, "--pass", "11"]),
    ).toThrow("--pass must be between 1 and 10");
  });

  test("accepts a defaulted run identifier and still validates an explicit one", () => {
    expect(parseArguments(["--context-file", "context.md", "--pass", "1"]).runId).toBe("");
    expect(() =>
      parseArguments(["--context-file", "context.md", "--run-id", "short", "--pass", "1"]),
    ).toThrow("--run-id must be 8-64 characters");
    expect(() =>
      parseArguments(["--context-file", "context.md", "--run-id", "../escape", "--pass", "1"]),
    ).toThrow("--run-id must be 8-64 characters");
    expect(runStatePath(RUN_ID).endsWith(join("qwen-review-runs", `${RUN_ID}.json`))).toBe(true);
  });

  test("derives the default identifier from the tree and commit, never from the diff", () => {
    const head = "a".repeat(40);
    const derived = deriveRunId("/repo/one", head);

    expect(derived).toBe(deriveRunId("/repo/one", head));
    expect(derived).not.toBe(deriveRunId("/repo/two", head));
    expect(derived).not.toBe(deriveRunId("/repo/one", "b".repeat(40)));
    expect(() =>
      parseArguments(["--context-file", "context.md", "--run-id", derived, "--pass", "1"]),
    ).not.toThrow();
  });

  test("keeps run state under the state home so a reboot cannot reset the budget", () => {
    const suffix = join("project-foundation", "qwen-review-runs");
    expect(runStateDirectory({ XDG_STATE_HOME: "/state" }, "/home/example")).toBe(
      join("/state", suffix),
    );
    expect(runStateDirectory({}, "/home/example")).toBe(
      join("/home/example", ".local", "state", suffix),
    );
    expect(runStateDirectory({ XDG_STATE_HOME: "relative" }, "/home/example")).toBe(
      join("/home/example", ".local", "state", suffix),
    );
  });

  test("rejects profile and schema overrides in the strict wrapper", () => {
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

  test("builds a delimited fresh-review prompt without a pass ordinal or budget", () => {
    const prompt = buildReviewerPrompt(
      "Stay read-only.",
      "Task: fix the parser.",
      '{"type":"object"}',
    );
    expect(prompt).toContain("<reviewer_contract>");
    expect(prompt).toContain("<output_schema>");
    expect(prompt).toContain("<task_context>");
    expect(prompt).toContain("Return only one JSON");
    expect(prompt).not.toMatch(/pass \d/i);
    expect(prompt).not.toContain("at most");
    expect(prompt).not.toContain(String(10));
  });

  test("classifies authentication and model capability failures", () => {
    expect(classifyQwenFailure("HTTP error: 401 Unauthorized")).toBe("authentication_required");
    expect(classifyQwenFailure("You are not logged in. Please run /auth first.")).toBe(
      "authentication_required",
    );
    expect(classifyQwenFailure("model_not_found: requested model is unavailable")).toBe(
      "model_unavailable",
    );
    expect(classifyQwenFailure("process exited unexpectedly")).toBe("qwen_failed");
  });

  test("keeps only a bounded diagnostic tail", async () => {
    const stream = new Blob(["a".repeat(128), "final"]).stream();
    expect(await readStreamTail(stream, 16)).toBe(`${"a".repeat(11)}final`);
  });
});

describe("Qwen review envelope parsing", () => {
  test("accepts a bare JSON review and one wrapping fence, and nothing looser", () => {
    const review = reviewResult("REVIEWED");
    const raw = JSON.stringify(review);

    expect(extractReviewJson(raw)).toEqual(review);
    expect(extractReviewJson(`\`\`\`json\n${raw}\n\`\`\``)).toEqual(review);
    expect(extractReviewJson(`\`\`\`\n${raw}\n\`\`\``)).toEqual(review);
    expect(() => extractReviewJson(`The review follows.\n${raw}`)).toThrow(
      "not one valid JSON review result",
    );
  });

  test("parses a successful envelope and reports the runtime models from its stats", () => {
    const review = reviewResult("REVIEWED");
    const envelope = JSON.stringify({
      response: JSON.stringify(review),
      stats: { models: { "qwen3.8-max": { tokens: { total: 100 } } } },
    });

    const parsed = parseQwenReviewEnvelope(envelope);
    expect(parsed.review).toEqual(validateReviewResult(review));
    expect(parsed.runtimeModels).toEqual(["qwen3.8-max"]);
  });

  test("accepts absent model stats but rejects a reported substitute model", () => {
    const review = reviewResult("REVIEWED");
    const withoutStats = JSON.stringify({ response: JSON.stringify(review) });
    expect(parseQwenReviewEnvelope(withoutStats).runtimeModels).toEqual([]);

    expect(() => verifyReportedModels(["qwen3-coder-plus"])).toThrow(
      "runtime model other than qwen3.8-max",
    );
    expect(() => verifyReportedModels(["qwen3.8-max", "dashscope/qwen3.8-max"])).not.toThrow();
    expect(reportedModels({ stats: { models: { "qwen3.8-max": {} } } })).toEqual(["qwen3.8-max"]);
  });

  test("converts an error envelope into a classified failure, never a clean review", () => {
    const envelope = JSON.stringify({
      error: { type: "AuthenticationError", message: "authentication required", code: 401 },
    });

    expect(() => parseQwenReviewEnvelope(envelope)).toThrow("authentication required");
    expect(extractQwenDiagnostic(envelope)).toBe("authentication required");
    expect(() => parseQwenReviewEnvelope(JSON.stringify({ stats: {} }))).toThrow(
      "omitted a response",
    );
    expect(() => parseQwenReviewEnvelope("plain text progress output")).toThrow(
      "not one valid JSON envelope",
    );
  });

  test("prefers stderr over non-envelope stdout noise, and the error envelope over stderr", () => {
    expect(selectQwenDiagnostic("Loading tools...\nWorking...", "401 Unauthorized")).toBe(
      "401 Unauthorized",
    );
    const errorEnvelope = JSON.stringify({ error: { message: "authentication required" } });
    expect(selectQwenDiagnostic(errorEnvelope, "less specific stderr")).toBe(
      "authentication required",
    );
    expect(selectQwenDiagnostic('{"stats":{}}', "stderr wins over a non-error envelope")).toBe(
      "stderr wins over a non-error envelope",
    );
    expect(selectQwenDiagnostic("only stdout noise", "")).toBe("only stdout noise");
    expect(selectQwenDiagnostic("", "")).toBe("");
  });
});

describe("Qwen review pass budget", () => {
  test("admits only the next pass in sequence", () => {
    expect(() => assertPassAllowed(runState([]), 1)).not.toThrow();
    expect(() => assertPassAllowed(runState([1, 2]), 3)).not.toThrow();
    expect(() => assertPassAllowed(runState([1, 2]), 2)).toThrow("expects pass 3, received pass 2");
    expect(() => assertPassAllowed(runState([1]), 5)).toThrow("expects pass 2, received pass 5");
  });

  test("refuses an eleventh pass in the same run", () => {
    expect(() => assertPassAllowed(runState([1, 2, 3, 4, 5, 6, 7, 8, 9]), 10)).not.toThrow();
    expect(() => assertPassAllowed(runState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 11)).toThrow(
      "already completed the maximum of 10 reviewer passes",
    );
  });

  test("expires abandoned run state instead of charging it to the next run", () => {
    expect(isRunStateExpired(runState([1, 2]), NOW)).toBe(false);
    expect(isRunStateExpired(runState([1, 2]), NOW + ONE_DAY_MS)).toBe(false);
    expect(isRunStateExpired(runState([1, 2]), NOW + ONE_DAY_MS + 1)).toBe(true);
    expect(isRunStateExpired(runState([1, 2], NOW + ONE_DAY_MS), NOW)).toBe(false);
  });

  test("persists each completed pass and its tree digest so the budget actually advances", async () => {
    const runId = "qwen-budget-roundtrip";
    const stateHome = await mkdtemp(join(tmpdir(), "qwen-review-state-"));
    const previousStateHome = process.env.XDG_STATE_HOME;
    process.env.XDG_STATE_HOME = stateHome;
    try {
      const fresh = await readRunState(runId, NOW);
      expect(fresh.passes).toEqual([]);

      await recordCompletedPass(fresh, 1, "digest-one", NOW);
      const afterFirst = await readRunState(runId, NOW);
      expect(afterFirst.passes).toEqual([{ pass: 1, tree_digest: "digest-one" }]);
      expect(() => assertPassAllowed(afterFirst, 1)).toThrow("expects pass 2, received pass 1");
      expect(() => assertPassAllowed(afterFirst, 2)).not.toThrow();

      await recordCompletedPass(afterFirst, 2, "digest-two", NOW + 1);
      const afterSecond = await readRunState(runId, NOW + 1);
      expect(afterSecond.passes.map((entry) => entry.pass)).toEqual([1, 2]);
      expect(afterSecond.passes.at(-1)?.tree_digest).toBe("digest-two");
      expect(afterSecond.updated_at).toBe(NOW + 1);
      expect(runStatePath(runId).startsWith(stateHome)).toBe(true);
    } finally {
      if (previousStateHome === undefined) delete process.env.XDG_STATE_HOME;
      else process.env.XDG_STATE_HOME = previousStateHome;
      await rm(stateHome, { recursive: true, force: true });
    }
  });
});

describe("Qwen review verdict derivation", () => {
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

describe("Qwen review result validation", () => {
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
