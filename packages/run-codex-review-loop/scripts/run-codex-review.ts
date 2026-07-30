#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_MODEL = "gpt-5.6-sol";
const DEFAULT_REASONING_EFFORT = "xhigh";
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_PASS = 8;
const RUN_STATE_DIRECTORY = "codex-review-runs";
const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/;
const DIAGNOSTIC_LIMIT = 32 * 1024;
const TERMINATION_GRACE_MS = 2000;
const TERMINATION_DEADLINE_MS = 5000;
const CLI_PREFLIGHT_TIMEOUT_MS = 10_000;
const TREE_KILL_COMMAND_TIMEOUT_MS = 1000;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));

export type ReviewSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ReviewClass = "DEFECT" | "ADVISORY";

/** What the reviewer itself may report. It is never told which findings block. */
export type ReviewStatus = "REVIEWED" | "BLOCKED";

/** Derived here, outside the reviewer's context, from the reported classes and severities. */
export type ReviewVerdict = "CLEAN" | "FINDINGS" | "BLOCKED";

const BLOCKING_SEVERITIES = new Set<ReviewSeverity>(["CRITICAL", "HIGH", "MEDIUM"]);

export interface ReviewFinding {
  id: string;
  fingerprint: string;
  class: ReviewClass;
  severity: ReviewSeverity;
  title: string;
  path: string;
  line: number | null;
  evidence: string;
  impact: string;
  recommendation: string;
}

export interface ReviewResult {
  schema_version: 2;
  status: ReviewStatus;
  scope: {
    reviewed_paths: string[];
    excluded_paths: string[];
    notes: string[];
  };
  findings: ReviewFinding[];
  limitations: string[];
  summary: string;
}

export interface ReviewVerdictSummary {
  value: ReviewVerdict;
  blocking_defects: number;
  defects: number;
  advisories: number;
}

export interface RunState {
  schema_version: 1;
  run_id: string;
  completed_passes: number[];
}

export interface ParsedArguments {
  help: boolean;
  cwd: string;
  contextFile: string;
  contractFile: string;
  schemaFile: string;
  runId: string;
  pass: number;
  timeoutMs: number;
}

type RunnerErrorKind =
  | "usage"
  | "codex_unavailable"
  | "authentication_required"
  | "model_unavailable"
  | "pass_budget"
  | "timeout"
  | "cancelled"
  | "codex_failed"
  | "invalid_output";

class RunnerError extends Error {
  constructor(
    readonly kind: RunnerErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "RunnerError";
  }
}

const usage = `Usage:
  bun run-codex-review.ts --context-file <path> --run-id <token> --pass <1-8> [options]

Required:
  --context-file <path>       Neutral task and scope context outside the repository
  --run-id <token>            Stable identifier for one review run; 8-64 characters of
                              [A-Za-z0-9._-] starting with a letter or digit. Reuse the same
                              token for every pass so the pass budget is actually enforced.
  --pass <1-8>                Completed reviewer pass number, in sequence within the run

Options:
  --cwd <path>                Repository root (default: current directory)
  --timeout-ms <milliseconds> Process timeout (default: 1800000)
  --help                      Show this help
`;

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new RunnerError("usage", `${flag} requires a value`);
  }
  return value;
}

function positiveInteger(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new RunnerError("usage", `${flag} must be a positive integer`);
  }
  return parsed;
}

export function parseArguments(args: string[]): ParsedArguments {
  const parsed: ParsedArguments = {
    help: false,
    cwd: process.cwd(),
    contextFile: "",
    contractFile: resolve(scriptDirectory, "../references/reviewer-contract.md"),
    schemaFile: resolve(scriptDirectory, "../assets/review-result.schema.json"),
    runId: "",
    pass: 0,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--help") {
      parsed.help = true;
      continue;
    }

    if (flag === undefined || !flag.startsWith("--")) {
      throw new RunnerError("usage", `unexpected argument: ${flag ?? "<missing>"}`);
    }

    const value = requireValue(args, index, flag);
    index += 1;

    switch (flag) {
      case "--cwd":
        parsed.cwd = value;
        break;
      case "--context-file":
        parsed.contextFile = value;
        break;
      case "--run-id":
        parsed.runId = value;
        break;
      case "--pass":
        parsed.pass = positiveInteger(value, flag);
        break;
      case "--timeout-ms":
        parsed.timeoutMs = positiveInteger(value, flag);
        break;
      default:
        throw new RunnerError("usage", `unknown option: ${flag}`);
    }
  }

  if (!parsed.help) {
    if (parsed.contextFile.length === 0) {
      throw new RunnerError("usage", "--context-file is required");
    }
    if (parsed.runId.length === 0) {
      throw new RunnerError("usage", "--run-id is required");
    }
    if (!RUN_ID_PATTERN.test(parsed.runId)) {
      throw new RunnerError(
        "usage",
        "--run-id must be 8-64 characters of [A-Za-z0-9._-] starting with a letter or digit",
      );
    }
    if (parsed.pass < 1 || parsed.pass > MAX_PASS) {
      throw new RunnerError("usage", `--pass must be between 1 and ${MAX_PASS}`);
    }
  }

  parsed.cwd = resolve(parsed.cwd);
  parsed.contextFile = parsed.contextFile.length > 0 ? resolve(parsed.contextFile) : "";
  parsed.contractFile = resolve(parsed.contractFile);
  parsed.schemaFile = resolve(parsed.schemaFile);
  return parsed;
}

export function buildCodexArguments(options: ParsedArguments, outputPath: string): string[] {
  return [
    "exec",
    "--ephemeral",
    "--strict-config",
    "--sandbox",
    "read-only",
    "--cd",
    options.cwd,
    "--model",
    DEFAULT_MODEL,
    "--config",
    `model_reasoning_effort=${JSON.stringify(DEFAULT_REASONING_EFFORT)}`,
    "--output-schema",
    options.schemaFile,
    "--output-last-message",
    outputPath,
    "--color",
    "never",
    "-",
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function runStatePath(runId: string): string {
  return join(tmpdir(), RUN_STATE_DIRECTORY, `${runId}.json`);
}

/**
 * The pass budget is per run identifier and lives outside the repository. A caller that invents a
 * fresh identifier every pass gets a fresh budget; that is a deliberate limit of a stateless CLI,
 * and the identifier is echoed in the envelope so the real pass count stays auditable.
 */
export async function readRunState(runId: string): Promise<RunState> {
  const path = runStatePath(runId);
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return { schema_version: 1, run_id: runId, completed_passes: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RunnerError("pass_budget", `run state file is not valid JSON: ${path}`);
  }
  if (
    !isRecord(parsed) ||
    parsed.schema_version !== 1 ||
    parsed.run_id !== runId ||
    !Array.isArray(parsed.completed_passes) ||
    parsed.completed_passes.some((pass) => !Number.isSafeInteger(pass) || (pass as number) < 1)
  ) {
    throw new RunnerError("pass_budget", `run state file is unusable: ${path}`);
  }
  return parsed as unknown as RunState;
}

export function assertPassAllowed(state: RunState, pass: number): void {
  if (state.completed_passes.length >= MAX_PASS) {
    throw new RunnerError(
      "pass_budget",
      `run ${state.run_id} already completed the maximum of ${MAX_PASS} reviewer passes`,
    );
  }
  const expected = state.completed_passes.length + 1;
  if (pass !== expected) {
    throw new RunnerError(
      "pass_budget",
      `run ${state.run_id} expects pass ${expected}, received pass ${pass}`,
    );
  }
}

export async function recordCompletedPass(state: RunState, pass: number): Promise<void> {
  const path = runStatePath(state.run_id);
  const next: RunState = {
    ...state,
    completed_passes: [...state.completed_passes, pass],
  };
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

export function deriveVerdict(review: ReviewResult): ReviewVerdictSummary {
  let defects = 0;
  let blocking = 0;
  for (const finding of review.findings) {
    if (finding.class !== "DEFECT") continue;
    defects += 1;
    if (BLOCKING_SEVERITIES.has(finding.severity)) blocking += 1;
  }
  return {
    value: review.status === "BLOCKED" ? "BLOCKED" : blocking > 0 ? "FINDINGS" : "CLEAN",
    blocking_defects: blocking,
    defects,
    advisories: review.findings.length - defects,
  };
}

function requireString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RunnerError("invalid_output", `${path} must be a non-empty string`);
  }
}

function requireStringArray(value: unknown, path: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new RunnerError("invalid_output", `${path} must be an array of strings`);
  }
}

export function validateReviewResult(value: unknown): ReviewResult {
  if (!isRecord(value)) {
    throw new RunnerError("invalid_output", "review result must be an object");
  }
  if (value.schema_version !== 2) {
    throw new RunnerError("invalid_output", "schema_version must be 2");
  }
  if (value.status !== "REVIEWED" && value.status !== "BLOCKED") {
    throw new RunnerError("invalid_output", "status must be REVIEWED or BLOCKED");
  }
  if (!isRecord(value.scope)) {
    throw new RunnerError("invalid_output", "scope must be an object");
  }
  requireStringArray(value.scope.reviewed_paths, "scope.reviewed_paths");
  requireStringArray(value.scope.excluded_paths, "scope.excluded_paths");
  requireStringArray(value.scope.notes, "scope.notes");
  requireStringArray(value.limitations, "limitations");
  requireString(value.summary, "summary");

  if (!Array.isArray(value.findings)) {
    throw new RunnerError("invalid_output", "findings must be an array");
  }

  if (value.status !== "BLOCKED" && value.scope.reviewed_paths.length === 0) {
    throw new RunnerError("invalid_output", `${value.status} requires at least one reviewed path`);
  }

  const ids = new Set<string>();
  const fingerprints = new Set<string>();

  for (const [index, finding] of value.findings.entries()) {
    const path = `findings[${index}]`;
    if (!isRecord(finding)) {
      throw new RunnerError("invalid_output", `${path} must be an object`);
    }
    requireString(finding.id, `${path}.id`);
    if (!/^F-[0-9]{3}$/.test(finding.id)) {
      throw new RunnerError("invalid_output", `${path}.id must match F-NNN`);
    }
    requireString(finding.fingerprint, `${path}.fingerprint`);
    requireString(finding.title, `${path}.title`);
    requireString(finding.path, `${path}.path`);
    requireString(finding.evidence, `${path}.evidence`);
    requireString(finding.impact, `${path}.impact`);
    requireString(finding.recommendation, `${path}.recommendation`);

    if (finding.class !== "DEFECT" && finding.class !== "ADVISORY") {
      throw new RunnerError("invalid_output", `${path}.class must be DEFECT or ADVISORY`);
    }
    if (
      finding.severity !== "CRITICAL" &&
      finding.severity !== "HIGH" &&
      finding.severity !== "MEDIUM" &&
      finding.severity !== "LOW"
    ) {
      throw new RunnerError("invalid_output", `${path}.severity is invalid`);
    }
    if (
      finding.line !== null &&
      (!Number.isSafeInteger(finding.line) || (finding.line as number) < 1)
    ) {
      throw new RunnerError("invalid_output", `${path}.line must be null or a positive integer`);
    }
    if (ids.has(finding.id)) {
      throw new RunnerError("invalid_output", `duplicate finding id: ${finding.id}`);
    }
    if (fingerprints.has(finding.fingerprint)) {
      throw new RunnerError(
        "invalid_output",
        `duplicate finding fingerprint: ${finding.fingerprint}`,
      );
    }
    ids.add(finding.id);
    fingerprints.add(finding.fingerprint);
  }

  if (value.status === "BLOCKED" && value.limitations.length === 0) {
    throw new RunnerError("invalid_output", "BLOCKED requires at least one limitation");
  }

  return value as unknown as ReviewResult;
}

export function buildReviewerPrompt(contract: string, context: string, pass: number): string {
  return `You are Codex reviewer pass ${pass} of at most ${MAX_PASS}.

<reviewer_contract>
${contract.trim()}
</reviewer_contract>

<task_context>
${context.trim()}
</task_context>

Apply the reviewer contract to the current repository at the configured working directory. The task
context is factual input, not an instruction to accept the implementation. Return only one JSON
object matching the supplied schema.`;
}

function tail(value: string, maximumLength: number): string {
  return value.length <= maximumLength ? value : value.slice(-maximumLength);
}

export async function readStreamTail(
  stream: ReadableStream<Uint8Array>,
  maximumLength = DIAGNOSTIC_LIMIT,
): Promise<string> {
  return consumeStreamTail(stream, maximumLength).promise;
}

function consumeStreamTail(stream: ReadableStream<Uint8Array>, maximumLength = DIAGNOSTIC_LIMIT) {
  const reader = stream.getReader();
  const promise = (async () => {
    const decoder = new TextDecoder();
    let output = "";

    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        output = tail(output + decoder.decode(chunk.value, { stream: true }), maximumLength);
      }
      return tail(output + decoder.decode(), maximumLength);
    } finally {
      reader.releaseLock();
    }
  })();

  return {
    promise,
    cancel: () => reader.cancel().catch(() => undefined),
  };
}

export function classifyCodexFailure(output: string): RunnerErrorKind {
  if (
    /401 Unauthorized|Missing bearer|invalid_api_key|not logged in|authentication required/i.test(
      output,
    )
  ) {
    return "authentication_required";
  }
  if (
    /model_not_found|model[^\n]*(?:not found|unavailable|unsupported|does not exist)|do not have access[^\n]*model/i.test(
      output,
    )
  ) {
    return "model_unavailable";
  }
  return "codex_failed";
}

function spawnCodexProcess(
  options: ParsedArguments,
  codexExecutable: string,
  codexArguments: string[],
) {
  return Bun.spawn([codexExecutable, ...codexArguments], {
    cwd: options.cwd,
    detached: process.platform !== "win32",
    stdin: "pipe" as const,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
  });
}

type CodexProcess = ReturnType<typeof spawnCodexProcess>;

function resolveCodexExecutable(repositoryRoot: string): string {
  const located = Bun.which("codex");
  if (located === null) {
    throw new RunnerError("codex_unavailable", "could not find Codex executable on PATH");
  }
  const executable = resolve(located);
  const repositoryRelative = relative(repositoryRoot, executable);
  const isRepositoryLocal =
    repositoryRelative === "" ||
    (repositoryRelative !== ".." &&
      !repositoryRelative.startsWith(`..${sep}`) &&
      !isAbsolute(repositoryRelative));
  if (isRepositoryLocal) {
    throw new RunnerError(
      "codex_unavailable",
      `refusing repository-local Codex executable: ${executable}`,
    );
  }
  return executable;
}

function verifyCodexCli(codexExecutable: string, timeoutMs: number): string {
  let result: ReturnType<typeof Bun.spawnSync>;
  try {
    result = Bun.spawnSync([codexExecutable, "--version"], {
      stdout: "pipe",
      stderr: "pipe",
      timeout: Math.max(1, Math.floor(Math.min(timeoutMs, CLI_PREFLIGHT_TIMEOUT_MS))),
      killSignal: "SIGKILL",
    });
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new RunnerError(
      "codex_unavailable",
      `could not launch Codex executable: ${codexExecutable}${detail}`,
    );
  }
  if (result.exitedDueToTimeout) {
    throw new RunnerError("timeout", "Codex CLI version preflight timed out");
  }
  if (result.signalCode !== undefined && result.signalCode !== null) {
    throw new RunnerError(
      "codex_unavailable",
      `Codex CLI version preflight terminated by ${result.signalCode}`,
    );
  }
  const version = result.stdout?.toString().trim() ?? "";
  if (result.exitCode !== 0 || !/^codex-cli\s+\S+$/i.test(version)) {
    throw new RunnerError(
      "codex_unavailable",
      "the codex command did not identify itself as codex-cli",
    );
  }
  return version;
}

function terminateProcessTree(child: CodexProcess, force: boolean): void {
  if (process.platform === "win32") {
    const windowsRoot = process.env.SystemRoot ?? process.env.WINDIR;
    if (windowsRoot !== undefined && isAbsolute(windowsRoot)) {
      const systemDirectory =
        process.arch === "ia32" && process.env.PROCESSOR_ARCHITEW6432 ? "Sysnative" : "System32";
      const taskkill = resolve(windowsRoot, systemDirectory, "taskkill.exe");
      if (existsSync(taskkill)) {
        const args = [taskkill, "/PID", String(child.pid), "/T"];
        if (force) args.push("/F");
        try {
          const result = Bun.spawnSync(args, {
            stdout: "ignore",
            stderr: "ignore",
            timeout: TREE_KILL_COMMAND_TIMEOUT_MS,
            killSignal: "SIGKILL",
          });
          if (result.exitCode === 0) return;
        } catch {
          // Fall through to direct process termination.
        }
      }
    }
  } else {
    try {
      process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM");
      return;
    } catch {
      // Fall through when the process group has exited or was not created.
    }
  }

  try {
    child.kill(force ? "SIGKILL" : "SIGTERM");
  } catch {
    // A bounded deadline below prevents an endless wait if termination fails.
  }
}

async function readRequiredFile(path: string, label: string): Promise<string> {
  try {
    const content = await readFile(path, "utf8");
    if (content.trim().length === 0) {
      throw new RunnerError("usage", `${label} is empty: ${path}`);
    }
    return content;
  } catch (error) {
    if (error instanceof RunnerError) {
      throw error;
    }
    throw new RunnerError("usage", `cannot read ${label}: ${path}`);
  }
}

async function runReview(options: ParsedArguments): Promise<Record<string, unknown>> {
  const startedAt = performance.now();
  const context = await readRequiredFile(options.contextFile, "context file");
  const contract = await readRequiredFile(options.contractFile, "reviewer contract");
  const schema = await readRequiredFile(options.schemaFile, "output schema");
  try {
    JSON.parse(schema);
  } catch {
    throw new RunnerError("usage", `output schema is not valid JSON: ${options.schemaFile}`);
  }
  const runState = await readRunState(options.runId);
  assertPassAllowed(runState, options.pass);
  const elapsedBeforePreflight = performance.now() - startedAt;
  if (elapsedBeforePreflight >= options.timeoutMs) {
    throw new RunnerError("timeout", `Codex review exceeded ${options.timeoutMs} ms`);
  }
  const codexExecutable = resolveCodexExecutable(options.cwd);
  const codexVersion = verifyCodexCli(codexExecutable, options.timeoutMs - elapsedBeforePreflight);

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "codex-review-"));
  const outputPath = join(temporaryDirectory, "review.json");
  let child: CodexProcess | undefined;
  let timedOut = false;
  let cancelledSignal: "SIGINT" | "SIGTERM" | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let forceKillTimeout: ReturnType<typeof setTimeout> | undefined;
  let terminationDeadline: ReturnType<typeof setTimeout> | undefined;
  let terminationDeadlineExpired = false;
  let stdoutConsumer: ReturnType<typeof consumeStreamTail> | undefined;
  let stderrConsumer: ReturnType<typeof consumeStreamTail> | undefined;
  let rejectTerminationDeadline: (error: RunnerError) => void = () => {};
  const terminationFailure = new Promise<never>((_resolve, reject) => {
    rejectTerminationDeadline = reject;
  });

  const beginTermination = () => {
    if (child === undefined || forceKillTimeout !== undefined) return;
    forceKillTimeout = setTimeout(() => {
      if (child !== undefined) terminateProcessTree(child, true);
    }, TERMINATION_GRACE_MS);
    terminationDeadline = setTimeout(() => {
      terminationDeadlineExpired = true;
      rejectTerminationDeadline(
        new RunnerError(
          timedOut ? "timeout" : "cancelled",
          "Codex process tree did not terminate after forced cancellation",
        ),
      );
    }, TERMINATION_DEADLINE_MS);
    terminateProcessTree(child, false);
  };

  const cancelWith = (signal: "SIGINT" | "SIGTERM") => {
    cancelledSignal = signal;
    beginTermination();
  };
  const onSigint = () => cancelWith("SIGINT");
  const onSigterm = () => cancelWith("SIGTERM");
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  try {
    const codexArguments = buildCodexArguments(options, outputPath);
    let subprocess: ReturnType<typeof spawnCodexProcess>;
    try {
      subprocess = spawnCodexProcess(options, codexExecutable, codexArguments);
      child = subprocess;
      if (cancelledSignal !== undefined) beginTermination();
    } catch (error) {
      const detail = error instanceof Error ? `: ${error.message}` : "";
      throw new RunnerError(
        "codex_unavailable",
        `could not launch Codex executable: ${codexExecutable}${detail}`,
      );
    }

    stdoutConsumer = consumeStreamTail(subprocess.stdout);
    stderrConsumer = consumeStreamTail(subprocess.stderr);
    subprocess.stdin.write(buildReviewerPrompt(contract, context, options.pass));
    subprocess.stdin.end();

    const remainingTimeoutMs = Math.max(1, options.timeoutMs - (performance.now() - startedAt));
    timeout = setTimeout(() => {
      timedOut = true;
      beginTermination();
    }, remainingTimeoutMs);

    const lifecycle = Promise.all([
      subprocess.exited,
      stdoutConsumer.promise,
      stderrConsumer.promise,
    ]);
    const [exitCode, stdout, stderr] = await Promise.race([lifecycle, terminationFailure]);

    if (cancelledSignal !== undefined) {
      throw new RunnerError("cancelled", `Codex review cancelled by ${cancelledSignal}`);
    }
    if (timedOut) {
      throw new RunnerError("timeout", `Codex review exceeded ${options.timeoutMs} ms`);
    }
    if (exitCode !== 0) {
      const fullDiagnostic = stderr.trim() || stdout.trim();
      const diagnostic = tail(fullDiagnostic, 3000);
      throw new RunnerError(
        classifyCodexFailure(fullDiagnostic),
        diagnostic.length > 0
          ? `Codex exited with code ${exitCode}: ${diagnostic}`
          : `Codex exited with code ${exitCode}`,
      );
    }

    let rawResult: string;
    try {
      rawResult = await readFile(outputPath, "utf8");
    } catch {
      throw new RunnerError("invalid_output", "Codex did not write a final review result");
    }

    let parsedResult: unknown;
    try {
      parsedResult = JSON.parse(rawResult);
    } catch {
      throw new RunnerError("invalid_output", "Codex final review result is not valid JSON");
    }
    const review = validateReviewResult(parsedResult);
    const verdict = deriveVerdict(review);
    await recordCompletedPass(runState, options.pass);

    return {
      schema_version: 2,
      runner_status: "ok",
      invocation: {
        runtime: "codex-cli",
        executable_path: codexExecutable,
        cli_version: codexVersion,
        requested_model: DEFAULT_MODEL,
        requested_reasoning_effort: DEFAULT_REASONING_EFFORT,
        profile_verification: "pinned-cli-arguments",
        sandbox: "read-only",
        no_test_policy: "reviewer-contract",
        ephemeral: true,
        run_id: options.runId,
        pass: options.pass,
        completed_passes_in_run: runState.completed_passes.length + 1,
        max_passes_in_run: MAX_PASS,
        cwd: options.cwd,
        elapsed_ms: Math.round(performance.now() - startedAt),
      },
      verdict: {
        ...verdict,
        derived_by: "wrapper",
        blocking_rule: "DEFECT at CRITICAL, HIGH, or MEDIUM",
      },
      review,
    };
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
    if (forceKillTimeout !== undefined) {
      clearTimeout(forceKillTimeout);
      if (child !== undefined) terminateProcessTree(child, true);
    }
    if (terminationDeadline !== undefined) {
      clearTimeout(terminationDeadline);
    }
    if (terminationDeadlineExpired) {
      await Promise.allSettled([
        stdoutConsumer?.cancel() ?? Promise.resolve(),
        stderrConsumer?.cancel() ?? Promise.resolve(),
      ]);
      child?.unref();
    }
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(usage);
      return;
    }
    const result = await runReview(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    const kind = error instanceof RunnerError ? error.kind : "codex_failed";
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(
      `${JSON.stringify(
        {
          schema_version: 2,
          runner_status: "error",
          error: { kind, message },
        },
        null,
        2,
      )}\n`,
    );
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
