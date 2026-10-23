import { createHash } from "node:crypto";

export interface Policy {
  poll_ms: number;
  idle_ms: number;
  grace_ms: number;
  repeat_limit: number;
  command_timeout_ms: number;
}
export const DEFAULT_POLICY: Policy = {
  poll_ms: 60_000,
  idle_ms: 300_000,
  grace_ms: 120_000,
  repeat_limit: 3,
  command_timeout_ms: 1_200_000,
};
interface Operation {
  id: string;
  key: string;
  inputs: string;
  phase: string;
  summary: string;
  deadline: number;
  started_at: number;
}
interface Failure {
  key: string;
  operation_key: string;
  inputs: string;
  count: number;
  evidence_ref: string;
  resolved?: boolean;
}
export interface Assessment {
  reason: "healthy" | "repeated-error" | "operation-timeout" | "no-progress";
  action: "wait" | "inspect" | "replace";
}
export interface Watchdog {
  policy: Policy;
  attempt_id: string;
  sequence: number;
  last_event_digest?: string;
  last_activity_at: number;
  last_progress_at: number;
  operation?: Operation;
  failures: Failure[];
  last_failure?: string;
  nudge?: { at: number; failures: number; diagnosis: string; instruction: string };
  replacement?: { diagnosis: string; evidence_ref: string };
  recoveries: { diagnosis: string; approach: string; evidence_ref: string; commit_sha?: string }[];
  assessment: Assessment;
}
export type ProgressEvent = {
  sequence: number;
  kind: "activity" | "progress" | "operation-start" | "operation-end";
  summary: string;
  evidence_ref?: string;
  operation?: Omit<Operation, "deadline" | "started_at"> & { timeout_ms: number };
  operation_id?: string;
  failure?: string;
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected object");
  return value as Record<string, unknown>;
}
export function shortText(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 2000 || value.includes("\0"))
    throw new Error("Expected bounded nonempty text");
  return value;
}
function number(value: unknown, minimum = 0): number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum)
    throw new Error("Invalid watchdog number");
  return Number(value);
}
export function policy(value: unknown = {}): Policy {
  const data = record(value);
  if (Object.keys(data).some((key) => !(key in DEFAULT_POLICY)))
    throw new Error("Unknown watchdog policy");
  const parsed = { ...DEFAULT_POLICY, ...data };
  for (const [key, value] of Object.entries(parsed)) number(value, key === "repeat_limit" ? 2 : 1);
  return parsed as Policy;
}
export function beginWatchdog(attempt: string, now: number, previous?: Watchdog): Watchdog {
  const watch: Watchdog = {
    policy: previous?.policy ?? policy(),
    attempt_id: attempt,
    sequence: 0,
    last_activity_at: now,
    last_progress_at: now,
    failures: previous?.failures ?? [],
    recoveries: previous?.recoveries ?? [],
    ...(previous?.last_failure ? { last_failure: previous.last_failure } : {}),
    assessment: { reason: "healthy", action: "wait" },
  };
  watch.assessment = assess(watch, now);
  return watch;
}
export function validateWatchdog(value: unknown): Watchdog {
  const data = record(value);
  data.policy = policy(data.policy);
  shortText(data.attempt_id);
  number(data.sequence);
  number(data.last_activity_at);
  number(data.last_progress_at);
  if (!Array.isArray(data.failures) || !Array.isArray(data.recoveries))
    throw new Error("Invalid watchdog history");
  for (const raw of data.failures) {
    const row = record(raw);
    shortText(row.key);
    shortText(row.operation_key);
    shortText(row.inputs);
    number(row.count, 1);
    shortText(row.evidence_ref);
    if (row.resolved !== undefined && typeof row.resolved !== "boolean")
      throw new Error("Invalid resolved failure");
  }
  for (const raw of data.recoveries) {
    const row = record(raw);
    for (const key of ["diagnosis", "approach", "evidence_ref"]) shortText(row[key]);
    if (row.commit_sha !== undefined) shortText(row.commit_sha);
  }
  if (data.last_event_digest !== undefined) shortText(data.last_event_digest);
  if (data.last_failure !== undefined) shortText(data.last_failure);
  if (data.operation) {
    const row = record(data.operation);
    for (const key of ["id", "key", "inputs", "phase", "summary"]) shortText(row[key]);
    number(row.deadline);
    number(row.started_at);
  }
  if (data.nudge) {
    const row = record(data.nudge);
    number(row.at);
    number(row.failures);
    shortText(row.diagnosis);
    shortText(row.instruction);
  }
  if (data.replacement) {
    const row = record(data.replacement);
    shortText(row.diagnosis);
    shortText(row.evidence_ref);
  }
  const assessment = record(data.assessment);
  if (
    !["healthy", "repeated-error", "operation-timeout", "no-progress"].includes(
      String(assessment.reason),
    ) ||
    !["wait", "inspect", "replace"].includes(String(assessment.action))
  )
    throw new Error("Invalid watchdog assessment");
  return data as unknown as Watchdog;
}
export const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function assess(watch: Watchdog, now: number): Assessment {
  const failure = watch.failures.find((row) => row.key === watch.last_failure);
  const count = failure?.count ?? 0;
  const investigating =
    watch.operation &&
    failure &&
    (watch.operation.key !== failure.operation_key || watch.operation.inputs !== failure.inputs);
  let reason: Assessment["reason"] = "healthy";
  if (count >= watch.policy.repeat_limit && !investigating) reason = "repeated-error";
  else if (watch.operation) {
    if (now >= watch.operation.deadline) reason = "operation-timeout";
    else if (watch.operation.started_at - watch.last_progress_at >= watch.policy.idle_ms)
      reason = "no-progress";
  } else if (now - watch.last_progress_at >= watch.policy.idle_ms) reason = "no-progress";
  if (watch.replacement) return { reason, action: "replace" };
  if (reason === "healthy") return { reason, action: "wait" };
  const ineffectiveNudge =
    watch.nudge && (now - watch.nudge.at >= watch.policy.grace_ms || count > watch.nudge.failures);
  return { reason, action: ineffectiveNudge ? "replace" : "inspect" };
}
export function report(watch: Watchdog, raw: unknown, now: number): boolean {
  const data = record(raw);
  const sequence = number(data.sequence, 1);
  const eventDigest = digest(data);
  if (sequence === watch.sequence && watch.last_event_digest === eventDigest) return false;
  if (sequence !== watch.sequence + 1) throw new Error("Stale or out-of-order progress event");
  shortText(data.summary);
  if (watch.replacement) throw new Error("Worker replacement requested");
  if (data.kind === "operation-start") {
    if (watch.operation) throw new Error("An operation is already active");
    const op = record(data.operation);
    for (const key of ["id", "key", "inputs", "phase", "summary"]) shortText(op[key]);
    const timeout = number(op.timeout_ms, 1);
    if (timeout > watch.policy.command_timeout_ms)
      throw new Error("Operation exceeds parent-approved budget");
    const repeated = watch.failures.find(
      (row) =>
        row.operation_key === op.key &&
        row.inputs === op.inputs &&
        row.count >= watch.policy.repeat_limit &&
        !row.resolved,
    );
    if (
      repeated &&
      (!watch.nudge ||
        repeated.count > watch.nudge.failures ||
        now - watch.nudge.at >= watch.policy.grace_ms)
    )
      throw new Error("Repeated failing operation requires parent diagnosis or changed inputs");
    watch.operation = {
      id: String(op.id),
      key: String(op.key),
      inputs: String(op.inputs),
      phase: String(op.phase),
      summary: String(op.summary),
      deadline: now + timeout,
      started_at: now,
    };
  } else if (data.kind === "operation-end") {
    const op = watch.operation;
    if (!op || data.operation_id !== op.id) throw new Error("Operation identity mismatch");
    shortText(data.evidence_ref);
    if (data.failure !== undefined) {
      const key = digest([op.key, op.inputs, shortText(data.failure)]);
      const row = watch.failures.find((failure) => failure.key === key);
      if (row) {
        row.count++;
        row.evidence_ref = String(data.evidence_ref);
        delete row.resolved;
      } else
        watch.failures.push({
          key,
          operation_key: op.key,
          inputs: op.inputs,
          count: 1,
          evidence_ref: String(data.evidence_ref),
        });
      watch.last_failure = key;
    }
    delete watch.operation;
  } else if (data.kind === "progress") {
    shortText(data.evidence_ref);
    // A claimed milestone cannot renew a running command or erase recurring failures.
    if (watch.operation)
      throw new Error("Finish the active operation before reporting a milestone");
    watch.last_progress_at = now;
    if (
      (watch.failures.find((row) => row.key === watch.last_failure)?.count ?? 0) <
      watch.policy.repeat_limit
    )
      delete watch.nudge;
  } else if (data.kind !== "activity") throw new Error("Invalid progress event kind");
  watch.last_activity_at = now;
  watch.sequence = sequence;
  watch.last_event_digest = eventDigest;
  watch.assessment = assess(watch, now);
  return true;
}
