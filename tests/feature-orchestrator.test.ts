import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type Issue,
  operate,
  type Request,
  type State,
} from "../packages/run-feature/scripts/orchestrator.ts";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const featurePath = ".agents/work/features/fixture.json";
const statePath = ".agents/work/features/fixture.orchestrator.json";
function git(cwd: string, ...args: string[]) {
  const p = Bun.spawnSync(["git", ...args], { cwd });
  if (p.exitCode) throw new Error(p.stderr.toString());
  return p.stdout.toString().trim();
}
async function json(cwd: string, path: string, data: unknown) {
  await writeFile(join(cwd, path), `${JSON.stringify(data)}\n`);
}
async function fixture() {
  const cwd = await realpath(await mkdtemp(join(tmpdir(), "pf-orchestrator-test-")));
  roots.push(cwd);
  git(cwd, "init", "-q");
  git(cwd, "config", "user.name", "Fixture");
  git(cwd, "config", "user.email", "fixture@example.invalid");
  await writeFile(join(cwd, ".gitignore"), ".agents/\n");
  git(cwd, "add", ".gitignore");
  git(cwd, "commit", "-qm", "base");
  await mkdir(join(cwd, ".agents/work/features"), { recursive: true });
  const record = {
    schema: 1,
    feature_id: "fixture",
    repository: "https://forge.example/group/repo",
    issue_url: "https://forge.example/group/repo/issues/1",
    base_commit: git(cwd, "rev-parse", "HEAD"),
    status: "ready",
  };
  await json(cwd, featurePath, record);
  const issue: Issue = {
    repository: record.repository,
    issue_url: record.issue_url,
    body: "<!-- feature:fixture -->",
    open: true,
    stages: ["S1", "S2", "S3"].map((id) => ({ id, done: false, contract_sha256: hash(id) })),
  };
  const call = (action: Request["action"], input: Record<string, unknown> = {}) =>
    operate({ action, cwd, state_path: statePath, input });
  await call("start", { feature_state_path: featurePath, issue });
  const reserve = async () => {
    const s = await call("dispatch", { issue });
    return call("bind", { attempt_id: s.active?.attempt_id, handle: `worker-${s.attempt}` });
  };
  const result = (s: State, extra: Record<string, unknown>) => ({
    schema: 1,
    feature_id: s.feature_id,
    repository: s.repository,
    issue_url: s.issue_url,
    base_commit: s.base_commit,
    checkout: cwd,
    run_id: s.run_id,
    attempt_id: s.active?.attempt_id,
    stage_id: s.stage_id,
    ...extra,
  });
  const settle = async (s: State, extra: Record<string, unknown>) => {
    await json(cwd, ".agents/work/features/result.json", result(s, extra));
    return call("settle", {
      result_ref: ".agents/work/features/result.json",
      terminal: { ...s.active, stopped: true },
      issue,
    });
  };
  // Test doubles exercise guards; actual independent reviewer/host evidence is a separate smoke.
  const finish = async (s: State) => {
    await writeFile(join(cwd, `${s.stage_id}.txt`), `${s.stage_id}\n`);
    git(cwd, "add", `${s.stage_id}.txt`);
    git(cwd, "commit", "-qm", String(s.stage_id));
    const commit = git(cwd, "rev-parse", "HEAD");
    const tree = git(cwd, "rev-parse", "HEAD^{tree}");
    const stage = issue.stages.find((stage) => stage.id === s.stage_id);
    if (!stage) throw new Error("missing stage");
    stage.done = true;
    stage.result = { commit_sha: commit, ref: `local-result-${stage.id}` };
    await json(cwd, ".agents/work/features/checks.json", {
      tree,
      passed: true,
      commands: ["fixture check"],
      log: ".agents/work/features/check.log",
    });
    await writeFile(join(cwd, ".agents/work/features/check.log"), "fixture checks pass\n");
    await json(cwd, ".agents/work/features/ledger.json", {
      feature_id: "fixture",
      runs: [{ run_id: "test-review", completed_passes: 1 }],
      findings: [],
    });
    await json(cwd, ".agents/work/features/review.json", {
      tree,
      verdict: "CLEAN",
      run_id: "test-review",
      passes: 1,
      ledger: ".agents/work/features/ledger.json",
    });
    return {
      outcome: "stage-complete",
      commit_sha: commit,
      issue_result_ref: stage.result.ref,
      checks_ref: ".agents/work/features/checks.json",
      review_ref: ".agents/work/features/review.json",
      review_run_id: "test-review",
    };
  };
  return { cwd, call, reserve, settle, result, finish, issue, record };
}

test("three dependent stages reserve distinct fresh attempts and require all completion evidence", async () => {
  const f = await fixture();
  const handles = new Set();
  for (const expected of ["S1", "S2", "S3"]) {
    const s = await f.reserve();
    expect(s.stage_id).toBe(expected);
    handles.add(s.active?.attempt_id);
    expect((await f.settle(s, await f.finish(s))).status).toBe("ready");
  }
  expect(handles.size).toBe(3);
  expect((await f.call("dispatch", { issue: f.issue })).status).toBe("implemented");
  expect(git(f.cwd, "rev-list", "--count", "HEAD")).toBe("4");
});

test("false success, stale attempt, wrong tree, wrong SHA and changed contract leave ownership intact", async () => {
  const f = await fixture();
  const s = await f.reserve();
  await expect(
    f.settle(s, { outcome: "stage-complete", commit_sha: f.record.base_commit }),
  ).rejects.toThrow();
  const done = await f.finish(s);
  await expect(f.settle(s, { ...done, attempt_id: "old-attempt" })).rejects.toThrow("Stale result");
  await expect(f.settle(s, { ...done, commit_sha: f.record.base_commit })).rejects.toThrow();
  await json(f.cwd, ".agents/work/features/checks.json", {
    tree: f.record.base_commit,
    passed: true,
    commands: ["check"],
    log: ".agents/work/features/check.log",
  });
  await expect(f.settle(s, done)).rejects.toThrow("Checks do not apply");
  const tree = git(f.cwd, "rev-parse", "HEAD^{tree}");
  await json(f.cwd, ".agents/work/features/checks.json", {
    tree,
    passed: true,
    commands: ["check"],
    log: ".agents/work/features/check.log",
  });
  (f.issue.stages[0] as NonNullable<(typeof f.issue.stages)[0]>).contract_sha256 = hash("changed");
  await expect(f.settle(s, done)).rejects.toThrow("contract changed");
  (f.issue.stages[0] as NonNullable<(typeof f.issue.stages)[0]>).contract_sha256 = hash("S1");
  expect((await f.settle(s, done)).status).toBe("ready");
});

test("retries do not skip a stage; a necessary answer resumes it without resetting review or identity", async () => {
  const f = await fixture();
  let s = await f.reserve();
  await expect(f.call("dispatch", { issue: f.issue })).rejects.toThrow("active/stopped");
  s = await f.settle(s, {
    outcome: "retryable-error",
    diagnosis: "temporary file missing, no writes",
  });
  expect(s.status).toBe("ready");
  s = await f.reserve();
  expect(s.stage_id).toBe("S1");
  s = await f.settle(s, {
    outcome: "needs-user-input",
    diagnosis: "missing configured endpoint",
    question: "Which endpoint?",
    sources_checked: "issue, discovery and config",
  });
  await expect(f.call("resume", { answer: "endpoint" })).rejects.toThrow();
  s = await f.call("resume", {
    answer: "fixture.local",
    sufficiency: "endpoint is the only missing fact",
  });
  expect(s.stage_id).toBe("S1");
  expect(s.answer).toBe("fixture.local");
  await json(f.cwd, ".agents/work/active-feature.json", { state_path: "another.json" });
  s = await f.reserve();
  expect(s.feature_id).toBe("fixture");
});

test("cancellation waits for terminal owner, rejects automatic resume and preserves committed recovery", async () => {
  const f = await fixture();
  const s = await f.reserve();
  const done = await f.finish(s);
  await json(f.cwd, featurePath, {
    ...f.record,
    status: "in-progress",
    stage_id: "S1",
    checkpoint: { action: "committed-awaiting-issue", commit_sha: done.commit_sha },
  });
  await f.call("stop", { reason: "cancelled", diagnosis: "user cancellation" });
  await expect(f.call("resume", { explicit_resume: true })).rejects.toThrow("active owner");
  const stopped = await f.settle(s, done);
  expect(stopped.status).toBe("cancelled");
  await expect(f.call("resume")).rejects.toThrow("Explicit cancellation");
  await f.call("resume", { explicit_resume: true });
  const recovery = await f.reserve();
  expect(recovery.stage_id).toBe("S1");
  await expect(f.settle(recovery, done)).rejects.toThrow("checkpoint not cleared");
  await json(f.cwd, featurePath, f.record);
  expect((await f.settle(recovery, done)).status).toBe("ready");
  expect(git(f.cwd, "rev-list", "--count", "HEAD")).toBe("2");
});

test("review continuation appends a bounded run and retains unresolved findings, fixes and tested states", async () => {
  const f = await fixture();
  const s = await f.reserve();
  const finding = {
    fingerprint: "real-defect",
    blocking: true,
    disposition: "open",
    fixes: ["previous failed fix"],
    tested_states: ["old-tree"],
  };
  await json(f.cwd, ".agents/work/features/ledger.json", {
    feature_id: "fixture",
    runs: [{ run_id: "old-review", terminal: true, reason: "exhausted", completed_passes: 10 }],
    findings: [finding],
  });
  await f.settle(s, {
    outcome: "review-exhausted",
    diagnosis: "ten completed passes, change approach",
    review_ledger: ".agents/work/features/ledger.json",
  });
  await f.call("review-cycle", {
    diagnosis: "recurring root assumption",
    approach: "inspect callers before fix",
  });
  const ledger = JSON.parse(
    await readFile(join(f.cwd, ".agents/work/features/ledger.json"), "utf8"),
  );
  expect(ledger.runs).toHaveLength(2);
  expect(ledger.runs[1]).toMatchObject({ completed_passes: 0, predecessor: "old-review" });
  expect(ledger.findings).toEqual([finding]);
  await expect(f.call("review-cycle", { diagnosis: "again", approach: "again" })).rejects.toThrow(
    "not terminal",
  );
  const next = await f.reserve();
  const done = await f.finish(next);
  await json(f.cwd, ".agents/work/features/ledger.json", ledger);
  const latestRun = ledger.runs[1].run_id;
  const tree = git(f.cwd, "rev-parse", "HEAD^{tree}");
  await json(f.cwd, ".agents/work/features/review.json", {
    tree,
    verdict: "CLEAN",
    run_id: latestRun,
    passes: 1,
    ledger: ".agents/work/features/ledger.json",
  });
  await expect(f.settle(next, { ...done, review_run_id: latestRun })).rejects.toThrow(
    "Unresolved blocking finding",
  );
});

test("predecessor absence, escaping paths, closed issue and concurrent owner are rejected", async () => {
  const f = await fixture();
  (f.issue.stages[0] as NonNullable<(typeof f.issue.stages)[0]>).done = true;
  await expect(f.call("dispatch", { issue: f.issue })).rejects.toThrow("Predecessor evidence");
  (f.issue.stages[0] as NonNullable<(typeof f.issue.stages)[0]>).done = false;
  f.issue.open = false;
  await expect(f.call("dispatch", { issue: f.issue })).rejects.toThrow("closed");
  f.issue.open = true;
  await symlink(tmpdir(), join(f.cwd, ".agents/work/escape"));
  await expect(
    operate({
      action: "start",
      cwd: f.cwd,
      state_path: ".agents/work/escape/other.orchestrator.json",
      input: {},
    }),
  ).rejects.toThrow("Escaping symlink");
  await expect(
    operate({ action: "start", cwd: f.cwd, state_path: "../outside", input: {} }),
  ).rejects.toThrow("inside checkout");
  await mkdir(join(f.cwd, `${statePath}.lock`));
  await expect(f.call("dispatch", { issue: f.issue })).rejects.toThrow();
  expect(JSON.parse(await readFile(join(f.cwd, statePath), "utf8")).attempt).toBe(0);
});

test("explicit cancellation survives a later runtime interruption", async () => {
  const f = await fixture();
  const s = await f.reserve();
  await f.call("stop", { reason: "cancelled", diagnosis: "explicit user cancellation" });
  await f.call("stop", { reason: "interrupted", diagnosis: "runtime died while stopping" });
  const stopped = await f.settle(s, { outcome: "interrupted", diagnosis: "runtime died" });
  expect(stopped.status).toBe("cancelled");
  await expect(f.call("resume")).rejects.toThrow("Explicit cancellation");
  expect((await f.call("resume", { explicit_resume: true })).status).toBe("ready");
});

test("committed recovery reuses its SHA after an unrelated descendant commit", async () => {
  const f = await fixture();
  const s = await f.reserve();
  const done = await f.finish(s);
  await json(f.cwd, featurePath, {
    ...f.record,
    status: "in-progress",
    stage_id: "S1",
    checkpoint: { action: "committed-awaiting-issue", commit_sha: done.commit_sha },
  });
  await f.settle(s, { outcome: "retryable-error", diagnosis: "publication needs reconciliation" });
  await writeFile(join(f.cwd, "unrelated.txt"), "unrelated work\n");
  git(f.cwd, "add", "unrelated.txt");
  git(f.cwd, "commit", "-qm", "unrelated descendant");
  const recovery = await f.reserve();
  await json(f.cwd, featurePath, f.record);
  expect((await f.settle(recovery, done)).status).toBe("ready");
  expect(git(f.cwd, "rev-list", "--count", "HEAD")).toBe("3");
});

test("completion honors recorded permitted deferrals and rejects absent or prohibited records", async () => {
  const f = await fixture();
  const s = await f.reserve();
  await writeFile(
    join(f.cwd, "deferred.md"),
    "Durable deferred defect entry: deferred-defect, outside declared blocking areas.\n",
  );
  git(f.cwd, "add", "deferred.md");
  const done = await f.finish(s);
  const finding = {
    fingerprint: "deferred-defect",
    blocking: true,
    disposition: "deferred",
    deferral: {
      outside_blocking_areas: true,
      reason: "outside declared ship-blocking areas",
      record_ref: "missing.md",
      entry: "Durable deferred defect entry: deferred-defect, outside declared blocking areas.",
      readback_verified: true,
    },
  };
  const ledger = {
    feature_id: "fixture",
    runs: [{ run_id: "test-review", completed_passes: 1 }],
    findings: [finding],
  };
  await json(f.cwd, ".agents/work/features/ledger.json", ledger);
  await expect(f.settle(s, done)).rejects.toThrow();
  finding.deferral.record_ref = "deferred.md";
  finding.deferral.outside_blocking_areas = false;
  await json(f.cwd, ".agents/work/features/ledger.json", ledger);
  await expect(f.settle(s, done)).rejects.toThrow();
  finding.deferral.outside_blocking_areas = true;
  await json(f.cwd, ".agents/work/features/ledger.json", ledger);
  expect((await f.settle(s, done)).status).toBe("ready");
});

test("foreign review history is never adopted or mutated", async () => {
  const f = await fixture();
  const s = await f.reserve();
  const path = ".agents/work/features/foreign-ledger.json";
  await json(f.cwd, path, {
    feature_id: "other-feature",
    runs: [{ run_id: "other-review", completed_passes: 10, terminal: true, reason: "exhausted" }],
    findings: [],
  });
  const before = await readFile(join(f.cwd, path), "utf8");
  await expect(
    f.settle(s, {
      outcome: "review-exhausted",
      diagnosis: "wrong ledger pointer",
      review_ledger: path,
    }),
  ).rejects.toThrow();
  expect(await readFile(join(f.cwd, path), "utf8")).toBe(before);
});

test("verified deferral evidence retains exact issue-comment anchors", async () => {
  const f = await fixture();
  const s = await f.reserve();
  const done = await f.finish(s);
  await json(f.cwd, ".agents/work/features/ledger.json", {
    feature_id: "fixture",
    runs: [{ run_id: "test-review", completed_passes: 1 }],
    findings: [
      {
        fingerprint: "issue-deferral",
        blocking: true,
        disposition: "deferred",
        deferral: {
          outside_blocking_areas: true,
          reason: "outside declared areas",
          readback_verified: true,
          record_ref: `${f.record.issue_url}#issuecomment-123`,
        },
      },
    ],
  });
  expect((await f.settle(s, done)).status).toBe("ready");
});

test("recovery verifies its own deferred entry while preserving unrelated register additions", async () => {
  const f = await fixture();
  const s = await f.reserve();
  const entry = "deferred-original: permitted deferral outside declared blocking areas.";
  await writeFile(join(f.cwd, "deferred.md"), `${entry}\n`);
  git(f.cwd, "add", "deferred.md");
  const done = await f.finish(s);
  await json(f.cwd, ".agents/work/features/ledger.json", {
    feature_id: "fixture",
    runs: [{ run_id: "test-review", completed_passes: 1 }],
    findings: [
      {
        fingerprint: "deferred-original",
        blocking: true,
        disposition: "deferred",
        deferral: {
          outside_blocking_areas: true,
          reason: "outside declared areas",
          readback_verified: true,
          record_ref: "deferred.md",
          entry,
        },
      },
    ],
  });
  await json(f.cwd, featurePath, {
    ...f.record,
    status: "in-progress",
    stage_id: "S1",
    checkpoint: { action: "committed-awaiting-issue", commit_sha: done.commit_sha },
  });
  await f.settle(s, { outcome: "retryable-error", diagnosis: "publication pending" });
  await writeFile(join(f.cwd, "deferred.md"), `${entry}\nunrelated: another feature entry.\n`);
  git(f.cwd, "add", "deferred.md");
  git(f.cwd, "commit", "-qm", "unrelated register addition");
  const recovery = await f.reserve();
  await json(f.cwd, featurePath, f.record);
  expect((await f.settle(recovery, done)).status).toBe("ready");
  expect(await readFile(join(f.cwd, "deferred.md"), "utf8")).toContain(
    "unrelated: another feature entry",
  );
  expect(git(f.cwd, "rev-list", "--count", "HEAD")).toBe("3");
});
