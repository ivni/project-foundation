#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  type FileHandle,
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { operate, type State, safePath } from "./orchestrator.ts";

type Host = "claude-code" | "pi" | "opencode" | "hermes";
export interface WorkerRequest {
  host: Host;
  cwd: string;
  state_path: string;
  stage_skill_root: string;
  review_skill_root: string;
  // Observed effective configuration, not a permission grant or arbitrary CLI argv.
  configuration: { source: string; equivalent: true; values: Record<string, string> };
  constraints: string;
  native?: { tool: "Agent" | "Task" | "task" | "subagent"; worker: string; schema_ref: string };
}
export interface WorkerPlan {
  host: Host;
  cwd: string;
  state_path: string;
  attempt_id: string;
  run_id: string;
  prompt: string;
  artifact_ref: string;
  result_ref: string;
  native?: { tool: string; arguments: Record<string, string> };
  process?: { executable: string; args: string[]; prompt_file: boolean };
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.includes("\0"))
    throw new Error("Expected nonempty text without NUL");
  return value;
}
async function skill(root: string, name: string): Promise<string> {
  if (!isAbsolute(root)) throw new Error("Skill root must be absolute");
  const actual = await realpath(root);
  const source = await readFile(join(actual, "SKILL.md"), "utf8");
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  const parsed = frontmatter ? Bun.YAML.parse(frontmatter) : null;
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    (parsed as Record<string, unknown>).name !== name
  )
    throw new Error(`Wrong installed skill: ${name}`);
  return actual;
}
export async function prepareWorker(request: WorkerRequest): Promise<WorkerPlan> {
  if (!["claude-code", "pi", "opencode", "hermes"].includes(request.host))
    throw new Error("Unsupported host");
  const cwd = await realpath(text(request.cwd));
  const git = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], { cwd });
  if (git.exitCode || (await realpath(git.stdout.toString().trim())) !== cwd)
    throw new Error("Expected exact checkout root");
  const state = JSON.parse(
    await readFile(await safePath(cwd, request.state_path), "utf8"),
  ) as State;
  if (
    state.schema !== 1 ||
    state.checkout !== cwd ||
    state.status !== "dispatching" ||
    !state.active ||
    state.active.handle !== null ||
    state.stop_requested ||
    !state.stage_id ||
    request.state_path !== `.agents/work/features/${state.feature_id}.orchestrator.json`
  )
    throw new Error("Expected reserved, unbound dispatch for this checkout");
  for (const id of [state.feature_id, state.active.attempt_id, state.run_id, state.stage_id])
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/.test(id))
      throw new Error("Invalid dispatch identity");
  const feature = JSON.parse(await readFile(await safePath(cwd, state.feature_state_path), "utf8"));
  for (const key of ["feature_id", "repository", "issue_url", "base_commit"] as const)
    if (feature[key] !== state[key]) throw new Error(`Feature identity changed: ${key}`);
  const stageRoot = await skill(request.stage_skill_root, "run-feature-stage");
  const reviewRoot = await skill(request.review_skill_root, "run-codex-review-loop");
  await realpath(join(reviewRoot, "scripts/run-codex-review.ts"));
  if (request.configuration?.equivalent !== true)
    throw new Error("Effective configuration equivalence must be established by host preflight");
  const source = text(request.configuration.source);
  const constraints = text(request.constraints);
  const artifactRef = `.agents/work/features/${state.feature_id}.${state.active.attempt_id}.host`;
  await safePath(cwd, artifactRef);
  const identity = {
    schema: 1,
    feature_id: state.feature_id,
    repository: state.repository,
    issue_url: state.issue_url,
    base_commit: state.base_commit,
    checkout: cwd,
    run_id: state.run_id,
    attempt_id: state.active.attempt_id,
    stage_id: state.stage_id,
  };
  const resultRef = `${artifactRef}/result.json`;
  const prompt = [
    `Invoke run-feature-stage at ${stageRoot}/SKILL.md for exactly the pinned stage below.`,
    `Read the shared result/continuation contract at ${resolve(import.meta.dir, "../references/protocol.md")}.`,
    "This is delegated authority from a user-started run-feature, not automatic skill discovery.",
    JSON.stringify(identity),
    `Read feature record ${state.feature_state_path}, parent sidecar ${request.state_path}, live issue and exact discovery.`,
    `Invoke independent run-codex-review-loop at ${reviewRoot}/SKILL.md using its ${request.host} adapter and actual Codex CLI wrapper.`,
    `Save the protocol.md structured result inside checkout at ${resultRef}; keep actual checks/review evidence durable.`,
    "Return one short summary and that path. Exit zero or a verbal success does not close a stage.",
    "If clarification is unavailable, return needs-user-input with the necessary question and sources_checked.",
    "Return review-exhausted to the parent at the bounded stop; preserve all run/finding/fix history.",
    `Effective configuration source (host preflight, not permission): ${source}`,
    `Inherited user/repository constraints and relevant approvals: ${constraints}`,
    "No push, PR/MR, merge, release, dependency installation, global config change, production mutation or issue closure.",
  ].join("\n");
  const plan: WorkerPlan = {
    host: request.host,
    cwd,
    state_path: request.state_path,
    attempt_id: state.active.attempt_id,
    run_id: state.run_id,
    prompt,
    artifact_ref: artifactRef,
    result_ref: resultRef,
  };
  const values = request.configuration.values;
  if (!values || typeof values !== "object" || Array.isArray(values))
    throw new Error("Expected effective configuration values");
  if (request.host === "claude-code" || request.host === "opencode") {
    const native = request.native;
    if (!native || !text(native.schema_ref) || !text(native.worker) || native.worker === "fork")
      throw new Error("Need observed fresh native worker/schema");
    const tools = request.host === "claude-code" ? ["Agent", "Task"] : ["task", "subagent"];
    if (!tools.includes(native.tool) || Object.keys(values).length)
      throw new Error(
        "Native configuration is inherited; select a compatible worker without overrides",
      );
    plan.native = {
      tool: native.tool,
      arguments: {
        description: `Feature stage ${state.stage_id}`,
        prompt,
        [native.tool === "subagent" ? "agent" : "subagent_type"]: native.worker,
      },
    };
    return plan;
  }
  const allowed =
    request.host === "pi"
      ? ["model", "thinking", "tools", "exclude-tools"]
      : ["profile", "provider", "model", "reasoning", "toolsets"];
  for (const [key, value] of Object.entries(values)) {
    if (!allowed.includes(key) || text(value).startsWith("-"))
      throw new Error(`Unsupported effective configuration field: ${key}`);
  }
  // Config/env discovery remains the host's responsibility. Never turn a denied tool, trust
  // prompt, disabled extension or session-only permission into a broader process default.
  const args: string[] = [];
  if (request.host === "pi") {
    args.push("--mode", "json", "-p", "--no-session");
    for (const [key, value] of Object.entries(values)) args.push(`--${key}`, value);
    args.push("--", prompt);
  } else {
    if (values.profile) args.push("--profile", values.profile);
    args.push("chat", "--in", cwd, "--query-file");
    // runProcess appends the temporary packet path, then the remaining flags.
    for (const [key, value] of Object.entries(values))
      if (key !== "profile") args.push(`--${key}`, value);
    args.push("--oneshot", "--format", "stream-json");
  }
  plan.process = { executable: request.host, args, prompt_file: request.host === "hermes" };
  return plan;
}

export interface TransportResult {
  schema: 1;
  host: Host;
  attempt_id: string;
  handle: string;
  terminal: true;
  exit_code: number | null;
  signal: string | null;
  interrupted: boolean;
  result_ref: string;
  result_present: boolean;
  stdout_ref: string;
  stderr_ref: string;
}
async function superviseProcess(plan: WorkerPlan, signal?: AbortSignal): Promise<TransportResult> {
  if (!plan.process || plan.native) throw new Error("Native plans must use the host's own tool");
  if (process.platform !== "linux")
    throw new Error("Process-tree supervision requires a verified Linux subreaper route");
  const { dlopen, FFIType } = await import("bun:ffi");
  const libc = dlopen("libc.so.6", {
    prctl: {
      args: [FFIType.i32, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64],
      returns: FFIType.i32,
    },
    pidfd_open: { args: [FFIType.i32, FFIType.u32], returns: FFIType.i32 },
    pidfd_send_signal: {
      args: [FFIType.i32, FFIType.i32, FFIType.ptr, FFIType.u32],
      returns: FFIType.i32,
    },
    close: { args: [FFIType.i32], returns: FFIType.i32 },
  });
  if (libc.symbols.prctl(36, 1, 0, 0, 0) !== 0) {
    libc.close();
    throw new Error("Cannot enable dedicated child subreaper");
  }
  const ownFd = libc.symbols.pidfd_open(process.pid, 0);
  if (ownFd < 0 || libc.symbols.pidfd_send_signal(ownFd, 0, null, 0) !== 0) {
    if (ownFd >= 0) libc.symbols.close(ownFd);
    libc.close();
    throw new Error("Cannot use stable process descriptors");
  }
  libc.symbols.close(ownFd);
  if (signal?.aborted) throw new Error("Cancelled before spawn; no child created");
  const current = JSON.parse(
    await readFile(await safePath(plan.cwd, plan.state_path), "utf8"),
  ) as State;
  if (
    current.status !== "dispatching" ||
    current.active?.attempt_id !== plan.attempt_id ||
    current.active.handle !== null ||
    current.stop_requested ||
    current.run_id !== plan.run_id
  )
    throw new Error("Dispatch changed before process launch");
  // This dedicated supervisor has no unrelated children. Detached grandchildren are adopted
  // when their parent exits, so they remain observable even after changing process groups.
  const stat = async (pid: number) => {
    const raw = await readFile(`/proc/${pid}/stat`, "utf8");
    const fields = raw.slice(raw.lastIndexOf(")") + 2).split(" ");
    return { pid, state: fields[0], parent: Number(fields[1]), start: fields[19] };
  };
  const processTable = async () => {
    const seen = new Set<number>();
    const rows: Awaited<ReturnType<typeof stat>>[] = [];
    const visit = async (pid: number) => {
      if (seen.has(pid)) return;
      seen.add(pid);
      const exited = (error: unknown) => {
        // Exits during traversal are reconciled by another scan. Unreadable ownership is a
        // capability error, never an empty tree or permission to release the stage.
        if (!["ENOENT", "ESRCH"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
      };
      let threads: string[];
      try {
        threads = await readdir(`/proc/${pid}/task`);
      } catch (error) {
        exited(error);
        return;
      }
      for (const tid of threads) {
        let ids: string;
        try {
          ids = await readFile(`/proc/${pid}/task/${tid}/children`, "utf8");
        } catch (error) {
          exited(error);
          continue;
        }
        for (const id of ids.trim().split(/\s+/).filter(Boolean)) {
          const child = Number(id);
          try {
            const row = await stat(child);
            if (row.parent !== pid) continue;
            if (row.state !== "Z") rows.push(row);
            await visit(child);
          } catch (error) {
            exited(error);
          }
        }
      }
    };
    await visit(process.pid);
    return rows;
  };
  await processTable(); // No work starts unless descendant ownership can be observed.
  const artifact = await safePath(plan.cwd, plan.artifact_ref);
  await mkdir(artifact); // Exclusive per attempt: never overwrite earlier output.
  let temp: string | undefined;
  let stdout: FileHandle | undefined;
  let stderr: FileHandle | undefined;
  let groupTerminal = false;
  let interrupted = false;
  let pid: number | undefined;
  let hostChild: ReturnType<typeof spawn> | undefined;
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    interrupted = true;
    hostChild?.kill("SIGTERM");
    killTimer ??= setTimeout(() => hostChild?.kill("SIGKILL"), 1000);
  };
  const finishGroup = async () => {
    const deadline = Date.now() + 5000;
    let emptyScans = 0;
    while (true) {
      const owned = await processTable();
      emptyScans = owned.length ? 0 : emptyScans + 1;
      if (emptyScans === 2) break;
      for (const row of owned) {
        const fd = libc.symbols.pidfd_open(row.pid, 0);
        try {
          const current = await stat(row.pid);
          if (current.start !== row.start || current.state === "Z") continue;
          if (fd < 0 || libc.symbols.pidfd_send_signal(fd, 9, null, 0) !== 0) {
            const after = await stat(row.pid);
            if (after.start === row.start && after.state !== "Z" && after.state !== "X")
              throw new Error("Cannot terminate owned process through stable descriptor");
          }
        } catch (error) {
          if (!["ENOENT", "ESRCH"].includes((error as NodeJS.ErrnoException).code ?? ""))
            throw error;
        } finally {
          if (fd >= 0) libc.symbols.close(fd);
        }
      }
      if (Date.now() >= deadline)
        throw new Error("Owned process tree is not terminal; retain ownership");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    groupTerminal = true;
  };
  try {
    stdout = await open(join(artifact, "stdout.log"), "wx", 0o600);
    stderr = await open(join(artifact, "stderr.log"), "wx", 0o600);
    temp = await mkdtemp(join(tmpdir(), "pf-feature-worker-"));
    const args = [...plan.process.args];
    if (plan.process.prompt_file) {
      const path = join(temp, "brief.txt");
      await writeFile(path, plan.prompt, { mode: 0o600, flag: "wx" });
      args.splice(args.indexOf("--query-file") + 1, 0, path);
    }
    const child = spawn(plan.process.executable, args, {
      cwd: plan.cwd,
      shell: false,
      detached: true,
      stdio: ["ignore", stdout.fd, stderr.fd],
    });
    hostChild = child;
    const closed = new Promise<{ code: number | null; signal: string | null }>(
      (resolve, reject) => {
        child.once("error", reject);
        child.once("close", (code, name) => resolve({ code, signal: name }));
      },
    );
    // Avoid an unhandled rejection if spawn fails before binding completes.
    void closed.catch(() => {});
    await new Promise<void>((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    pid = child.pid;
    const handle = `process:${pid}:${plan.attempt_id}`;
    try {
      await writeFile(
        join(artifact, "launch.json"),
        `${JSON.stringify(
          {
            schema: 1,
            host: plan.host,
            run_id: plan.run_id,
            attempt_id: plan.attempt_id,
            handle,
            pid,
            runner_pid: process.pid,
            started_at: new Date().toISOString(),
          },
          null,
          2,
        )}\n`,
        { flag: "wx", mode: 0o600 },
      );
      await operate({
        action: "bind",
        cwd: plan.cwd,
        state_path: plan.state_path,
        input: { attempt_id: plan.attempt_id, handle },
      });
    } catch (error) {
      cancel();
      await closed;
      throw error;
    }
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) cancel();
    const terminal = await closed;
    // A child shell may outlive the host leader; remove owned background processes as well.
    await finishGroup();
    let resultPresent = false;
    try {
      const result = JSON.parse(await readFile(await safePath(plan.cwd, plan.result_ref), "utf8"));
      resultPresent =
        result.schema === 1 &&
        result.attempt_id === plan.attempt_id &&
        result.run_id === plan.run_id;
    } catch {
      /* Preserve raw output; parent diagnoses missing/malformed results. */
    }
    const result: TransportResult = {
      schema: 1,
      host: plan.host,
      attempt_id: plan.attempt_id,
      handle,
      terminal: true,
      exit_code: terminal.code,
      signal: terminal.signal,
      interrupted,
      result_ref: plan.result_ref,
      result_present: resultPresent,
      stdout_ref: `${plan.artifact_ref}/stdout.log`,
      stderr_ref: `${plan.artifact_ref}/stderr.log`,
    };
    const path = join(artifact, "transport.json");
    const sibling = `${path}.${randomUUID()}.tmp`;
    await writeFile(sibling, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    await rename(sibling, path);
    return result;
  } finally {
    signal?.removeEventListener("abort", cancel);
    if (killTimer) clearTimeout(killTimer);
    try {
      if (pid && !groupTerminal) await finishGroup();
    } finally {
      await stdout?.close();
      await stderr?.close();
      if (temp) await rm(temp, { recursive: true, force: true });
      libc.close();
    }
  }
}

// A dedicated supervisor is necessary: child adoption must never include unrelated children of
// a caller importing this module, or change that caller's process-wide reaping policy.
export async function runProcess(plan: WorkerPlan, signal?: AbortSignal): Promise<TransportResult> {
  if (!plan.process || plan.native) throw new Error("Native plans must use the host's own tool");
  if (process.platform !== "linux")
    throw new Error("Process-tree supervision requires a verified Linux subreaper route");
  if (signal?.aborted) throw new Error("Cancelled before spawn; no child created");
  const temp = await mkdtemp(join(tmpdir(), "pf-feature-supervisor-"));
  let child: Bun.Subprocess<"ignore", "pipe", "pipe"> | undefined;
  const cancel = () => child?.kill("SIGTERM");
  try {
    const file = join(temp, "plan.json");
    await writeFile(file, JSON.stringify(plan), { flag: "wx", mode: 0o600 });
    child = Bun.spawn([process.execPath, import.meta.path, "supervise", file], {
      cwd: plan.cwd,
      detached: true,
      env: { ...process.env },
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) cancel();
    const [exit, output, error] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    if (exit !== 0) throw new Error(`Host supervisor failed: ${error.trim()}`);
    return JSON.parse(output) as TransportResult;
  } finally {
    signal?.removeEventListener("abort", cancel);
    await rm(temp, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const [mode, file] = Bun.argv.slice(2);
  if (!["plan", "run", "supervise"].includes(mode ?? "") || !file)
    throw new Error("Usage: bun host-worker.ts <plan|run> /absolute/request.json");
  const input = JSON.parse(await readFile(file, "utf8"));
  const plan =
    mode === "supervise" ? (input as WorkerPlan) : await prepareWorker(input as WorkerRequest);
  if (mode === "plan") console.log(JSON.stringify(plan));
  else {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    process.on("SIGINT", cancel);
    process.on("SIGTERM", cancel);
    try {
      console.log(
        JSON.stringify(
          await (mode === "supervise" ? superviseProcess : runProcess)(plan, controller.signal),
        ),
      );
    } finally {
      process.removeListener("SIGINT", cancel);
      process.removeListener("SIGTERM", cancel);
    }
  }
}
