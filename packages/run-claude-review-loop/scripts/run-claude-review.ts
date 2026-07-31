#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const MODEL = "fable";
const EFFORT = "xhigh";
const TOOLS = "Read,Grep,Glob";
const MAX_PASS = 8;
const STATE_ROOT_DIRECTORY = "project-foundation";
const RUN_STATE_DIRECTORY = "claude-review-runs";
/** Run state left untouched this long belongs to an abandoned run, not to the next one. */
const RUN_STATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const DERIVED_RUN_ID_PREFIX = "auto-";
const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/;
const GIT_COMMAND_TIMEOUT_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_PROMPT_BYTES = 8 * 1024 * 1024;
const MAX_STDOUT_LENGTH = 4 * 1024 * 1024;
const DIAGNOSTIC_LIMIT = 32 * 1024;
const PREFLIGHT_TIMEOUT_MS = 10_000;
const PROFILE_PROBE_TIMEOUT_MS = 60_000;
const PROFILE_PROBE_RESPONSE = "CLAUDE_REVIEW_PROFILE_OK";
const TERMINATION_GRACE_MS = 2000;
const TERMINATION_DEADLINE_MS = 5000;
const TREE_KILL_TIMEOUT_MS = 1000;
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
  scope: { reviewed_paths: string[]; excluded_paths: string[]; notes: string[] };
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

export interface RunPass {
  pass: number;
  tree_digest: string | null;
}

export interface RunState {
  schema_version: 2;
  run_id: string;
  created_at: number;
  updated_at: number;
  passes: RunPass[];
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
  | "claude_unavailable"
  | "authentication_required"
  | "model_unavailable"
  | "profile_unavailable"
  | "pass_budget"
  | "timeout"
  | "cancelled"
  | "claude_failed"
  | "invalid_output";

class RunnerError extends Error {
  constructor(
    readonly kind: RunnerErrorKind,
    message: string,
    readonly invocation?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "RunnerError";
  }
}

const usage = `Usage:
  bun run-claude-review.ts --context-file <path> --pass <1-8> [options]

Required:
  --context-file <path>       Neutral task and scope context outside the repository
  --pass <1-8>                Completed reviewer pass number, in sequence within the run

Options:
  --cwd <path>                Repository root (default: current directory)
  --run-id <token>            Identifier for one review run; 8-64 characters of [A-Za-z0-9._-]
                              starting with a letter or digit. Defaults to a token derived from the
                              repository path and current commit, so passes over one working tree
                              share one budget. An explicit token starts a separate budget.
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
    if (parsed.runId.length > 0 && !RUN_ID_PATTERN.test(parsed.runId)) {
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

export function buildClaudeArguments(schema: string): string[] {
  return [
    "-p",
    "--model",
    MODEL,
    "--effort",
    EFFORT,
    "--safe-mode",
    "--tools",
    TOOLS,
    "--permission-mode",
    "plan",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--no-chrome",
    "--disable-slash-commands",
    "--output-format",
    "json",
    "--json-schema",
    schema,
  ];
}

export function buildClaudeProfileProbeArguments(): string[] {
  return [
    "-p",
    "--model",
    MODEL,
    "--effort",
    EFFORT,
    "--safe-mode",
    "--tools",
    "",
    "--permission-mode",
    "plan",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--no-chrome",
    "--disable-slash-commands",
    "--output-format",
    "text",
    `Return exactly ${PROFILE_PROBE_RESPONSE}.`,
  ];
}

const PROFILE_OVERRIDE_KEYS = new Set([
  "ANTHROPIC_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  "CLAUDE_CODE_EFFORT_LEVEL",
  "CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL",
  "CLAUDE_CODE_EXTRA_BODY",
  "CLAUDE_CODE_FORCE_SESSION_PERSISTENCE",
  "CLAUDE_CODE_SUBAGENT_MODEL",
  "DEBUG",
  "OTEL_LOG_ASSISTANT_RESPONSES",
  "OTEL_LOG_RAW_API_BODIES",
  "OTEL_LOG_TOOL_CONTENT",
  "OTEL_LOG_TOOL_DETAILS",
  "OTEL_LOG_USER_PROMPTS",
]);

// ANTHROPIC_DEFAULT_FABLE_MODEL is intentionally retained so Claude Code can resolve supported
// third-party Fable deployments. It is not trusted as proof: successful output still needs a
// recognizable Fable model identifier.

export function buildClaudeEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && !PROFILE_OVERRIDE_KEYS.has(key.toUpperCase())) {
      sanitized[key] = value;
    }
  }
  sanitized.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
  sanitized.CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL = "1";
  sanitized.CLAUDE_CODE_DISABLE_TERMINAL_TITLE = "1";
  sanitized.CLAUDE_CODE_ENABLE_TELEMETRY = "0";
  sanitized.DISABLE_AUTOUPDATER = "1";
  sanitized.DISABLE_ERROR_REPORTING = "1";
  sanitized.DISABLE_TELEMETRY = "1";
  sanitized.DISABLE_UPDATES = "1";
  sanitized.DO_NOT_TRACK = "1";
  sanitized.FORCE_AUTOUPDATE_PLUGINS = "0";
  return sanitized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Run state lives under the user state directory rather than the temporary directory, so a reboot or
 * a tmp sweep does not hand an in-progress run a fresh budget.
 */
export function runStateDirectory(
  environment: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
): string {
  const configured = environment.XDG_STATE_HOME;
  const base =
    configured !== undefined && configured.length > 0 && isAbsolute(configured)
      ? configured
      : home.length > 0
        ? join(home, ".local", "state")
        : tmpdir();
  return join(base, STATE_ROOT_DIRECTORY, RUN_STATE_DIRECTORY);
}

export function runStatePath(runId: string): string {
  return join(runStateDirectory(), `${runId}.json`);
}

/**
 * The default identifier is derived from the working tree so consecutive passes accumulate against
 * one budget without the caller reusing anything. It deliberately excludes the diff: the diff changes
 * with every fix, which is the point of the loop, so keying on it would hand every pass a new budget.
 */
export function deriveRunId(cwd: string, head: string): string {
  const digest = createHash("sha256").update(resolve(cwd)).update("\n").update(head).digest("hex");
  return `${DERIVED_RUN_ID_PREFIX}${digest.slice(0, 32)}`;
}

export function freshRunState(runId: string, now: number): RunState {
  return { schema_version: 2, run_id: runId, created_at: now, updated_at: now, passes: [] };
}

/**
 * A derived identifier stays stable while the commit does, so an abandoned run would otherwise charge
 * its spent passes to the next piece of work on the same tree. Age is measured from the last recorded
 * pass, so a long but active run keeps its budget, and a clock that moved backwards expires nothing.
 */
export function isRunStateExpired(state: RunState, now: number): boolean {
  return now - state.updated_at > RUN_STATE_MAX_AGE_MS;
}

function isRunPass(value: unknown): value is RunPass {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.pass) &&
    (value.pass as number) >= 1 &&
    (value.tree_digest === null || typeof value.tree_digest === "string")
  );
}

export async function readRunState(runId: string, now: number = Date.now()): Promise<RunState> {
  const path = runStatePath(runId);
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return freshRunState(runId, now);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RunnerError("pass_budget", `run state file is not valid JSON: ${path}`);
  }
  if (
    !isRecord(parsed) ||
    parsed.schema_version !== 2 ||
    parsed.run_id !== runId ||
    !Number.isSafeInteger(parsed.created_at) ||
    !Number.isSafeInteger(parsed.updated_at) ||
    !Array.isArray(parsed.passes) ||
    !parsed.passes.every(isRunPass)
  ) {
    throw new RunnerError("pass_budget", `run state file is unusable: ${path}`);
  }
  return parsed as unknown as RunState;
}

export function assertPassAllowed(state: RunState, pass: number): void {
  if (state.passes.length >= MAX_PASS) {
    throw new RunnerError(
      "pass_budget",
      `run ${state.run_id} already completed the maximum of ${MAX_PASS} reviewer passes`,
    );
  }
  const expected = state.passes.length + 1;
  if (pass !== expected) {
    throw new RunnerError(
      "pass_budget",
      `run ${state.run_id} expects pass ${expected}, received pass ${pass}`,
    );
  }
}

export async function recordCompletedPass(
  state: RunState,
  pass: number,
  treeDigest: string | null = null,
  now: number = Date.now(),
): Promise<void> {
  const path = runStatePath(state.run_id);
  const next: RunState = {
    ...state,
    updated_at: now,
    passes: [...state.passes, { pass, tree_digest: treeDigest }],
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
  if (!isRecord(value)) throw new RunnerError("invalid_output", "review result must be an object");
  if (value.schema_version !== 2) {
    throw new RunnerError("invalid_output", "schema_version must be 2");
  }
  if (value.status !== "REVIEWED" && value.status !== "BLOCKED") {
    throw new RunnerError("invalid_output", "status must be REVIEWED or BLOCKED");
  }
  if (!isRecord(value.scope)) throw new RunnerError("invalid_output", "scope must be an object");
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
    if (!isRecord(finding)) throw new RunnerError("invalid_output", `${path} must be an object`);
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
    if (!new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).has(String(finding.severity))) {
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

/**
 * The reviewer is told neither its ordinal pass nor the budget. Either one is a reason to hold a
 * finding back near the end or to pad a pass that would otherwise look empty, and the reviewer needs
 * neither to do the work: the ledger in the context packet already carries what earlier passes found.
 * The pass number stays in the envelope, where it is audit data rather than reviewer context.
 */
export function buildReviewerPrompt(contract: string, context: string): string {
  return `You are the independent Claude reviewer for this change set.

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

interface ConsumedStream {
  text: string;
  truncated: boolean;
}

function consumeStream(stream: ReadableStream<Uint8Array>, maximumLength: number) {
  const reader = stream.getReader();
  const promise = (async (): Promise<ConsumedStream> => {
    const decoder = new TextDecoder();
    let output = "";
    let truncated = false;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        const decoded = decoder.decode(chunk.value, { stream: true });
        if (output.length + decoded.length > maximumLength) truncated = true;
        output = tail(output + decoded, maximumLength);
      }
      const finalChunk = decoder.decode();
      if (output.length + finalChunk.length > maximumLength) truncated = true;
      return { text: tail(output + finalChunk, maximumLength), truncated };
    } finally {
      reader.releaseLock();
    }
  })();
  return { promise, cancel: () => reader.cancel().catch(() => undefined) };
}

export async function readStreamTail(
  stream: ReadableStream<Uint8Array>,
  maximumLength = DIAGNOSTIC_LIMIT,
): Promise<string> {
  return (await consumeStream(stream, maximumLength).promise).text;
}

export function classifyClaudeFailure(output: string): RunnerErrorKind {
  if (
    /Failed to authenticate|OAuth access token has expired|re-authenticate|401 Unauthorized|invalid[_ ]api[_ ]key|not logged in|authentication required/i.test(
      output,
    )
  ) {
    return "authentication_required";
  }
  if (
    /model.*(?:not found|unavailable|unsupported|does not exist|not enabled)|do not have access.*model|model access denied/i.test(
      output,
    )
  ) {
    return "model_unavailable";
  }
  return "claude_failed";
}

export function extractClaudeDiagnostic(output: string): string {
  try {
    const envelope = JSON.parse(output);
    if (
      isRecord(envelope) &&
      typeof envelope.result === "string" &&
      envelope.result.trim().length > 0
    ) {
      return envelope.result.trim();
    }
    if (
      isRecord(envelope) &&
      Array.isArray(envelope.errors) &&
      envelope.errors.every((item) => typeof item === "string")
    ) {
      const errors = envelope.errors.map((item) => item.trim()).filter((item) => item.length > 0);
      if (errors.length > 0) return errors.join("; ");
    }
    if (isRecord(envelope)) {
      return "Claude Code returned an error envelope without a public diagnostic";
    }
  } catch {
    // Keep the raw diagnostic when Claude did not emit its JSON result envelope.
  }
  return output;
}

export function selectClaudeDiagnostic(stdout: string, stderr: string): string {
  const normalizedStdout = stdout.trim();
  if (normalizedStdout.length > 0) {
    try {
      const envelope = JSON.parse(normalizedStdout);
      if (
        isRecord(envelope) &&
        ((typeof envelope.result === "string" && envelope.result.trim().length > 0) ||
          (Array.isArray(envelope.errors) &&
            envelope.errors.every((item) => typeof item === "string") &&
            envelope.errors.some((item) => item.trim().length > 0)))
      ) {
        return extractClaudeDiagnostic(normalizedStdout);
      }
      if (stderr.trim().length === 0) {
        return "Claude Code returned an error envelope without a public diagnostic";
      }
    } catch {
      // Plain-text stdout is less authoritative than a separate CLI diagnostic on stderr.
    }
  }
  return stderr.trim() || normalizedStdout;
}

function isInsideRepository(repositoryRoot: string, candidate: string): boolean {
  const repositoryRelative = relative(repositoryRoot, candidate);
  return (
    repositoryRelative === "" ||
    (repositoryRelative !== ".." &&
      !repositoryRelative.startsWith(`..${sep}`) &&
      !isAbsolute(repositoryRelative))
  );
}

/**
 * Read-only git inspection for the run identifier and the working-tree digest. A repository-local git
 * would be the reviewed change set executing itself, so it is refused the same way Claude Code is.
 * Every failure degrades to `null`: the digest is reporting, and losing it must not fail a review.
 */
function gitOutput(repositoryRoot: string, args: string[]): string | null {
  const located = Bun.which("git");
  if (located === null) return null;
  const executable = resolve(located);
  if (isInsideRepository(repositoryRoot, executable)) return null;
  try {
    const result = Bun.spawnSync([executable, ...args], {
      cwd: repositoryRoot,
      stdout: "pipe",
      stderr: "ignore",
      timeout: GIT_COMMAND_TIMEOUT_MS,
      killSignal: "SIGKILL",
    });
    if (result.exitedDueToTimeout || result.exitCode !== 0) return null;
    return result.stdout.toString();
  } catch {
    return null;
  }
}

interface TreeSnapshot {
  head: string | null;
  digest: string | null;
  limitation: string | null;
}

/**
 * The digest covers status entries and tracked-content changes. Untracked file contents are not
 * covered, because reaching them would need an index write and this wrapper never mutates the
 * repository, so the envelope states what the digest actually spans.
 */
function readTreeSnapshot(repositoryRoot: string): TreeSnapshot {
  const head = gitOutput(repositoryRoot, ["rev-parse", "HEAD"])?.trim() ?? null;
  const status = gitOutput(repositoryRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const diff = gitOutput(repositoryRoot, head === null ? ["diff"] : ["diff", "HEAD"]);
  if (status === null || diff === null) {
    return {
      head,
      digest: null,
      limitation: `could not digest the working tree with git at ${repositoryRoot}`,
    };
  }
  return {
    head,
    digest: createHash("sha256").update(status).update("\n").update(diff).digest("hex"),
    limitation: null,
  };
}

function resolveClaudeExecutable(repositoryRoot: string): string {
  const exactLocated = Bun.which(process.platform === "win32" ? "claude.exe" : "claude");
  const genericLocated = Bun.which("claude");
  const candidates: string[] = [];
  if (exactLocated !== null) candidates.push(exactLocated);

  if (process.platform === "win32") {
    if (genericLocated !== null) {
      candidates.push(
        join(
          dirname(genericLocated),
          "node_modules",
          "@anthropic-ai",
          "claude-code",
          "bin",
          "claude.exe",
        ),
      );
      if (extname(genericLocated).toLowerCase() === ".exe") candidates.push(genericLocated);
    }
    const appData = process.env.APPDATA;
    if (appData !== undefined && isAbsolute(appData)) {
      candidates.push(
        join(appData, "npm", "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe"),
      );
    }
    const userProfile = process.env.USERPROFILE;
    if (userProfile !== undefined && isAbsolute(userProfile)) {
      candidates.push(join(userProfile, ".local", "bin", "claude.exe"));
    }
  } else if (genericLocated !== null) {
    candidates.push(genericLocated);
  }

  for (const rawCandidate of [...new Set(candidates)]) {
    const candidate = resolve(rawCandidate);
    if (!existsSync(candidate)) continue;
    if (isInsideRepository(repositoryRoot, candidate)) {
      throw new RunnerError(
        "claude_unavailable",
        `refusing repository-local Claude executable: ${candidate}`,
      );
    }
    if (process.platform === "win32" && extname(candidate).toLowerCase() !== ".exe") continue;
    return candidate;
  }
  throw new RunnerError(
    "claude_unavailable",
    process.platform === "win32"
      ? "could not find a direct Claude Code executable; shell wrappers are intentionally rejected"
      : "could not find Claude Code executable on PATH",
  );
}

function verifyClaudeCli(claudeExecutable: string, timeoutMs: number): string {
  let result: ReturnType<typeof Bun.spawnSync>;
  try {
    result = Bun.spawnSync([claudeExecutable, "--version"], {
      stdout: "pipe",
      stderr: "pipe",
      env: buildClaudeEnvironment(),
      timeout: Math.max(1, Math.floor(Math.min(timeoutMs, PREFLIGHT_TIMEOUT_MS))),
      killSignal: "SIGKILL",
    });
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new RunnerError(
      "claude_unavailable",
      `could not launch Claude Code executable: ${claudeExecutable}${detail}`,
    );
  }
  if (result.exitedDueToTimeout) {
    throw new RunnerError("timeout", "Claude Code CLI version preflight timed out");
  }
  if (result.signalCode !== undefined && result.signalCode !== null) {
    throw new RunnerError(
      "claude_unavailable",
      `Claude Code CLI version preflight terminated by ${result.signalCode}`,
    );
  }
  const version = result.stdout?.toString().trim() ?? "";
  if (result.exitCode !== 0 || !/^\d+\.\d+\.\d+(?:-[^\s]+)? \(Claude Code\)$/.test(version)) {
    throw new RunnerError(
      "claude_unavailable",
      "the claude command did not identify itself as Claude Code",
    );
  }
  return version;
}

function spawnClaudeProcess(options: ParsedArguments, executable: string, arguments_: string[]) {
  return Bun.spawn([executable, ...arguments_], {
    cwd: options.cwd,
    detached: process.platform !== "win32",
    env: buildClaudeEnvironment(),
    stdin: "pipe" as const,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
  });
}

type ClaudeProcess = ReturnType<typeof spawnClaudeProcess>;

function terminateProcessTree(child: ClaudeProcess, force: boolean): void {
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
            timeout: TREE_KILL_TIMEOUT_MS,
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
    // A bounded termination deadline below prevents an endless wait.
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
    if (error instanceof RunnerError) throw error;
    throw new RunnerError("usage", `cannot read ${label}: ${path}`);
  }
}

export function reportedModels(envelope: Record<string, unknown>): string[] {
  const models = new Set<string>();
  if (isRecord(envelope.modelUsage)) {
    for (const model of Object.keys(envelope.modelUsage)) models.add(model);
  }
  return [...models];
}

interface RunContext {
  runId: string;
  runIdSource: "derived" | "explicit";
  discardedExpiredState: boolean;
  tree: TreeSnapshot;
  treeChangedSincePreviousPass: boolean | null;
}

function invocationMetadata(
  options: ParsedArguments,
  executable: string,
  cliVersion: string,
  run: RunContext,
): Record<string, unknown> {
  return {
    runtime: "claude-code-cli",
    executable_path: executable,
    cli_version: cliVersion,
    requested_model: MODEL,
    requested_effort: EFFORT,
    profile_verification: "plain-text-profile-probe-plus-json-model-usage",
    permission_mode: "plan",
    allowed_tools: TOOLS.split(","),
    safe_mode: true,
    session_persistence: false,
    no_test_policy: "claude-tool-surface-no-shell",
    run_id: run.runId,
    run_id_source: run.runIdSource,
    pass: options.pass,
    max_passes_in_run: MAX_PASS,
    discarded_expired_run_state: run.discardedExpiredState,
    tree_digest: run.tree.digest,
    tree_digest_covers: "git status entries and tracked-content diff",
    tree_digest_limitation: run.tree.limitation,
    tree_changed_since_previous_pass: run.treeChangedSincePreviousPass,
    cwd: options.cwd,
  };
}

export function verifyReportedModels(models: string[]): void {
  if (models.length === 0) {
    throw new RunnerError(
      "profile_unavailable",
      "Claude result did not report the runtime model in modelUsage",
    );
  }
  const unexpected = models.filter(
    (model) =>
      !/^(?:(?:anthropic|aws|bedrock|vertex)[._:/-])?(?:claude[._:/-])?fable(?:[._:/-]5)?(?:[._:/-][a-z0-9]+)*$/i.test(
        model.replace(/\[1m\]$/i, ""),
      ),
  );
  if (unexpected.length > 0) {
    throw new RunnerError(
      "model_unavailable",
      `Claude reported a non-Fable runtime model: ${unexpected.join(", ")}`,
    );
  }
}

export function parseClaudeReviewEnvelope(envelope: unknown): {
  review: ReviewResult;
  runtimeModels: string[];
} {
  if (!isRecord(envelope)) {
    throw new RunnerError("invalid_output", "Claude output envelope must be an object");
  }
  if (envelope.type !== "result" || envelope.subtype !== "success" || envelope.is_error !== false) {
    const detail = tail(extractClaudeDiagnostic(JSON.stringify(envelope)), 3000);
    throw new RunnerError(classifyClaudeFailure(detail), `Claude returned an error: ${detail}`);
  }
  if (!Array.isArray(envelope.permission_denials)) {
    throw new RunnerError("invalid_output", "Claude output omitted permission_denials");
  }
  if (envelope.permission_denials.length > 0) {
    throw new RunnerError(
      "invalid_output",
      "Claude review had denied tool calls and cannot establish complete coverage",
    );
  }
  if (typeof envelope.terminal_reason === "string" && envelope.terminal_reason !== "completed") {
    throw new RunnerError(
      "invalid_output",
      `Claude review ended with terminal_reason=${envelope.terminal_reason}`,
    );
  }
  if (!("structured_output" in envelope)) {
    throw new RunnerError("invalid_output", "Claude output omitted structured_output");
  }
  const review = validateReviewResult(envelope.structured_output);
  const runtimeModels = reportedModels(envelope);
  verifyReportedModels(runtimeModels);
  return { review, runtimeModels };
}

async function runReview(options: ParsedArguments): Promise<Record<string, unknown>> {
  const startedAt = performance.now();
  const context = await readRequiredFile(options.contextFile, "context file");
  const contract = await readRequiredFile(options.contractFile, "reviewer contract");
  const schemaSource = await readRequiredFile(options.schemaFile, "output schema");
  let schema: string;
  try {
    schema = JSON.stringify(JSON.parse(schemaSource));
  } catch {
    throw new RunnerError("usage", `output schema is not valid JSON: ${options.schemaFile}`);
  }

  const prompt = buildReviewerPrompt(contract, context);
  if (new TextEncoder().encode(prompt).byteLength > MAX_PROMPT_BYTES) {
    throw new RunnerError(
      "usage",
      `combined reviewer prompt exceeds the ${MAX_PROMPT_BYTES}-byte safety limit`,
    );
  }

  const tree = readTreeSnapshot(options.cwd);
  const runIdSource: "derived" | "explicit" = options.runId.length > 0 ? "explicit" : "derived";
  const runId =
    options.runId.length > 0 ? options.runId : deriveRunId(options.cwd, tree.head ?? "no-head");
  const now = Date.now();
  const storedState = await readRunState(runId, now);
  const discardedExpiredState = isRunStateExpired(storedState, now);
  const runState = discardedExpiredState ? freshRunState(runId, now) : storedState;
  assertPassAllowed(runState, options.pass);
  const previousDigest = runState.passes.at(-1)?.tree_digest ?? null;
  const treeChangedSincePreviousPass =
    previousDigest === null || tree.digest === null ? null : tree.digest !== previousDigest;
  const elapsedBeforePreflight = performance.now() - startedAt;
  if (elapsedBeforePreflight >= options.timeoutMs) {
    throw new RunnerError("timeout", `Claude review exceeded ${options.timeoutMs} ms`);
  }
  const claudeExecutable = resolveClaudeExecutable(options.cwd);
  const claudeVersion = verifyClaudeCli(
    claudeExecutable,
    options.timeoutMs - elapsedBeforePreflight,
  );
  const invocation = invocationMetadata(options, claudeExecutable, claudeVersion, {
    runId,
    runIdSource,
    discardedExpiredState,
    tree,
    treeChangedSincePreviousPass,
  });

  let child: ClaudeProcess | undefined;
  let timedOut = false;
  let profileTimedOut = false;
  let cancelledSignal: "SIGINT" | "SIGTERM" | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let profileTimeout: ReturnType<typeof setTimeout> | undefined;
  let forceKillTimeout: ReturnType<typeof setTimeout> | undefined;
  let terminationDeadline: ReturnType<typeof setTimeout> | undefined;
  let terminationDeadlineExpired = false;
  let stdoutConsumer: ReturnType<typeof consumeStream> | undefined;
  let stderrConsumer: ReturnType<typeof consumeStream> | undefined;
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
          timedOut || profileTimedOut ? "timeout" : "cancelled",
          "Claude process tree did not terminate after forced cancellation",
        ),
      );
    }, TERMINATION_DEADLINE_MS);
    terminateProcessTree(child, false);
  };

  const cancelWith = (signal: "SIGINT" | "SIGTERM") => {
    if (cancelledSignal !== undefined) {
      if (child !== undefined) terminateProcessTree(child, true);
      return;
    }
    cancelledSignal = signal;
    beginTermination();
  };
  const onSigint = () => cancelWith("SIGINT");
  const onSigterm = () => cancelWith("SIGTERM");
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);

  try {
    const remainingTimeoutMs = Math.max(1, options.timeoutMs - (performance.now() - startedAt));
    timeout = setTimeout(() => {
      timedOut = true;
      beginTermination();
    }, remainingTimeoutMs);

    let profileSubprocess: ReturnType<typeof spawnClaudeProcess>;
    try {
      profileSubprocess = spawnClaudeProcess(
        options,
        claudeExecutable,
        buildClaudeProfileProbeArguments(),
      );
      child = profileSubprocess;
      if (cancelledSignal !== undefined || timedOut) beginTermination();
    } catch (error) {
      const detail = error instanceof Error ? `: ${error.message}` : "";
      throw new RunnerError(
        "claude_unavailable",
        `could not run the Claude profile probe${detail}`,
      );
    }

    stdoutConsumer = consumeStream(profileSubprocess.stdout, DIAGNOSTIC_LIMIT);
    stderrConsumer = consumeStream(profileSubprocess.stderr, DIAGNOSTIC_LIMIT);
    profileSubprocess.stdin.end();
    profileTimeout = setTimeout(() => {
      profileTimedOut = true;
      beginTermination();
    }, PROFILE_PROBE_TIMEOUT_MS);

    const profileLifecycle = Promise.all([
      profileSubprocess.exited,
      stdoutConsumer.promise,
      stderrConsumer.promise,
    ]);
    const [profileExitCode, profileStdoutResult, profileStderrResult] = await Promise.race([
      profileLifecycle,
      terminationFailure,
    ]);
    if (profileTimeout !== undefined) clearTimeout(profileTimeout);
    profileTimeout = undefined;
    child = undefined;

    if (cancelledSignal !== undefined) {
      throw new RunnerError("cancelled", `Claude review cancelled by ${cancelledSignal}`);
    }
    if (timedOut) {
      throw new RunnerError("timeout", `Claude review exceeded ${options.timeoutMs} ms`);
    }
    if (profileTimedOut) {
      throw new RunnerError("timeout", "Claude Fable/xhigh profile probe timed out");
    }
    if (profileExitCode !== 0) {
      const fullDiagnostic = selectClaudeDiagnostic(
        profileStdoutResult.text,
        profileStderrResult.text,
      );
      const diagnostic = tail(fullDiagnostic, 3000);
      throw new RunnerError(
        classifyClaudeFailure(fullDiagnostic),
        diagnostic.length > 0
          ? `Claude profile probe failed: ${diagnostic}`
          : "Claude profile probe failed",
      );
    }
    if (profileStdoutResult.truncated || profileStderrResult.truncated) {
      throw new RunnerError(
        "profile_unavailable",
        "Claude profile probe output exceeded the local safety limit",
      );
    }
    const profileStderr = profileStderrResult.text.trim();
    if (profileStderr.length > 0) {
      throw new RunnerError(
        "profile_unavailable",
        `Claude profile probe emitted a warning or diagnostic: ${tail(profileStderr, 3000)}`,
      );
    }
    if (!profileStdoutResult.text.includes(PROFILE_PROBE_RESPONSE)) {
      throw new RunnerError(
        "profile_unavailable",
        "Claude profile probe did not confirm the requested Fable/xhigh session",
      );
    }
    stdoutConsumer = undefined;
    stderrConsumer = undefined;

    const claudeArguments = buildClaudeArguments(schema);
    let subprocess: ReturnType<typeof spawnClaudeProcess>;
    try {
      subprocess = spawnClaudeProcess(options, claudeExecutable, claudeArguments);
      child = subprocess;
      if (cancelledSignal !== undefined || timedOut) beginTermination();
    } catch (error) {
      const detail = error instanceof Error ? `: ${error.message}` : "";
      throw new RunnerError(
        "claude_unavailable",
        `could not launch Claude Code executable: ${claudeExecutable}${detail}`,
      );
    }

    stdoutConsumer = consumeStream(subprocess.stdout, MAX_STDOUT_LENGTH);
    stderrConsumer = consumeStream(subprocess.stderr, DIAGNOSTIC_LIMIT);
    subprocess.stdin.write(prompt);
    subprocess.stdin.end();

    const lifecycle = Promise.all([
      subprocess.exited,
      stdoutConsumer.promise,
      stderrConsumer.promise,
    ]);
    const [exitCode, stdoutResult, stderrResult] = await Promise.race([
      lifecycle,
      terminationFailure,
    ]);

    if (cancelledSignal !== undefined) {
      throw new RunnerError("cancelled", `Claude review cancelled by ${cancelledSignal}`);
    }
    if (timedOut) {
      throw new RunnerError("timeout", `Claude review exceeded ${options.timeoutMs} ms`);
    }
    if (exitCode !== 0) {
      const fullDiagnostic = selectClaudeDiagnostic(stdoutResult.text, stderrResult.text);
      const diagnostic = tail(fullDiagnostic, 3000);
      throw new RunnerError(
        classifyClaudeFailure(fullDiagnostic),
        diagnostic.length > 0
          ? `Claude exited with code ${exitCode}: ${diagnostic}`
          : `Claude exited with code ${exitCode}`,
      );
    }
    if (stdoutResult.truncated) {
      throw new RunnerError("invalid_output", "Claude JSON output exceeded the local safety limit");
    }

    let envelope: unknown;
    try {
      envelope = JSON.parse(stdoutResult.text);
    } catch {
      throw new RunnerError("invalid_output", "Claude output is not one valid JSON envelope");
    }
    const { review, runtimeModels } = parseClaudeReviewEnvelope(envelope);
    const verdict = deriveVerdict(review);
    await recordCompletedPass(runState, options.pass, tree.digest, Date.now());

    return {
      schema_version: 2,
      runner_status: "ok",
      completed_reviewer_passes: 1,
      invocation: {
        ...invocation,
        reported_models: runtimeModels,
        completed_passes_in_run: runState.passes.length + 1,
        elapsed_ms: Math.round(performance.now() - startedAt),
      },
      verdict: {
        ...verdict,
        derived_by: "wrapper",
        blocking_rule: "DEFECT at CRITICAL, HIGH, or MEDIUM",
      },
      review,
    };
  } catch (error) {
    if (error instanceof RunnerError && error.invocation === undefined) {
      throw new RunnerError(error.kind, error.message, {
        ...invocation,
        elapsed_ms: Math.round(performance.now() - startedAt),
      });
    }
    throw error;
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    if (profileTimeout !== undefined) clearTimeout(profileTimeout);
    if (forceKillTimeout !== undefined) {
      clearTimeout(forceKillTimeout);
      if (child !== undefined) terminateProcessTree(child, true);
    }
    if (terminationDeadline !== undefined) clearTimeout(terminationDeadline);
    if (terminationDeadlineExpired) {
      await Promise.allSettled([
        stdoutConsumer?.cancel() ?? Promise.resolve(),
        stderrConsumer?.cancel() ?? Promise.resolve(),
      ]);
      child?.unref();
    }
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
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
    const kind = error instanceof RunnerError ? error.kind : "claude_failed";
    const message = error instanceof Error ? error.message : String(error);
    const invocation = error instanceof RunnerError ? error.invocation : undefined;
    process.stdout.write(
      `${JSON.stringify(
        {
          schema_version: 2,
          runner_status: "error",
          completed_reviewer_passes: 0,
          ...(invocation === undefined ? {} : { invocation }),
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
