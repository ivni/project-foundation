import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  prepareWorker,
  runProcess,
  type WorkerPlan,
  type WorkerRequest,
} from "../packages/run-feature/scripts/host-worker.ts";
import { type Issue, operate, type State } from "../packages/run-feature/scripts/orchestrator.ts";

// These are executable transport/contract doubles, never authenticated host/model evidence.
const roots: string[] = [];
const processTest = process.platform === "linux" ? test : test.skip;
afterEach(async () => {
  await Promise.all(roots.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});
function git(cwd: string, ...args: string[]) {
  const result = Bun.spawnSync(["git", ...args], { cwd });
  if (result.exitCode) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}
async function fixture() {
  const cwd = await realpath(await mkdtemp(join(tmpdir(), "pf-feature-hosts-")));
  roots.push(cwd);
  git(cwd, "init", "-q");
  git(cwd, "config", "user.name", "Fixture");
  git(cwd, "config", "user.email", "fixture@example.invalid");
  await writeFile(join(cwd, ".gitignore"), ".agents/\n");
  git(cwd, "add", ".gitignore");
  git(cwd, "commit", "-qm", "base");
  await mkdir(join(cwd, ".agents/work/features"), { recursive: true });
  const feature = {
    schema: 1,
    feature_id: "fixture",
    repository: "https://forge.example/team/repo",
    issue_url: "https://forge.example/team/repo/issues/1",
    base_commit: git(cwd, "rev-parse", "HEAD"),
    status: "ready",
  };
  await writeFile(join(cwd, ".agents/work/features/fixture.json"), JSON.stringify(feature));
  const statePath = ".agents/work/features/fixture.orchestrator.json";
  const issue: Issue = {
    repository: feature.repository,
    issue_url: feature.issue_url,
    body: "<!-- feature:fixture -->",
    open: true,
    stages: ["S1", "S2", "S3"].map((id) => ({
      id,
      done: false,
      contract_sha256: createHash("sha256").update(id).digest("hex"),
    })),
  };
  const call = (action: Parameters<typeof operate>[0]["action"], input: Record<string, unknown>) =>
    operate({ action, cwd, state_path: statePath, input });
  await call("start", { feature_state_path: ".agents/work/features/fixture.json", issue });
  const state = await call("dispatch", { issue });
  const request: WorkerRequest = {
    host: "pi",
    cwd,
    state_path: statePath,
    stage_skill_root: resolve("packages/run-feature-stage"),
    review_skill_root: resolve("packages/run-codex-review-loop"),
    configuration: {
      source: "fixture-effective-configuration (synthetic)",
      equivalent: true,
      values: {},
    },
    constraints: "Fixture only, no network/global config; user started this bounded test.",
  };
  const save = (path: string, value: unknown) => writeFile(join(cwd, path), JSON.stringify(value));
  const result = (s: State, extra: Record<string, unknown>) => ({
    schema: 1,
    feature_id: s.feature_id,
    repository: s.repository,
    issue_url: s.issue_url,
    base_commit: s.base_commit,
    checkout: cwd,
    stage_id: s.stage_id,
    run_id: s.run_id,
    attempt_id: s.active?.attempt_id,
    ...extra,
  });
  const settle = async (plan: WorkerPlan, s: State, extra: Record<string, unknown>) => {
    await save(plan.result_ref, result(s, extra));
    const transport = JSON.parse(
      await readFile(join(cwd, plan.artifact_ref, "transport.json"), "utf8"),
    );
    return call("settle", {
      result_ref: plan.result_ref,
      terminal: {
        attempt_id: transport.attempt_id,
        handle: transport.handle,
        stopped: transport.terminal,
      },
      issue,
    });
  };
  return { cwd, request, state, issue, call, save, result, settle };
}
async function double(plan: WorkerPlan, source: string) {
  const script = join(plan.cwd, `double-${plan.attempt_id}.mjs`);
  await writeFile(script, source);
  plan.process = {
    executable: process.execPath,
    args: [script, ...(plan.process?.args ?? [])],
    prompt_file: plan.host === "hermes",
  };
  return plan;
}
const outputArguments = `console.log(JSON.stringify(process.argv.slice(2)));`;

processTest(
  "worker-written successful results advance three dependent stages only after fresh readback",
  async () => {
    const f = await fixture();
    f.request.host = "hermes";
    await f.save("issue.json", f.issue);
    const handles = new Set<string>();
    const commits = new Set<string>();
    for (const stageId of ["S1", "S2", "S3"]) {
      const plan = await prepareWorker(f.request);
      await double(
        plan,
        `
      import { readFileSync, writeFileSync } from 'node:fs';
      import { execFileSync } from 'node:child_process';
      const git = (...args) => execFileSync('git', args, {encoding:'utf8'}).trim();
      const read = path => JSON.parse(readFileSync(path, 'utf8'));
      const save = (path, value) => writeFileSync(path, JSON.stringify(value));
      const state = read(${JSON.stringify(f.request.state_path)});
      const issue = read('issue.json');
      const index = issue.stages.findIndex(stage => stage.id === state.stage_id);
      if (index && Number(readFileSync('value.txt','utf8')) !== index) throw Error('predecessor missing');
      writeFileSync('value.txt', String(index+1));
      if (Number(readFileSync('value.txt','utf8')) !== index+1) throw Error('check failed');
      git('add','value.txt'); git('commit','-qm',state.stage_id);
      const commit = git('rev-parse','HEAD'); const tree = git('rev-parse','HEAD^{tree}');
      const artifact = ${JSON.stringify(plan.artifact_ref)};
      // Synthetic review/forge records exercise completion guards, not actual host/reviewer acceptance.
      save(artifact+'/ledger.json', {feature_id:state.feature_id,runs:[{run_id:state.stage_id,completed_passes:1}],findings:[]});
      save(artifact+'/review.json', {tree,verdict:'CLEAN',run_id:state.stage_id,passes:1,ledger:artifact+'/ledger.json'});
      writeFileSync(artifact+'/check.log','value dependency check passed');
      save(artifact+'/checks.json', {tree,passed:true,commands:['fixture value dependency check'],log:artifact+'/check.log'});
      issue.stages[index].done=true;
      issue.stages[index].result={commit_sha:commit,ref:'fixture-result-'+state.stage_id};
      save('issue.json',issue);
      save(${JSON.stringify(plan.result_ref)}, {
        schema:1, feature_id:state.feature_id, repository:state.repository, issue_url:state.issue_url,
        base_commit:state.base_commit, checkout:state.checkout, run_id:state.run_id,
        attempt_id:state.active.attempt_id, stage_id:state.stage_id, outcome:'stage-complete',
        commit_sha:commit, issue_result_ref:issue.stages[index].result.ref,
        checks_ref:artifact+'/checks.json', review_ref:artifact+'/review.json', review_run_id:state.stage_id
      });
    `,
      );
      const transport = await runProcess(plan);
      expect(transport.exit_code).toBe(0);
      expect(transport.result_present).toBe(true);
      handles.add(transport.handle);
      const issue = JSON.parse(await readFile(join(f.cwd, "issue.json"), "utf8")) as Issue;
      const result = JSON.parse(await readFile(join(f.cwd, plan.result_ref), "utf8"));
      commits.add(result.commit_sha);
      expect(result.stage_id).toBe(stageId);
      const terminal = {
        attempt_id: transport.attempt_id,
        handle: transport.handle,
        stopped: true,
      };
      const stale = {
        ...issue,
        stages: issue.stages.map((stage) =>
          stage.id === stageId ? { ...stage, done: false } : stage,
        ),
      };
      await expect(
        f.call("settle", { result_ref: plan.result_ref, terminal, issue: stale }),
      ).rejects.toThrow();
      expect(
        (await f.call("settle", { result_ref: plan.result_ref, terminal, issue })).status,
      ).toBe("ready");
      const next = await f.call("dispatch", { issue });
      expect(next.status).toBe(stageId === "S3" ? "implemented" : "dispatching");
    }
    expect(handles.size).toBe(3);
    expect(commits.size).toBe(3);
    expect(await readFile(join(f.cwd, "value.txt"), "utf8")).toBe("3");
    const issue = JSON.parse(await readFile(join(f.cwd, "issue.json"), "utf8")) as Issue;
    await expect(f.call("dispatch", { issue })).rejects.toThrow("Cannot dispatch");
    expect(JSON.parse(await readFile(join(f.cwd, f.request.state_path), "utf8")).status).toBe(
      "implemented",
    );
    expect(issue.open).toBe(true);
    expect(git(f.cwd, "rev-list", "--count", "HEAD")).toBe("4");
  },
);

test("native packets pin identity/paths and omit conversation/model/permission/session overrides", async () => {
  const f = await fixture();
  for (const [host, tool] of [
    ["claude-code", "Agent"],
    ["claude-code", "Task"],
    ["opencode", "task"],
    ["opencode", "subagent"],
  ] as const) {
    const plan = await prepareWorker({
      ...f.request,
      host,
      native: { tool, worker: "fixture-full-worker", schema_ref: "fixture-schema" },
    });
    expect(plan.native?.tool).toBe(tool);
    const args = plan.native?.arguments ?? {};
    expect(Object.keys(args).sort()).toEqual(
      ["description", "prompt", tool === "subagent" ? "agent" : "subagent_type"].sort(),
    );
    const identity = JSON.parse(
      plan.prompt.split("\n").find((line) => line.startsWith('{"schema":')) ?? "null",
    );
    expect(identity).toEqual(f.result(f.state, {}));
    expect(plan.prompt).toContain(f.request.stage_skill_root);
    expect(plan.prompt).toContain(f.request.review_skill_root);
    await expect(runProcess(plan)).rejects.toThrow("Native plans");
  }
  await f.save(".agents/work/active-feature.json", { schema: 1, state_path: "some-other-feature" });
  expect((await prepareWorker(f.request)).run_id).toBe(f.state.run_id);
});

test("rejects unsafe roots, wrong skills, stale dispatch and config broadening before spawn", async () => {
  const f = await fixture();
  for (const request of [
    { ...f.request, configuration: { ...f.request.configuration, equivalent: false } },
    { ...f.request, configuration: { ...f.request.configuration, values: { approve: "true" } } },
    {
      ...f.request,
      configuration: { ...f.request.configuration, values: { resume: "old-session" } },
    },
    { ...f.request, configuration: { ...f.request.configuration, values: { model: "--bypass" } } },
    { ...f.request, stage_skill_root: f.request.review_skill_root },
    { ...f.request, cwd: dirname(f.cwd) },
    {
      ...f.request,
      host: "claude-code",
      native: { tool: "Agent", worker: "fork", schema_ref: "fixture" },
    },
    {
      ...f.request,
      host: "opencode",
      native: { tool: "Task", worker: "fixture", schema_ref: "fixture" },
    },
  ])
    await expect(prepareWorker(request as WorkerRequest)).rejects.toThrow();
  const outside = await mkdtemp(join(tmpdir(), "pf-host-outside-"));
  roots.push(outside);
  await writeFile(join(outside, "state.json"), JSON.stringify(f.state));
  await symlink(join(outside, "state.json"), join(f.cwd, "outside.json"));
  await expect(prepareWorker({ ...f.request, state_path: "outside.json" })).rejects.toThrow(
    "symlink",
  );
  const plan = await prepareWorker(f.request);
  await f.call("stop", { reason: "cancelled", diagnosis: "fixture operator cancellation" });
  if (process.platform === "linux")
    await expect(runProcess(plan)).rejects.toThrow("Dispatch changed");
});

processTest(
  "Pi argv passes literal brief and effective tools/model without shell expansion",
  async () => {
    const f = await fixture();
    f.request.constraints += " literal $(touch SHOULD-NOT-EXIST) `touch ALSO-NOT` 'quote'";
    f.request.configuration.values = {
      model: "provider/model",
      thinking: "high",
      tools: "read,bash,edit",
      "exclude-tools": "denied-tool",
    };
    const plan = await double(await prepareWorker(f.request), outputArguments);
    const t = await runProcess(plan);
    const args = JSON.parse(await readFile(join(f.cwd, t.stdout_ref), "utf8"));
    expect(args.slice(0, 4)).toEqual(["--mode", "json", "-p", "--no-session"]);
    expect(args.at(-1)).toBe(plan.prompt);
    expect(args).toContain("provider/model");
    expect(args).toContain("denied-tool");
    expect(t.exit_code).toBe(0);
    expect(t.result_present).toBe(false);
    expect(await Bun.file(join(f.cwd, "SHOULD-NOT-EXIST")).exists()).toBe(false);
    expect(
      (JSON.parse(await readFile(join(f.cwd, f.request.state_path), "utf8")) as State).active
        ?.handle,
    ).toBe(t.handle);
    if (process.platform === "linux")
      await expect(runProcess(plan)).rejects.toThrow("Dispatch changed");
  },
);

processTest(
  "Hermes executes three fresh process attempts without native child/resume/worktree flags",
  async () => {
    const f = await fixture();
    f.request.host = "hermes";
    f.request.configuration.values = {
      profile: "effective-profile",
      provider: "effective-provider",
      model: "effective-model",
      reasoning: "high",
      toolsets: "terminal,skills",
    };
    let state = f.state;
    const pids = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const plan = await prepareWorker(f.request);
      await double(
        plan,
        `import {readFileSync} from 'node:fs'; const args=process.argv.slice(2); const p=args[args.indexOf('--query-file')+1]; console.log(JSON.stringify({args, packet:p, brief:readFileSync(p,'utf8')}));`,
      );
      const t = await runProcess(plan);
      pids.add(t.handle);
      const output = JSON.parse(await readFile(join(f.cwd, t.stdout_ref), "utf8"));
      expect(output.args.slice(0, 3)).toEqual(["--profile", "effective-profile", "chat"]);
      expect(output.args[output.args.indexOf("--in") + 1]).toBe(f.cwd);
      expect(output.args).toContain("--oneshot");
      expect(output.args).toContain("stream-json");
      for (const forbidden of ["--resume", "--continue", "--worktree", "--skip-permissions"])
        expect(output.args).not.toContain(forbidden);
      expect(output.brief).toBe(plan.prompt);
      expect(await Bun.file(output.packet).exists()).toBe(false);
      await f.settle(plan, state, {
        outcome: "retryable-error",
        diagnosis: "transport fixture; no actual host/stage completion",
      });
      state = await f.call("dispatch", { issue: f.issue });
    }
    expect(pids.size).toBe(3);
  },
);

processTest(
  "transport preserves ordinary failure and missing/malformed result; never advances a stage",
  async () => {
    const f = await fixture();
    const plan = await double(
      await prepareWorker(f.request),
      `console.error('fixture host error'); process.exit(7);`,
    );
    const t = await runProcess(plan);
    expect(t.exit_code).toBe(7);
    expect(t.result_present).toBe(false);
    expect(await readFile(join(f.cwd, t.stderr_ref), "utf8")).toContain("fixture host error");
    const retry = await f.settle(plan, f.state, {
      outcome: "retryable-error",
      diagnosis: "observed exit 7",
    });
    expect(retry.stage_id).toBe("S1");
    expect(retry.status).toBe("ready");
    const state = await f.call("dispatch", { issue: f.issue });
    const malformed = await double(
      await prepareWorker(f.request),
      `import {writeFileSync} from 'node:fs';writeFileSync(${JSON.stringify(join(f.cwd, `.agents/work/features/fixture.${state.active?.attempt_id}.host/result.json`))},'not json');`,
    );
    const bad = await runProcess(malformed);
    expect(bad.result_present).toBe(false);
    expect(await readFile(join(f.cwd, bad.result_ref), "utf8")).toBe("not json");
  },
);

processTest(
  "missing information and sufficient answer settle/resume the same host-independent stage",
  async () => {
    const f = await fixture();
    const plan = await double(await prepareWorker(f.request), outputArguments);
    await runProcess(plan);
    const blocked = await f.settle(plan, f.state, {
      outcome: "needs-user-input",
      diagnosis: "fixture missing environment",
      question: "Which permitted environment?",
      sources_checked: "PATH fixture",
    });
    expect(blocked.status).toBe("awaiting-input");
    await expect(f.call("dispatch", { issue: f.issue })).rejects.toThrow();
    await f.call("resume", {
      answer: "fixture environment",
      sufficiency: "has required tooling and auth",
    });
    const resumed = await f.call("dispatch", { issue: f.issue });
    expect(resumed.stage_id).toBe(f.state.stage_id);
    expect(resumed.active?.attempt_id).not.toBe(f.state.active?.attempt_id);
  },
);

processTest(
  "supervisor observes watchdog state and stops the owned process tree on replacement",
  async () => {
    const f = await fixture();
    const plan = await double(
      await prepareWorker(f.request),
      `import {spawn} from 'node:child_process'; const child=spawn(process.execPath,['-e',"setInterval(()=>{},100)"],{stdio:'ignore',detached:true});console.log(child.pid);setInterval(()=>{},100);`,
    );
    const controller = new AbortController();
    const pending = runProcess(plan, controller.signal);
    try {
      let childPid = 0;
      let current: State = f.state;
      for (let i = 0; i < 100; i++) {
        childPid = Number(
          (
            await Bun.file(join(f.cwd, plan.artifact_ref, "stdout.log"))
              .text()
              .catch(() => "")
          ).trim(),
        );
        current = JSON.parse(await readFile(join(f.cwd, f.request.state_path), "utf8"));
        if (childPid && current.status === "running") break;
        await Bun.sleep(20);
      }
      expect(childPid).toBeGreaterThan(0);
      if (!current.watchdog) throw new Error("watchdog missing");
      current.watchdog.last_progress_at = 0;
      current.watchdog.policy.grace_ms = 1;
      await f.save(f.request.state_path, current);
      const owner = { run_id: current.run_id, attempt_id: current.active?.attempt_id };
      const evidence = `${plan.artifact_ref}/stdout.log`;
      await f.call("intervene", {
        ...owner,
        mode: "nudge",
        diagnosis: "no progress",
        instruction: "diagnose before continuing",
        evidence_ref: evidence,
      });
      await Bun.sleep(5);
      await f.call("intervene", {
        ...owner,
        mode: "replace",
        diagnosis: "no response to correction",
        evidence_ref: evidence,
      });
      const transport = await pending;
      expect(transport.interrupted).toBe(true);
      expect(transport.terminal).toBe(true);
      const ps = Bun.spawnSync(["ps", "-o", "stat=", "-p", String(childPid)])
        .stdout.toString()
        .trim();
      expect(ps === "" || ps.startsWith("Z")).toBe(true);
      expect(
        (
          await f.settle(plan, f.state, {
            outcome: "retryable-error",
            diagnosis: "watchdog stopped worker",
          })
        ).status,
      ).toBe("ready");
    } finally {
      controller.abort();
      await pending.catch(() => {});
    }
  },
);

processTest(
  "cancellation terminates a stubborn host and descendant before releasing ownership",
  async () => {
    const f = await fixture();
    const plan = await double(
      await prepareWorker(f.request),
      `import {spawn} from 'node:child_process'; const child=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},100)"],{stdio:'ignore',detached:true});console.log(child.pid);process.on('SIGTERM',()=>{});setInterval(()=>{},100);`,
    );
    const controller = new AbortController();
    const pending = runProcess(plan, controller.signal);
    let childPid = 0;
    for (let i = 0; i < 100; i++) {
      const data = await Bun.file(join(f.cwd, plan.artifact_ref, "stdout.log"))
        .text()
        .catch(() => "");
      childPid = Number(data.trim());
      if (childPid) break;
      await Bun.sleep(20);
    }
    expect(childPid).toBeGreaterThan(0);
    await f.call("stop", { reason: "cancelled", diagnosis: "explicit fixture cancellation" });
    controller.abort();
    const t = await pending;
    expect(t.interrupted).toBe(true);
    expect(t.signal).toBe("SIGKILL");
    expect(t.terminal).toBe(true);
    const ps = Bun.spawnSync(["ps", "-o", "stat=", "-p", String(childPid)])
      .stdout.toString()
      .trim();
    expect(ps === "" || ps.startsWith("Z")).toBe(true);
    const settled = await f.settle(plan, f.state, {
      outcome: "interrupted",
      diagnosis: "actual process cancellation",
    });
    expect(settled.status).toBe("cancelled");
    await expect(f.call("resume", {})).rejects.toThrow();
    await f.call("resume", { explicit_resume: true });
    expect((await f.call("dispatch", { issue: f.issue })).stage_id).toBe("S1");
  },
);

processTest(
  "cancelled Hermes packet is removed after failure and output remains durable",
  async () => {
    const f = await fixture();
    f.request.host = "hermes";
    const plan = await double(
      await prepareWorker(f.request),
      `const args=process.argv.slice(2);console.log(args[args.indexOf('--query-file')+1]);setInterval(()=>{},100);`,
    );
    const controller = new AbortController();
    const pending = runProcess(plan, controller.signal);
    let packet = "";
    for (let i = 0; i < 100; i++) {
      packet = (
        await Bun.file(join(f.cwd, plan.artifact_ref, "stdout.log"))
          .text()
          .catch(() => "")
      ).trim();
      if (packet) break;
      await Bun.sleep(20);
    }
    expect(packet).toContain("pf-feature-worker-");
    controller.abort();
    const t = await pending;
    expect(t.interrupted).toBe(true);
    expect(await Bun.file(packet).exists()).toBe(false);
    expect(await Bun.file(join(f.cwd, t.stdout_ref)).exists()).toBe(true);
  },
);

processTest(
  "normal and failed host exits reap detached descendants while preserving unrelated callers",
  async () => {
    const unrelated = Bun.spawn([process.execPath, "-e", "setInterval(()=>{},100)"], {
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
    });
    try {
      for (const exit of [0, 7]) {
        const f = await fixture();
        const plan = await double(
          await prepareWorker(f.request),
          `import {spawn} from 'node:child_process';const child=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},100)"],{detached:true,stdio:'ignore'});console.log(child.pid);process.exit(${exit});`,
        );
        const transport = await runProcess(plan);
        const pid = Number((await readFile(join(f.cwd, transport.stdout_ref), "utf8")).trim());
        expect(pid).toBeGreaterThan(0);
        const stat = Bun.spawnSync(["ps", "-o", "stat=", "-p", String(pid)])
          .stdout.toString()
          .trim();
        expect(stat === "" || stat.startsWith("Z")).toBe(true);
        expect(transport.exit_code).toBe(exit);
        expect(unrelated.exitCode).toBeNull();
      }
    } finally {
      unrelated.kill();
      await unrelated.exited;
    }
  },
);

processTest("imported runner passes current benign environment mutations to the host", async () => {
  const f = await fixture();
  const plan = await double(
    await prepareWorker(f.request),
    `console.log(process.env.PF_FEATURE_HOST_ENV_TEST ?? 'MISSING');`,
  );
  const previous = process.env.PF_FEATURE_HOST_ENV_TEST;
  try {
    process.env.PF_FEATURE_HOST_ENV_TEST = "current-effective-fixture-value";
    const transport = await runProcess(plan);
    expect((await readFile(join(f.cwd, transport.stdout_ref), "utf8")).trim()).toBe(
      "current-effective-fixture-value",
    );
  } finally {
    if (previous === undefined) delete process.env.PF_FEATURE_HOST_ENV_TEST;
    else process.env.PF_FEATURE_HOST_ENV_TEST = previous;
  }
});

processTest(
  "actual run CLI survives repeated process-group cancellation until owned cleanup completes",
  async () => {
    const f = await fixture();
    const bin = join(f.cwd, "bin");
    await mkdir(bin);
    await writeFile(
      join(bin, "pi"),
      `#!${process.execPath}\nimport {spawn} from 'node:child_process';const child=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},100)"],{detached:true,stdio:'ignore'});console.log(child.pid);process.on('SIGTERM',()=>{});setInterval(()=>{},100);`,
      { mode: 0o755 },
    );
    const req = join(f.cwd, "request.json");
    await writeFile(req, JSON.stringify(f.request));
    const { spawn } = await import("node:child_process");
    const cli = spawn(
      process.execPath,
      [resolve("packages/run-feature/scripts/host-worker.ts"), "run", req],
      {
        cwd: f.cwd,
        detached: true,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    let error = "";
    cli.stdout.on("data", (b) => {
      output += b;
    });
    cli.stderr.on("data", (b) => {
      error += b;
    });
    const closed = new Promise<number | null>((resolve, reject) => {
      cli.once("close", resolve);
      cli.once("error", reject);
    });
    const artifact = join(
      f.cwd,
      `.agents/work/features/fixture.${f.state.active?.attempt_id}.host`,
    );
    let descendant = 0;
    let host = 0;
    try {
      for (let i = 0; i < 150; i++) {
        descendant = Number(
          (
            await Bun.file(join(artifact, "stdout.log"))
              .text()
              .catch(() => "")
          ).trim(),
        );
        if (descendant) {
          host = JSON.parse(await readFile(join(artifact, "launch.json"), "utf8")).pid;
          break;
        }
        await Bun.sleep(20);
      }
      expect(descendant).toBeGreaterThan(0);
      expect(host).toBeGreaterThan(0);
      await f.call("stop", {
        reason: "cancelled",
        diagnosis: "explicit CLI group cancellation fixture",
      });
      if (!cli.pid) throw new Error("Fixture CLI did not spawn");
      process.kill(-cli.pid, "SIGTERM");
      await Bun.sleep(100);
      try {
        if (!cli.pid) throw new Error("Fixture CLI did not spawn");
        process.kill(-cli.pid, "SIGTERM");
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ESRCH") throw e;
      }
      const exit = await Promise.race([
        closed,
        Bun.sleep(5000).then(() => {
          throw Error("CLI failed to terminate");
        }),
      ]);
      expect(error).toBe("");
      expect(exit).toBe(0);
      const transport = JSON.parse(output);
      expect(transport.terminal).toBe(true);
      expect(transport.interrupted).toBe(true);
      for (const pid of [host, descendant]) {
        const stat = Bun.spawnSync(["ps", "-o", "stat=", "-p", String(pid)])
          .stdout.toString()
          .trim();
        expect(stat === "" || stat.startsWith("Z")).toBe(true);
      }
    } finally {
      for (const pid of [cli.pid, host, descendant])
        if (pid)
          try {
            process.kill(-pid, "SIGKILL");
          } catch {}
      await closed;
    }
  },
);

test("skill identity parses valid CRLF and quoted YAML without accepting names embedded in descriptions", async () => {
  const f = await fixture();
  const root = join(f.cwd, "stage-skill");
  await mkdir(root);
  const original = await readFile(join(f.request.stage_skill_root, "SKILL.md"), "utf8");
  const request: WorkerRequest = {
    ...f.request,
    host: "claude-code",
    stage_skill_root: root,
    native: { tool: "Task", worker: "fixture-worker", schema_ref: "synthetic-native-schema" },
  };
  for (const text of [
    original.replaceAll("\n", "\r\n"),
    original.replace("name: run-feature-stage", "name: 'run-feature-stage'"),
  ]) {
    await writeFile(join(root, "SKILL.md"), text);
    expect((await prepareWorker(request)).native?.tool).toBe("Task");
  }
  await writeFile(
    join(root, "SKILL.md"),
    "---\nname: other-skill\ndescription: |\n  name: run-feature-stage\n---\nUnrelated skill.\n",
  );
  await expect(prepareWorker(request)).rejects.toThrow("Wrong installed skill");
});

processTest(
  "descendant exit between live observation and pidfd signal remains successful cleanup",
  async () => {
    const f = await fixture();
    const scripts = join(f.cwd, "isolated-scripts");
    await mkdir(scripts);
    const original = await readFile(
      resolve("packages/run-feature/scripts/process-tree.ts"),
      "utf8",
    );
    const seam = "const current = await stat(row.pid);";
    expect(original.split(seam).length).toBe(2);
    const gate = join(f.cwd, "descendant-exit-gate");
    // Force a real child exit and parent reaping after a live observation with an open pidfd.
    // Only an isolated source copy controls ordering; production signaling/error logic is unchanged.
    await writeFile(
      join(scripts, "process-tree.ts"),
      original.replace(
        seam,
        `${seam}\n          await Bun.write(${JSON.stringify(gate)}, "exit");\n          const waiter = dlopen("libc.so.6", { waitpid: { args: [FFIType.i32, FFIType.ptr, FFIType.i32], returns: FFIType.i32 } });\n          if (waiter.symbols.waitpid(row.pid, null, 0) !== row.pid) throw new Error("Controlled child reaping failed");\n          waiter.close();`,
      ),
    );
    await writeFile(
      join(scripts, "orchestrator.ts"),
      await readFile(resolve("packages/run-feature/scripts/orchestrator.ts"), "utf8"),
    );
    await writeFile(
      join(scripts, "watchdog.ts"),
      await readFile(resolve("packages/run-feature/scripts/watchdog.ts"), "utf8"),
    );
    await writeFile(
      join(scripts, "host-worker.ts"),
      await readFile(resolve("packages/run-feature/scripts/host-worker.ts"), "utf8"),
    );
    const childCode = `const {existsSync}=require('node:fs');setInterval(()=>{if(existsSync(${JSON.stringify(gate)}))process.exit(0)},10);`;
    const plan = await double(
      await prepareWorker(f.request),
      `import {spawn} from 'node:child_process';const child=spawn(process.execPath,['-e',${JSON.stringify(childCode)}],{detached:true,stdio:'ignore'});console.log(child.pid);process.exit(0);`,
    );
    const isolated = (await import(
      join(scripts, "host-worker.ts")
    )) as typeof import("../packages/run-feature/scripts/host-worker.ts");
    const transport = await isolated.runProcess(plan);
    expect(transport.terminal).toBe(true);
    expect(transport.exit_code).toBe(0);
    const pid = Number((await readFile(join(f.cwd, transport.stdout_ref), "utf8")).trim());
    const stat = Bun.spawnSync(["ps", "-o", "stat=", "-p", String(pid)])
      .stdout.toString()
      .trim();
    expect(stat === "" || stat.startsWith("Z")).toBe(true);
  },
);
