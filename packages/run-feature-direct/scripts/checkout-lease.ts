#!/usr/bin/env bun
import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

type Mode = "run-feature" | "run-phase" | "run-feature-direct" | "run-phase-direct";
export interface LeaseRequest {
  action: "claim" | "assert" | "release";
  cwd: string;
  run_id: string;
  mode: Mode;
  state_path: string;
  owner?: string;
}
interface Lease {
  schema: 1;
  checkout: string;
  run_id: string;
  mode: Mode;
  state_path: string;
  owner: string;
}

function validateId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/.test(value))
    throw new Error("Invalid checkout lease run ID");
  return value;
}
function validateMode(value: unknown): Mode {
  if (
    !["run-feature", "run-phase", "run-feature-direct", "run-phase-direct"].includes(String(value))
  )
    throw new Error("Invalid checkout lease mode");
  return value as Mode;
}
async function containedPath(root: string, value: string): Promise<string> {
  if (!value || isAbsolute(value) || value.split(/[\\/]/).includes(".."))
    throw new Error("Invalid checkout lease path");
  const path = resolve(root, value);
  const rel = relative(root, path);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
    throw new Error("Checkout lease path escapes checkout");
  let ancestor = path;
  while (true) {
    try {
      const actual = await realpath(ancestor);
      const resolved = relative(root, actual);
      if (resolved === ".." || resolved.startsWith(`..${sep}`) || isAbsolute(resolved))
        throw new Error("Checkout lease path escapes checkout through symlink");
      return path;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      ancestor = dirname(ancestor);
    }
  }
}
async function checkout(path: string): Promise<string> {
  const root = await realpath(path);
  const result = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0 || (await realpath(result.stdout.toString().trim())) !== root)
    throw new Error("Use exact checkout root for checkout lease");
  return root;
}
function validRequest(request: LeaseRequest): void {
  validateId(request.run_id);
  validateMode(request.mode);
  if (!["claim", "assert", "release"].includes(request.action))
    throw new Error("Invalid checkout lease action");
}
async function verifyLease(root: string, request: LeaseRequest): Promise<Lease> {
  const path = await containedPath(root, ".agents/work/checkout-lease/owner.json");
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid checkout lease");
  const lease = value as Lease;
  if (
    lease.schema !== 1 ||
    lease.checkout !== root ||
    lease.run_id !== request.run_id ||
    lease.mode !== request.mode ||
    lease.state_path !== request.state_path ||
    typeof lease.owner !== "string" ||
    !lease.owner.trim()
  )
    throw new Error("Checkout lease owner mismatch");
  return lease;
}

async function withGuard<T>(root: string, operation: () => Promise<T>): Promise<T> {
  const work = await containedPath(root, ".agents/work");
  await mkdir(work, { recursive: true });
  const guard = await containedPath(root, ".agents/work/checkout-lease.guard");
  await mkdir(guard);
  try {
    await writeFile(join(guard, "owner.json"), `${JSON.stringify({ pid: process.pid })}\n`, {
      flag: "wx",
      mode: 0o600,
    });
    return await operation();
  } finally {
    await rm(guard, { recursive: true });
  }
}

// Hold the same guard across lease checks and the caller's reservation write. Never time out or
// remove a leftover guard without first establishing who owns it and whether they have stopped.
export async function withCheckoutLease<T>(
  request: LeaseRequest,
  operation: () => Promise<T>,
): Promise<T> {
  validRequest(request);
  const root = await checkout(request.cwd);
  await containedPath(root, request.state_path);
  return withGuard(root, async () => {
    await verifyLease(root, request);
    return operation();
  });
}

export async function checkoutLease(request: LeaseRequest): Promise<Lease> {
  validRequest(request);
  if (request.action === "assert")
    return withCheckoutLease(request, async () => {
      const root = await checkout(request.cwd);
      return verifyLease(root, request);
    });
  const root = await checkout(request.cwd);
  await containedPath(root, request.state_path);
  return withGuard(root, async () => {
    const directory = await containedPath(root, ".agents/work/checkout-lease");
    if (request.action === "claim") {
      if (typeof request.owner !== "string" || !request.owner.trim())
        throw new Error("Actual owner handle required");
      await mkdir(directory); // Atomic, never replace or age out another reservation.
      const lease: Lease = {
        schema: 1,
        checkout: root,
        run_id: request.run_id,
        mode: request.mode,
        state_path: request.state_path,
        owner: request.owner,
      };
      await writeFile(join(directory, "owner.json"), `${JSON.stringify(lease, null, 2)}\n`, {
        flag: "wx",
        mode: 0o600,
      });
      return lease;
    }
    const lease = await verifyLease(root, request);
    const stateFile = await containedPath(root, lease.state_path);
    const state: unknown = JSON.parse(await readFile(stateFile, "utf8"));
    if (state && typeof state === "object" && !Array.isArray(state)) {
      const record = state as Record<string, unknown>;
      if (record.run_id !== lease.run_id) throw new Error("Checkout lease state identity mismatch");
      if (record.active || ["active", "running", "dispatching"].includes(String(record.status)))
        throw new Error("Cannot release checkout lease while state has an active owner");
      if (
        ![
          "ready",
          "awaiting-input",
          "interrupted",
          "cancelled",
          "implemented",
          "complete",
          "completed",
        ].includes(String(record.status))
      )
        throw new Error("Cannot release checkout lease with an unknown owner state");
    } else throw new Error("Invalid owner state");
    const retired = `${directory}.${randomUUID()}.released`;
    await rename(directory, retired);
    await rm(retired, { recursive: true });
    return lease;
  });
}

if (import.meta.main) {
  try {
    if (process.argv.length !== 3) throw new Error("Usage: bun checkout-lease.ts REQUEST.json");
    const request = JSON.parse(await readFile(process.argv[2] as string, "utf8")) as LeaseRequest;
    process.stdout.write(`${JSON.stringify(await checkoutLease(request))}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
