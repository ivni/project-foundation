#!/usr/bin/env bun
import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  assess,
  beginWatchdog,
  policy,
  report,
  shortText,
  validateWatchdog,
  type Watchdog,
} from "./watchdog.ts";

// The host owns delegation and authenticated issue reads. This helper owns serialized local
// transitions and Git/evidence guards; it cannot grant permissions or perform forge writes.
type ObjectValue = Record<string, unknown>;
export interface Identity {
  feature_id: string;
  repository: string;
  issue_url: string;
  base_commit: string;
  checkout: string;
}
export interface Stage {
  id: string;
  done: boolean;
  contract_sha256: string;
  result?: { commit_sha: string; ref: string };
}
export interface Issue {
  repository: string;
  issue_url: string;
  body: string;
  open: boolean;
  stages: Stage[];
}
export interface State extends Identity {
  schema: 1;
  run_id: string;
  feature_state_path: string;
  status:
    | "ready"
    | "dispatching"
    | "running"
    | "awaiting-input"
    | "interrupted"
    | "cancelled"
    | "implemented";
  attempt: number;
  stage_id?: string;
  contract_sha256?: string;
  starting_head?: string;
  recovery_commit?: string;
  active?: { attempt_id: string; handle: string | null };
  last_result?: string;
  diagnosis?: string;
  question?: string;
  answer?: string;
  stop_requested?: "cancelled" | "interrupted" | "watchdog";
  review_ledger?: string;
  watchdog?: Watchdog;
}
export interface Request {
  action:
    | "start"
    | "dispatch"
    | "bind"
    | "settle"
    | "stop"
    | "resume"
    | "review-cycle"
    | "report"
    | "observe"
    | "intervene";
  cwd: string;
  state_path: string;
  input: ObjectValue;
}
function object(value: unknown): ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected JSON object");
  return value as ObjectValue;
}
function string(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Expected nonempty string");
  return value;
}
function sha(value: unknown, length = 40): string {
  const text = string(value);
  if (!new RegExp(`^[a-f0-9]{${length}}$`).test(text)) throw new Error("Invalid SHA");
  return text;
}
function url(value: unknown, evidenceReference = false): string {
  const text = string(value);
  const parsed = new URL(text);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    (parsed.hash && !evidenceReference)
  )
    throw new Error("Expected credential-free canonical HTTP(S) URL");
  return text;
}
function id(value: unknown): string {
  const text = string(value);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/.test(text)) throw new Error("Invalid ID");
  return text;
}
async function read(path: string): Promise<ObjectValue> {
  return object(JSON.parse(await readFile(path, "utf8")));
}
export async function safePath(cwd: string, name: unknown): Promise<string> {
  const text = string(name);
  if (isAbsolute(text) || text.split(/[\\/]/).includes(".."))
    throw new Error("Path must stay inside checkout");
  const path = resolve(cwd, text);
  if (!relative(cwd, path) || relative(cwd, path).startsWith(`..${sep}`))
    throw new Error("Path escapes checkout");
  // Validate every existing ancestor, including symlinks to another checkout.
  let ancestor = path;
  while (true) {
    try {
      const actual = await realpath(ancestor);
      const rel = relative(cwd, actual);
      if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
        throw new Error("Escaping symlink");
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      ancestor = dirname(ancestor);
    }
  }
  return path;
}
async function atomic(path: string, value: unknown): Promise<void> {
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}
async function verifyEvidence(cwd: string, value: unknown): Promise<string> {
  const ref = shortText(value);
  const info = await stat(await safePath(cwd, ref));
  if (!info.isFile() || info.size === 0) throw new Error("Expected nonempty evidence file");
  return ref;
}
function git(cwd: string, ...args: string[]): string {
  const result = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(`Git verification failed: ${args[0]}`);
  return result.stdout.toString().trim();
}
function identity(record: ObjectValue, checkout: string): Identity {
  return {
    feature_id: id(record.feature_id),
    repository: url(record.repository),
    issue_url: url(record.issue_url),
    base_commit: sha(record.base_commit),
    checkout,
  };
}
function sameIdentity(state: Identity, value: ObjectValue): void {
  for (const key of ["feature_id", "repository", "issue_url", "base_commit", "checkout"] as const) {
    if (value[key] !== state[key]) throw new Error(`Identity mismatch: ${key}`);
  }
}
function parseIssue(value: unknown, state: Identity): Issue {
  const data = object(value);
  if (data.repository !== state.repository || data.issue_url !== state.issue_url)
    throw new Error("Issue identity mismatch");
  const body = string(data.body);
  if (!body.includes(`<!-- feature:${state.feature_id} -->`) || data.open !== true)
    throw new Error("Issue marker missing or issue closed");
  if (!Array.isArray(data.stages) || !data.stages.length) throw new Error("Missing ordered stages");
  const seen = new Set<string>();
  const stages = data.stages.map((raw): Stage => {
    const stage = object(raw);
    const stageId = id(stage.id);
    if (seen.has(stageId) || typeof stage.done !== "boolean")
      throw new Error("Invalid ordered stages");
    seen.add(stageId);
    const parsed: Stage = {
      id: stageId,
      done: stage.done,
      contract_sha256: sha(stage.contract_sha256, 64),
    };
    if (stage.result) {
      const result = object(stage.result);
      parsed.result = { commit_sha: sha(result.commit_sha), ref: string(result.ref) };
    }
    return parsed;
  });
  return { repository: state.repository, issue_url: state.issue_url, body, open: true, stages };
}
function present(cwd: string, commit: string, base: string): void {
  git(cwd, "cat-file", "-e", `${commit}^{commit}`);
  git(cwd, "merge-base", "--is-ancestor", base, commit);
  git(cwd, "merge-base", "--is-ancestor", commit, "HEAD");
}
function predecessors(cwd: string, issue: Issue, stageId: string | undefined, base: string): void {
  for (const stage of issue.stages) {
    if (stage.id === stageId) return;
    if (!stage.done || !stage.result) throw new Error(`Predecessor evidence missing: ${stage.id}`);
    present(cwd, stage.result.commit_sha, base);
  }
  if (stageId) throw new Error("Selected stage absent from issue");
}
function terminal(state: State, input: ObjectValue): void {
  const observation = object(input.terminal);
  if (
    !state.active ||
    observation.attempt_id !== state.active.attempt_id ||
    observation.handle !== state.active.handle ||
    observation.stopped !== true
  )
    throw new Error("Active owner must be observed terminal before replacement");
}
function restore(value: ObjectValue, cwd: string): State {
  if (
    value.schema !== 1 ||
    ![
      "ready",
      "dispatching",
      "running",
      "awaiting-input",
      "interrupted",
      "cancelled",
      "implemented",
    ].includes(String(value.status))
  )
    throw new Error("Invalid orchestrator state");
  sameIdentity(identity(value, cwd), value);
  id(value.run_id);
  string(value.feature_state_path);
  if (!Number.isSafeInteger(value.attempt) || Number(value.attempt) < 0)
    throw new Error("Invalid attempt");
  if (value.stage_id !== undefined) id(value.stage_id);
  if (value.contract_sha256 !== undefined) sha(value.contract_sha256, 64);
  if (value.starting_head !== undefined) sha(value.starting_head);
  if (value.recovery_commit !== undefined) sha(value.recovery_commit);
  if (value.active) {
    const active = object(value.active);
    id(active.attempt_id);
    if (active.handle !== null) string(active.handle);
  }
  if (["dispatching", "running"].includes(String(value.status)) && !value.active)
    throw new Error("Active owner missing");
  if (value.watchdog) {
    const watch = validateWatchdog(value.watchdog);
    if (value.active && watch.attempt_id !== object(value.active).attempt_id)
      throw new Error("Watchdog attempt mismatch");
  }
  return value as unknown as State;
}
async function completion(
  cwd: string,
  state: State,
  result: ObjectValue,
  issue: Issue,
  record: ObjectValue,
): Promise<void> {
  const commit = sha(result.commit_sha);
  present(cwd, commit, state.base_commit);
  if (state.recovery_commit) {
    if (commit !== state.recovery_commit) throw new Error("Recovery must reuse its pinned commit");
  } else {
    if (commit === state.starting_head) throw new Error("A new stage needs a new commit");
    git(cwd, "merge-base", "--is-ancestor", string(state.starting_head), commit);
  }
  const stage = issue.stages.find((s) => s.id === state.stage_id);
  if (
    !stage?.done ||
    stage.contract_sha256 !== state.contract_sha256 ||
    stage.result?.commit_sha !== commit ||
    stage.result.ref !== result.issue_result_ref
  )
    throw new Error("Current issue completion/readback missing or contract changed");
  if (
    commit === state.base_commit ||
    issue.stages.some((s) => s.id !== stage.id && s.result?.commit_sha === commit)
  )
    throw new Error("Commit is not unique to stage");
  if (
    !["ready", "implemented"].includes(String(record.status)) ||
    record.stage_id ||
    record.checkpoint
  )
    throw new Error("Worker checkpoint not cleared after publication");
  const tree = git(cwd, "rev-parse", `${commit}^{tree}`);
  const checks = await read(await safePath(cwd, result.checks_ref));
  const review = await read(await safePath(cwd, result.review_ref));
  if (
    checks.tree !== tree ||
    checks.passed !== true ||
    !Array.isArray(checks.commands) ||
    !checks.commands.length
  )
    throw new Error("Checks do not apply to committed tree");
  if (
    review.tree !== tree ||
    review.verdict !== "CLEAN" ||
    review.run_id !== result.review_run_id ||
    !Number.isInteger(review.passes) ||
    Number(review.passes) < 1 ||
    Number(review.passes) > 10
  )
    throw new Error("Independent review does not permit completion");
  for (const ref of [checks.log, review.ledger]) await readFile(await safePath(cwd, ref), "utf8");
  const ledger = await ownedLedger(cwd, state, review.ledger);
  if (
    !Array.isArray(ledger.runs) ||
    !ledger.runs.some((raw) => object(raw).run_id === review.run_id)
  )
    throw new Error("Review run absent from task ledger");
  if (!Array.isArray(ledger.findings)) throw new Error("Missing finding ledger");
  for (const raw of ledger.findings) {
    const finding = object(raw);
    if (finding.disposition === "deferred") {
      const deferral = object(finding.deferral);
      if (deferral.outside_blocking_areas !== true || deferral.readback_verified !== true)
        throw new Error("Deferral is not verified and permitted");
      string(deferral.reason);
      const ref = string(deferral.record_ref);
      if (/^https?:\/\//.test(ref)) url(ref, true);
      else {
        const saved = string(await readFile(await safePath(cwd, ref), "utf8"));
        const committed = git(cwd, "show", `${commit}:${ref}`);
        const entry = string(deferral.entry).replaceAll("\r\n", "\n").trim();
        if (
          !entry.includes(string(finding.fingerprint)) ||
          !committed.replaceAll("\r\n", "\n").includes(entry) ||
          !saved.replaceAll("\r\n", "\n").includes(entry)
        )
          throw new Error("Deferred entry is not present in the stage commit and current register");
      }
    } else if (
      finding.blocking === true &&
      !["fixed", "rejected-with-evidence"].includes(String(finding.disposition))
    )
      throw new Error("Unresolved blocking finding");
  }
}
async function ownedLedger(cwd: string, state: State, ref: unknown): Promise<ObjectValue> {
  const name = string(ref);
  if (!name.startsWith(".agents/work/features/"))
    throw new Error("Review ledger must be workflow metadata");
  const path = await safePath(cwd, name);
  const directory = await realpath(resolve(cwd, ".agents/work/features"));
  const actual = await realpath(path);
  const rel = relative(directory, actual);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
    throw new Error("Review ledger escapes workflow metadata");
  const ledger = await read(path);
  if (ledger.feature_id !== state.feature_id) throw new Error("Review ledger feature mismatch");
  return ledger;
}
export async function operate(request: Request): Promise<State> {
  const cwd = await realpath(request.cwd);
  if ((await realpath(git(cwd, "rev-parse", "--show-toplevel"))) !== cwd)
    throw new Error("Use exact checkout root");
  const path = await safePath(cwd, request.state_path);
  if (
    !request.state_path.startsWith(".agents/work/features/") ||
    !request.state_path.endsWith(".orchestrator.json")
  )
    throw new Error("Use orchestrator sidecar path");
  await mkdir(dirname(path), { recursive: true });
  const lock = `${path}.lock`;
  await mkdir(lock); // Never age out another process's lock or active worker.
  try {
    const input = object(request.input);
    let state: State;
    if (request.action === "start") {
      try {
        await lstat(path);
        throw new Error("Existing orchestration must be resumed, not reset");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      const featurePath = string(input.feature_state_path);
      const record = await read(await safePath(cwd, featurePath));
      if (
        record.schema !== 1 ||
        !["ready", "in-progress", "blocked", "implemented"].includes(String(record.status))
      )
        throw new Error("Feature not executable");
      state = {
        schema: 1,
        ...identity(record, cwd),
        run_id: `feature-${randomUUID()}`,
        feature_state_path: featurePath,
        status: "ready",
        attempt: 0,
        watchdog: {
          ...beginWatchdog("not-dispatched", Date.now()),
          policy: policy(input.watchdog ?? {}),
        },
      };
      parseIssue(input.issue, state);
      present(cwd, state.base_commit, state.base_commit);
      if (request.state_path !== `.agents/work/features/${state.feature_id}.orchestrator.json`)
        throw new Error("Wrong sidecar for feature");
    } else {
      state = restore(await read(path), cwd);
      if (request.state_path !== `.agents/work/features/${state.feature_id}.orchestrator.json`)
        throw new Error("Wrong sidecar for feature");
      const record = await read(await safePath(cwd, state.feature_state_path));
      sameIdentity(state, { ...record, checkout: cwd });
      if (request.action === "dispatch") {
        if (state.active || state.status !== "ready")
          throw new Error("Cannot dispatch over active/stopped work");
        const issue = parseIssue(input.issue, state);
        const selected = record.stage_id ?? state.stage_id ?? issue.stages.find((s) => !s.done)?.id;
        const stageId = selected === undefined ? undefined : id(selected);
        predecessors(cwd, issue, stageId, state.base_commit);
        if (!stageId) state.status = "implemented";
        else {
          const stage = issue.stages.find((s) => s.id === stageId);
          if (!stage) throw new Error("Stage absent");
          if (state.stage_id && state.stage_id !== stageId)
            throw new Error("Unfinished stage cannot be skipped");
          if (state.contract_sha256 && state.contract_sha256 !== stage.contract_sha256)
            throw new Error("Stage contract changed; reconcile scope before resuming");
          state.stage_id = stageId;
          state.contract_sha256 = stage.contract_sha256;
          const previousHead = state.starting_head;
          state.starting_head = git(cwd, "rev-parse", "HEAD");
          if (state.watchdog?.replacement) {
            const recovery = object(input.recovery);
            const diagnosis = shortText(recovery.diagnosis);
            const approach = shortText(recovery.approach);
            const evidenceRef = await verifyEvidence(cwd, recovery.evidence_ref);
            const commit = recovery.commit_sha === undefined ? undefined : sha(recovery.commit_sha);
            if (commit) {
              present(cwd, commit, state.base_commit);
              if (state.recovery_commit && state.recovery_commit !== commit)
                throw new Error("Recovery commit changed");
              if (!state.recovery_commit && (!previousHead || previousHead === commit))
                throw new Error("Recovered stage commit must be new to the stopped attempt");
              if (previousHead) git(cwd, "merge-base", "--is-ancestor", previousHead, commit);
              state.recovery_commit = commit;
            }
            if (state.watchdog.recoveries.some((row) => row.approach === approach))
              throw new Error("Recovery must change the previously attempted approach");
            const recovered = {
              diagnosis,
              approach,
              evidence_ref: evidenceRef,
              ...(commit ? { commit_sha: commit } : {}),
            };
            state.watchdog.recoveries.push(recovered);
            const journal = `.agents/work/features/${state.feature_id}.${state.watchdog.attempt_id}.watchdog.jsonl`;
            await writeFile(
              await safePath(cwd, journal),
              `${JSON.stringify({ at: Date.now(), recovery_requested: recovered })}\n`,
              { flag: "a", mode: 0o600 },
            );
          }
          const checkpoint = record.checkpoint ? object(record.checkpoint) : undefined;
          const recovery =
            checkpoint?.action === "committed-awaiting-issue"
              ? sha(checkpoint.commit_sha)
              : stage.done && stage.result
                ? stage.result.commit_sha
                : state.recovery_commit;
          if (recovery) {
            if (state.recovery_commit && state.recovery_commit !== recovery)
              throw new Error("Recovery commit changed");
            present(cwd, recovery, state.base_commit);
            state.recovery_commit = recovery;
          }
          state.attempt += 1;
          state.active = { attempt_id: randomUUID(), handle: null };
          state.watchdog = beginWatchdog(state.active.attempt_id, Date.now(), state.watchdog);
          state.status = "dispatching";
        }
      } else if (request.action === "bind") {
        if (
          state.status !== "dispatching" ||
          !state.active ||
          state.active.handle !== null ||
          state.active.attempt_id !== input.attempt_id
        )
          throw new Error("Reservation mismatch");
        state.active.handle = string(input.handle);
        state.status = "running";
      } else if (["report", "observe", "intervene"].includes(request.action)) {
        if (
          !state.active ||
          state.status !== "running" ||
          input.run_id !== state.run_id ||
          input.attempt_id !== state.active.attempt_id
        )
          throw new Error("Active watchdog owner mismatch");
        const now = Date.now();
        const watch = state.watchdog ?? beginWatchdog(state.active.attempt_id, now);
        state.watchdog = watch;
        const journal = `.agents/work/features/${state.feature_id}.${state.active.attempt_id}.watchdog.jsonl`;
        let entry: unknown;
        if (request.action === "report") {
          if (state.stop_requested) throw new Error("Worker stop already requested");
          const event = object(input.event);
          if (event.evidence_ref !== undefined) await verifyEvidence(cwd, event.evidence_ref);
          if (report(watch, event, now)) entry = { at: now, event };
        } else if (request.action === "observe") {
          if (input.resolution !== undefined) {
            const resolution = object(input.resolution);
            if (watch.operation || resolution.failure !== watch.last_failure || !watch.last_failure)
              throw new Error("Resolution must identify the current idle failure");
            await verifyEvidence(cwd, resolution.evidence_ref);
            shortText(resolution.diagnosis);
            const failure = watch.failures.find((row) => row.key === watch.last_failure);
            if (failure) failure.resolved = true;
            delete watch.last_failure;
            delete watch.nudge;
            watch.last_progress_at = now;
            entry = { at: now, resolution };
          }
          watch.assessment = assess(watch, now);
        } else {
          if (state.stop_requested) throw new Error("Worker stop already requested");
          watch.assessment = assess(watch, now);
          if (watch.assessment.action === "wait")
            throw new Error("Inspect a watchdog signal before intervention");
          const diagnosis = shortText(input.diagnosis);
          const evidenceRef = await verifyEvidence(cwd, input.evidence_ref);
          if (input.mode === "nudge") {
            if (watch.nudge) throw new Error("A corrective instruction is already pending");
            const instruction = shortText(input.instruction);
            watch.nudge = {
              at: now,
              failures: watch.failures.find((row) => row.key === watch.last_failure)?.count ?? 0,
              diagnosis,
              instruction,
            };
          } else if (input.mode === "replace") {
            if (watch.assessment.action !== "replace")
              throw new Error("Allow the corrective instruction its grace period");
            watch.replacement = { diagnosis, evidence_ref: evidenceRef };
            state.stop_requested = "watchdog";
          } else throw new Error("Invalid watchdog intervention");
          entry = { at: now, intervention: input };
          watch.assessment = assess(watch, now);
        }
        if (entry)
          await writeFile(await safePath(cwd, journal), `${JSON.stringify(entry)}\n`, {
            flag: "a",
            mode: 0o600,
          });
      } else if (request.action === "stop") {
        const reason = input.reason;
        if (reason !== "cancelled" && reason !== "interrupted")
          throw new Error("Invalid stop reason");
        state.stop_requested =
          state.stop_requested === "cancelled" || state.status === "cancelled"
            ? "cancelled"
            : reason;
        state.diagnosis = string(input.diagnosis);
        if (!state.active) state.status = state.stop_requested;
      } else if (request.action === "settle") {
        terminal(state, input);
        const resultPath = await safePath(cwd, input.result_ref);
        const result = await read(resultPath);
        if (result.schema !== 1) throw new Error("Invalid result schema");
        sameIdentity(state, result);
        if (
          result.run_id !== state.run_id ||
          result.attempt_id !== state.active?.attempt_id ||
          result.stage_id !== state.stage_id
        )
          throw new Error("Stale result");
        const outcome = string(result.outcome);
        if (
          ![
            "stage-complete",
            "retryable-error",
            "review-exhausted",
            "needs-user-input",
            "interrupted",
          ].includes(outcome)
        )
          throw new Error("Invalid outcome");
        if (state.stop_requested === "watchdog") {
          // Watchdog termination is an autonomous retry, not explicit user cancellation or success.
          state.status = "ready";
          state.diagnosis = state.watchdog?.replacement?.diagnosis ?? "Watchdog replacement";
          if (outcome === "review-exhausted") {
            await ownedLedger(cwd, state, result.review_ledger);
            state.review_ledger = string(result.review_ledger);
          }
          delete state.stop_requested;
        } else if (state.stop_requested) state.status = state.stop_requested;
        else if (outcome === "stage-complete") {
          await completion(cwd, state, result, parseIssue(input.issue, state), record);
          state.status = "ready";
          delete state.stage_id;
          delete state.contract_sha256;
          delete state.starting_head;
          delete state.recovery_commit;
          delete state.answer;
          delete state.diagnosis;
          delete state.review_ledger;
          if (state.watchdog) {
            state.watchdog = beginWatchdog(state.watchdog.attempt_id, Date.now(), {
              ...state.watchdog,
              failures: [],
              recoveries: [],
            });
            delete state.watchdog.last_failure;
          }
        } else {
          state.diagnosis = string(result.diagnosis);
          state.status =
            outcome === "needs-user-input"
              ? "awaiting-input"
              : outcome === "interrupted"
                ? "interrupted"
                : "ready";
          if (outcome === "needs-user-input") {
            state.question = string(result.question);
            string(result.sources_checked);
          }
          if (outcome === "review-exhausted") {
            await ownedLedger(cwd, state, result.review_ledger);
            state.review_ledger = string(result.review_ledger);
          }
        }
        state.last_result = string(input.result_ref);
        delete state.active;
      } else if (request.action === "resume") {
        if (state.active) throw new Error("Reconcile active owner first");
        if (state.status === "awaiting-input") {
          state.answer = string(input.answer);
          string(input.sufficiency);
          delete state.question;
        } else if (state.status === "cancelled" && input.explicit_resume !== true)
          throw new Error("Explicit cancellation requires explicit resume");
        else if (!["cancelled", "interrupted"].includes(state.status))
          throw new Error("Nothing to resume");
        state.status = "ready";
        delete state.stop_requested;
      } else if (request.action === "review-cycle") {
        if (state.active || !state.stage_id || state.status !== "ready" || !state.review_ledger)
          throw new Error("Await terminal review result first");
        const ledgerPath = await safePath(cwd, state.review_ledger);
        const ledger = await ownedLedger(cwd, state, state.review_ledger);
        if (!Array.isArray(ledger.runs) || !ledger.runs.length || !Array.isArray(ledger.findings))
          throw new Error("Missing review history");
        const prior = object(ledger.runs.at(-1));
        if (
          prior.terminal !== true ||
          !["exhausted", "dispute", "non-converged"].includes(String(prior.reason))
        )
          throw new Error("Prior bounded run not terminal");
        if (
          !Number.isInteger(prior.completed_passes) ||
          Number(prior.completed_passes) < 1 ||
          Number(prior.completed_passes) > 10 ||
          (prior.reason === "exhausted" && prior.completed_passes !== 10)
        )
          throw new Error("Invalid bounded review history");
        string(input.diagnosis);
        string(input.approach);
        ledger.runs.push({
          run_id: `review-${randomUUID()}`,
          stage_id: state.stage_id,
          completed_passes: 0,
          predecessor: string(prior.run_id),
          diagnosis: input.diagnosis,
          approach: input.approach,
        });
        await atomic(ledgerPath, ledger); // Existing findings, fixes, states and runs stay byte-for-byte values.
      } else throw new Error("Unknown action");
    }
    await atomic(path, state);
    return state;
  } finally {
    await rm(lock, { recursive: true });
  }
}
if (import.meta.main) {
  try {
    if (process.argv.length !== 3) throw new Error("Usage: bun orchestrator.ts REQUEST.json");
    const request = await read(string(process.argv[2]));
    const state = await operate({
      action: string(request.action) as Request["action"],
      cwd: string(request.cwd),
      state_path: string(request.state_path),
      input: object(request.input),
    });
    process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
