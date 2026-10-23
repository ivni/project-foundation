import { expect, test } from "bun:test";
import {
  assess,
  beginWatchdog,
  policy,
  report,
  type Watchdog,
} from "../packages/run-feature/scripts/watchdog.ts";
import { failureFingerprint } from "../packages/run-feature/scripts/worker-command.ts";

function event(w: Watchdog, kind: string, now: number, extra: Record<string, unknown> = {}) {
  report(w, { sequence: w.sequence + 1, kind, summary: "fixture", ...extra }, now);
}
function start(w: Watchdog, now: number, key = "test", inputs = "source") {
  event(w, "operation-start", now, {
    operation: {
      id: "command",
      key,
      inputs,
      phase: "checks",
      summary: "run check",
      timeout_ms: 10_000,
    },
  });
}
function fail(w: Watchdog, now: number, inputs = "source") {
  start(w, now, "test", inputs);
  event(w, "operation-end", now + 1, {
    operation_id: "command",
    failure: "missing executable",
    evidence_ref: "error.log",
  });
}
test("activity does not count as progress and an in-budget silent operation remains healthy", () => {
  const w = beginWatchdog("one", 0);
  w.policy = policy({ idle_ms: 100 });
  event(w, "activity", 200);
  expect(assess(w, 200)).toEqual({ reason: "no-progress", action: "inspect" });
  event(w, "progress", 200, { evidence_ref: "diagnosis.log" });
  start(w, 201);
  expect(assess(w, 10_200)).toEqual({ reason: "healthy", action: "wait" });
  event(w, "activity", 10_201);
  expect(assess(w, 10_201)).toEqual({ reason: "operation-timeout", action: "inspect" });
  expect(() => event(w, "progress", 10_202, { evidence_ref: "claimed.log" })).toThrow(
    "active operation",
  );
});
test("chains of short operations cannot hide missing progress even when inputs change every time", () => {
  const w = beginWatchdog("one", 0);
  w.policy.idle_ms = 100;
  for (let i = 0; i < 20; i++) {
    start(w, i * 90, "launcher", `source-with-new-debug-log-${i}`);
    const assessment = assess(w, i * 90 + 45);
    if (i >= 2) expect(assessment.reason).toBe("no-progress");
    event(w, "operation-end", i * 90 + 89, {
      operation_id: "command",
      failure: "same error",
      evidence_ref: "error.log",
    });
  }
});
test("same failed inputs accumulate across fresh workers; changed inputs and diagnostics stay distinct", () => {
  let w = beginWatchdog("one", 0);
  fail(w, 1);
  w = beginWatchdog("two", 3, w);
  fail(w, 4);
  fail(w, 6, "corrected source");
  expect(w.assessment.action).toBe("wait");
  fail(w, 8);
  expect(w.assessment).toEqual({ reason: "repeated-error", action: "inspect" });
  w = beginWatchdog("three", 10, w);
  expect(w.assessment.reason).toBe("repeated-error");
  w.nudge = { at: 10, failures: 3, diagnosis: "launcher fails", instruction: "inspect launcher" };
  event(w, "progress", 11, { evidence_ref: "unrelated.log" });
  expect(w.nudge).toBeDefined();
  expect(assess(w, 12).action).toBe("inspect");
  start(w, 13, "inspect launcher");
  expect(assess(w, 1000).action).toBe("wait");
  event(w, "operation-end", 1001, { operation_id: "command", evidence_ref: "diagnosis.log" });
  fail(w, 1002);
  expect(w.assessment.action).toBe("replace");
});
test("event retries are idempotent; stale, overlapping operations and budget extensions are rejected", () => {
  const w = beginWatchdog("one", 0);
  const first = { sequence: 1, kind: "activity", summary: "alive" };
  expect(report(w, first, 1)).toBe(true);
  expect(report(w, first, 2)).toBe(false);
  expect(w.last_activity_at).toBe(1);
  expect(() => report(w, { ...first, summary: "different" }, 3)).toThrow("out-of-order");
  start(w, 4);
  expect(() => start(w, 5)).toThrow("already active");
  const empty = beginWatchdog("two", 0);
  empty.policy.command_timeout_ms = 1;
  expect(() => start(empty, 1)).toThrow("parent-approved budget");
});
test("failure signatures tolerate timing, colors and transient IDs without hiding error codes", () => {
  const a = failureFingerprint(1, "\x1b[31m2026-10-23T01:02:03.000Z failed in 123ms\x1b[0m");
  const b = failureFingerprint(1, "2026-10-24T02:03:04.000Z failed in 456ms");
  expect(a).toBe(b);
  expect(failureFingerprint(2, "failed")).not.toBe(failureFingerprint(1, "failed"));
});
