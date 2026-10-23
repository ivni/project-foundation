#!/usr/bin/env bun
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, open, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { operate, type State, safePath } from "./orchestrator.ts";
import { ownedProcessTree } from "./process-tree.ts";
import { readTreeSnapshot } from "./tree-snapshot.ts";
import { type Assessment, digest, shortText } from "./watchdog.ts";

export interface CommandRequest {
  cwd: string;
  state_path: string;
  run_id: string;
  attempt_id: string;
  argv: string[];
  phase: string;
  summary: string;
  timeout_ms?: number;
  directory?: string;
  context?: string;
}
export interface CommandResult {
  run_id: string;
  attempt_id: string;
  operation_id: string;
  terminal: true;
  interrupted: boolean;
  exit_code: number | null;
  stdout_ref: string;
  stderr_ref: string;
  evidence_ref: string;
  watchdog?: Assessment;
  instruction: string | null;
}
async function tail(path: string): Promise<string> {
  const file = await open(path, "r");
  try {
    const size = (await file.stat()).size;
    const data = Buffer.alloc(Math.min(size, 8192));
    const { bytesRead } = await file.read(data, 0, data.length, Math.max(0, size - data.length));
    return data.subarray(0, bytesRead).toString();
  } finally {
    await file.close();
  }
}
export function failureFingerprint(code: number | null, output: string): string {
  return digest([
    code,
    stripVTControlCharacters(output)
      .replace(/\b\d{4}-\d\d-\d\dT[\d:.]+Z\b/g, "<time>")
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>")
      .replace(/\b\d+(?:\.\d+)?\s*(?:ms|seconds?|secs?)\b/g, "<duration>")
      .trim(),
  ]);
}
async function executeCommand(
  request: CommandRequest,
  tree: Awaited<ReturnType<typeof ownedProcessTree>>,
  signal: AbortSignal,
) {
  const cwd = await realpath(request.cwd);
  const statePath = await safePath(cwd, request.state_path);
  const current = () => readFile(statePath, "utf8").then((text) => JSON.parse(text) as State);
  let state = await current();
  for (
    let retry = 0;
    retry < 200 &&
    state.status === "dispatching" &&
    state.run_id === request.run_id &&
    state.active?.attempt_id === request.attempt_id &&
    !state.stop_requested;
    retry++
  ) {
    await Bun.sleep(25);
    state = await current();
  }
  if (
    state.checkout !== cwd ||
    state.run_id !== request.run_id ||
    state.active?.attempt_id !== request.attempt_id ||
    state.status !== "running" ||
    state.stop_requested
  )
    throw new Error("Command does not own the running attempt");
  if (
    !Array.isArray(request.argv) ||
    !request.argv.length ||
    request.argv.some((arg) => typeof arg !== "string" || arg.includes("\0")) ||
    !request.argv[0]
  )
    throw new Error("Expected command argument array without NUL");
  const phase = shortText(request.phase);
  const summary = shortText(request.summary);
  const context = request.context === undefined ? "" : shortText(request.context);
  const directory = request.directory
    ? await realpath(await safePath(cwd, request.directory))
    : cwd;
  const snapshot = readTreeSnapshot(cwd, [resolve(cwd, ".agents/work/features")]);
  if (!snapshot.digest || !snapshot.head)
    throw new Error(`Cannot fingerprint command inputs: ${snapshot.limitation}`);
  const operation = randomUUID();
  const artifactRef = `.agents/work/features/${state.feature_id}.${request.attempt_id}.commands/${operation}`;
  const artifact = await safePath(cwd, artifactRef);
  const timeout = request.timeout_ms ?? state.watchdog?.policy.command_timeout_ms ?? 1_200_000;
  const send = async (event: Record<string, unknown>) => {
    // Polling and command events can contend briefly; never remove or expire another helper's lock.
    for (let retry = 0; ; retry++) {
      try {
        const latest = await current();
        return await operate({
          action: "report",
          cwd,
          state_path: request.state_path,
          input: {
            run_id: request.run_id,
            attempt_id: request.attempt_id,
            event: { ...event, sequence: (latest.watchdog?.sequence ?? 0) + 1 },
          },
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST" || retry >= 20) throw error;
        await Bun.sleep(25);
      }
    }
  };
  await send({
    kind: "operation-start",
    summary,
    operation: {
      id: operation,
      key: digest([request.argv, request.directory ?? ""]),
      inputs: digest([snapshot.head, snapshot.digest, context]),
      phase,
      summary,
      timeout_ms: timeout,
    },
  });
  await mkdir(artifact, { recursive: true });
  const stdout = await open(resolve(artifact, "stdout.log"), "wx", 0o600);
  const stderr = await open(resolve(artifact, "stderr.log"), "wx", 0o600);
  let exitCode: number | null = null;
  let spawnError: string | undefined;
  let child: Bun.Subprocess<"ignore", number, number> | undefined;
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  let monitorTimer: ReturnType<typeof setInterval> | undefined;
  let monitorPending: Promise<void> | undefined;
  let monitorError: unknown;
  let interrupted = false;
  const cancel = () => {
    interrupted = true;
    child?.kill("SIGTERM");
    killTimer ??= setTimeout(() => child?.kill("SIGKILL"), 1000);
  };
  try {
    if (signal.aborted) throw new Error("Command interrupted before launch");
    child = Bun.spawn(request.argv, {
      cwd: directory,
      stdin: "ignore",
      stdout: stdout.fd,
      stderr: stderr.fd,
    });
    await writeFile(
      resolve(artifact, "launch.json"),
      `${JSON.stringify({
        run_id: request.run_id,
        attempt_id: request.attempt_id,
        operation_id: operation,
        pid: child.pid,
        supervisor_pid: process.pid,
        started_at: new Date().toISOString(),
      })}\n`,
      { flag: "wx", mode: 0o600 },
    );
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    monitorTimer = setInterval(() => {
      if (monitorPending) return;
      monitorPending = current()
        .then((latest) => {
          if (latest.run_id !== request.run_id || latest.active?.attempt_id !== request.attempt_id)
            throw new Error("Command lost its recorded owner");
          if (latest.stop_requested) cancel();
        })
        .catch((error) => {
          monitorError = error;
          cancel();
        })
        .finally(() => {
          monitorPending = undefined;
        });
    }, 250);
    exitCode = await child.exited;
  } catch (error) {
    spawnError = String(error);
    await stderr.writeFile(spawnError);
  } finally {
    signal.removeEventListener("abort", cancel);
    if (monitorTimer) clearInterval(monitorTimer);
    await monitorPending;
    if (killTimer) clearTimeout(killTimer);
    // Includes descendants which detached themselves or survived the foreground command.
    await tree.finish();
    await stdout.close();
    await stderr.close();
  }
  const result = {
    run_id: request.run_id,
    attempt_id: request.attempt_id,
    operation_id: operation,
    terminal: true,
    interrupted,
    exit_code: exitCode,
    stdout_ref: `${artifactRef}/stdout.log`,
    stderr_ref: `${artifactRef}/stderr.log`,
  };
  const evidenceRef = `${artifactRef}/result.json`;
  await writeFile(resolve(artifact, "result.json"), `${JSON.stringify(result)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  if (monitorError) throw monitorError;
  const failed = exitCode !== 0 || spawnError !== undefined;
  const failure = failed
    ? failureFingerprint(
        exitCode,
        `${await tail(resolve(artifact, "stderr.log"))}\n${await tail(resolve(artifact, "stdout.log"))}`,
      )
    : undefined;
  const latest = await current();
  const updated = latest.stop_requested
    ? latest
    : await send({
        kind: "operation-end",
        summary,
        operation_id: operation,
        evidence_ref: evidenceRef,
        ...(failure ? { failure } : {}),
      });
  return {
    ...result,
    evidence_ref: evidenceRef,
    watchdog: updated.watchdog?.assessment,
    instruction: updated.watchdog?.nudge?.instruction ?? null,
  };
}
async function superviseCommand(request: CommandRequest, signal: AbortSignal) {
  const tree = await ownedProcessTree();
  try {
    return await executeCommand(request, tree, signal);
  } finally {
    try {
      await tree.finish();
    } finally {
      tree.close();
    }
  }
}
export async function runCommand(request: CommandRequest): Promise<CommandResult> {
  if (process.platform !== "linux")
    throw new Error(
      "Managed commands require a verified Linux subreaper route; use an observed native command lifecycle with equivalent telemetry",
    );
  const temp = await mkdtemp(resolve(tmpdir(), "pf-feature-command-"));
  let child: Bun.Subprocess<"ignore", "pipe", "pipe"> | undefined;
  let stopping = false;
  const cancel = () => {
    stopping = true;
    child?.kill("SIGTERM");
  };
  process.on("SIGINT", cancel);
  process.on("SIGTERM", cancel);
  try {
    const path = resolve(temp, "request.json");
    await writeFile(path, JSON.stringify(request), { flag: "wx", mode: 0o600 });
    child = Bun.spawn([process.execPath, import.meta.path, "supervise", path], {
      cwd: request.cwd,
      detached: true,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
    if (stopping) cancel();
    const [exit, output, error] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    if (exit !== 0) throw new Error(`Command supervisor failed: ${error.trim()}`);
    return JSON.parse(output) as CommandResult;
  } finally {
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
    await rm(temp, { recursive: true, force: true });
  }
}
if (import.meta.main) {
  const supervising = Bun.argv[2] === "supervise";
  const file = Bun.argv[supervising ? 3 : 2];
  if (!file) throw new Error("Usage: bun worker-command.ts /absolute/request.json");
  const request = JSON.parse(await readFile(file, "utf8")) as CommandRequest;
  if (supervising) {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    process.on("SIGINT", cancel);
    process.on("SIGTERM", cancel);
    try {
      console.log(JSON.stringify(await superviseCommand(request, controller.signal)));
    } finally {
      process.removeListener("SIGINT", cancel);
      process.removeListener("SIGTERM", cancel);
    }
  } else {
    const result = await runCommand(request);
    console.log(JSON.stringify(result));
    process.exitCode = result.exit_code ?? 1;
  }
}
