import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  checkoutLease,
  type LeaseRequest,
  withCheckoutLease,
} from "../packages/run-feature/scripts/checkout-lease.ts";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function fixture() {
  const cwd = await realpath(await mkdtemp(join(tmpdir(), "pf-checkout-lease-")));
  roots.push(cwd);
  const init = Bun.spawnSync(["git", "init", "-q"], { cwd });
  if (init.exitCode) throw new Error(init.stderr.toString());
  await mkdir(join(cwd, ".agents/work/features"), { recursive: true });
  return cwd;
}
function request(cwd: string, mode: LeaseRequest["mode"], runId = mode): LeaseRequest {
  return {
    action: "claim",
    cwd,
    run_id: runId,
    mode,
    state_path: `.agents/work/features/${runId}.json`,
    owner: `host-${runId}`,
  };
}

test("concurrent claims by all workflow modes produce exactly one checkout owner", async () => {
  const cwd = await fixture();
  const modes = ["run-feature", "run-feature-direct", "run-phase", "run-phase-direct"] as const;
  const requests = modes.map((mode) => request(cwd, mode));
  const results = await Promise.allSettled(requests.map((req) => checkoutLease(req)));
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  const index = results.findIndex((result) => result.status === "fulfilled");
  const winner = requests[index];
  if (!winner) throw new Error("Missing winner");
  const saved = JSON.parse(
    await readFile(join(cwd, ".agents/work/checkout-lease/owner.json"), "utf8"),
  );
  expect(saved.run_id).toBe(winner.run_id);
  for (const other of requests.filter((_, i) => i !== index)) {
    await expect(checkoutLease({ ...other, action: "claim" })).rejects.toThrow();
    await expect(checkoutLease({ ...other, action: "release" })).rejects.toThrow();
  }
  await expect(checkoutLease({ ...winner, action: "release" })).rejects.toThrow();
  await writeFile(
    join(cwd, winner.state_path),
    JSON.stringify({ run_id: winner.run_id, status: "completed" }),
  );
  await checkoutLease({ ...winner, action: "release" });
  const next = requests[(index + 1) % requests.length];
  if (!next) throw new Error("Missing next contender");
  expect((await checkoutLease(next)).run_id).toBe(next.run_id);
});

test("separate helper processes cannot claim the same checkout", async () => {
  const cwd = await fixture();
  const modes = ["run-feature", "run-feature-direct", "run-phase", "run-phase-direct"] as const;
  const files = await Promise.all(
    modes.map(async (mode, index) => {
      const path = join(cwd, `request-${index}.json`);
      await writeFile(path, JSON.stringify(request(cwd, mode)));
      return path;
    }),
  );
  const helper = resolve("packages/run-feature/scripts/checkout-lease.ts");
  const children = files.map((file) =>
    Bun.spawn([process.execPath, helper, file], { stdout: "pipe", stderr: "pipe" }),
  );
  const results = await Promise.all(children.map((child) => child.exited));
  expect(results.filter((code) => code === 0)).toHaveLength(1);
  const owner = JSON.parse(
    await readFile(join(cwd, ".agents/work/checkout-lease/owner.json"), "utf8"),
  );
  expect(modes).toContain(owner.mode);
});

test("an active owner cannot release, and a partial reservation never expires", async () => {
  const cwd = await fixture();
  const req = request(cwd, "run-feature-direct");
  await checkoutLease(req);
  await writeFile(
    join(cwd, req.state_path),
    JSON.stringify({ run_id: req.run_id, status: "active" }),
  );
  await expect(checkoutLease({ ...req, action: "release" })).rejects.toThrow("active owner");
  await writeFile(
    join(cwd, req.state_path),
    JSON.stringify({ run_id: req.run_id, status: "interrupted" }),
  );
  await checkoutLease({ ...req, action: "release" });
  await mkdir(join(cwd, ".agents/work/checkout-lease"));
  await expect(checkoutLease(req)).rejects.toThrow();
  await expect(checkoutLease({ ...req, action: "assert" })).rejects.toThrow();
});

test("dispatch reservation and lease release cannot run concurrently", async () => {
  const cwd = await fixture();
  const req = request(cwd, "run-feature");
  await checkoutLease(req);
  let notifyEntered: (() => void) | undefined;
  let releaseGuard: (() => void) | undefined;
  const entered = new Promise<void>((resolve) => {
    notifyEntered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    releaseGuard = resolve;
  });
  const dispatch = withCheckoutLease({ ...req, action: "assert" }, async () => {
    notifyEntered?.();
    await gate;
    await writeFile(
      join(cwd, req.state_path),
      JSON.stringify({ run_id: req.run_id, status: "dispatching", active: { handle: null } }),
    );
  });
  await entered;
  await expect(checkoutLease({ ...req, action: "release" })).rejects.toThrow();
  releaseGuard?.();
  await dispatch;
  await expect(checkoutLease({ ...req, action: "release" })).rejects.toThrow("active owner");
  await writeFile(
    join(cwd, req.state_path),
    JSON.stringify({ run_id: req.run_id, status: "cancelled" }),
  );
  await checkoutLease({ ...req, action: "release" });
});
