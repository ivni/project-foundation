import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  type Available,
  assess,
  type Candidate,
  type Effort,
  type Profile,
  profile,
  profileDigest,
  requiredLevel,
  select,
  type Task,
} from "../packages/run-feature-models/scripts/model-routing.ts";

function effort(
  name: string,
  level: Effort["level"],
  cost: Effort["cost"],
  latency: Effort["latency"],
): Effort {
  return { name, level, cost, latency, basis: "Fixture estimate, not a live model claim" };
}
const a: Candidate = {
  id: "economy",
  host: "test-app",
  model: "model-a",
  route: "native",
  capability: 2,
  basis: "Fixture capability",
  efforts: [effort("low", 1, 1, 2), effort("medium", 2, 1, 3), effort("high", 3, 2, 3)],
};
const b: Candidate = {
  ...a,
  id: "strong",
  model: "model-b",
  capability: 4,
  efforts: [
    effort("low", 1, 2, 2),
    effort("medium", 2, 2, 2),
    effort("high", 3, 2, 2),
    effort("xhigh", 4, 3, 3),
  ],
};
const c: Candidate = {
  ...b,
  id: "fast",
  model: "model-c",
  efforts: [effort("low", 1, 1, 1), effort("high", 3, 3, 1), effort("xhigh", 4, 3, 2)],
};
const review: Candidate = {
  ...b,
  id: "review",
  route: "review-loop",
  loop: "run-codex-review-loop",
  efforts: [effort("pinned", 4, 3, 3)],
};
const configured: Profile = {
  schema: 2,
  candidates: [a, b, c, review],
  roles: {
    build: ["economy", "strong", "fast"],
    fix: ["economy", "strong"],
    investigate: ["strong"],
    ui: ["strong", "fast"],
    advisor: ["strong", "fast"],
    review: ["review"],
  },
};
function live(c: Candidate): Available {
  return {
    id: c.id,
    host: c.host,
    model: c.model,
    route: c.route,
    ...(c.loop ? { loop: c.loop } : {}),
    efforts: c.efforts.map((e) => e.name),
  };
}
const all = configured.candidates.map(live);
const simple: Task = {
  role: "build",
  complexity: 1,
  uncertainty: 1,
  risk: 1,
  rationale: "Known local reversible change",
};
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "pf-model-routing-"));
  roots.push(root);
  return root;
}

test("simple work selects the cheapest adequate model, then the fastest at equal cost", () => {
  const choice = select(configured, simple, all);
  expect(choice.candidate.id).toBe("fast");
  expect(choice.effort.name).toBe("low");
  expect(choice.effort.cost).toBe(1);
  expect(choice.required_level).toBe(1);
  expect(
    select(
      configured,
      simple,
      all.filter((x) => x.id !== "fast"),
    ).candidate.id,
  ).toBe("economy");
});

test("the same model receives different explicit efforts for different job demand", () => {
  const available = [live(b)];
  expect(select(configured, simple, available).effort.name).toBe("low");
  expect(select(configured, { ...simple, complexity: 2 }, available).effort.name).toBe("medium");
  expect(select(configured, { ...simple, complexity: 3 }, available).effort.name).toBe("high");
  expect(select(configured, { ...simple, complexity: 4 }, available).effort.name).toBe("xhigh");
});

test("quality floors precede economy, high effort cannot rescue an inadequate model", () => {
  const task = { ...simple, complexity: 3 as const };
  const choice = select(configured, task, all);
  expect(choice.candidate.id).toBe("strong");
  expect(choice.effort.name).toBe("high");
  expect(() => select(configured, task, [live(a)])).toThrow("No approved available");
  expect(() => select(configured, task, [{ ...live(b), efforts: ["low", "medium"] }])).toThrow(
    "No approved available",
  );
});

test("high risk or uncertainty raises demand even for a one-line task", () => {
  for (const task of [
    { ...simple, risk: 3 as const },
    { ...simple, uncertainty: 3 as const },
  ]) {
    expect(requiredLevel(task)).toBe(3);
    expect(select(configured, task, all).effort.level).toBeGreaterThanOrEqual(3);
    expect(select(configured, task, all).candidate.capability).toBeGreaterThanOrEqual(3);
  }
  expect(select(configured, { ...simple, risk: 4 }, all).effort.name).toBe("xhigh");
});

test("cost wins over latency and equal estimates prefer the lowest sufficient effort", () => {
  const choice = select(configured, { ...simple, complexity: 3 }, all);
  expect(choice.candidate.id).toBe("strong"); // cost 2 / latency 2 beats fast cost 3 / latency 1.
  expect(select(configured, { ...simple, role: "ui" }, [live(b)]).effort.name).toBe("low");
  const tied = {
    ...configured,
    candidates: configured.candidates.map((x) =>
      x.id === "economy" ? { ...x, efforts: [effort("low", 1, 1, 1)] } : x,
    ),
  };
  expect(select(tied, simple, all).candidate.id).toBe("economy");
});

test("availability uses exact host, model, route, reviewer and effort identifiers", () => {
  for (const changed of [
    { ...live(b), model: "unapproved" },
    { ...live(b), host: "other-app" },
    { ...live(b), efforts: ["HIGH"] },
  ])
    expect(() => select(configured, simple, [changed])).toThrow("No approved available");
  expect(() =>
    select(configured, { ...simple, role: "review" }, [
      { ...live(review), loop: "run-claude-review-loop" },
    ]),
  ).toThrow("No approved available");
  expect(() => select(configured, simple, [live(b), live(b)])).toThrow("Duplicate observed");
});

test("pair-specific fallback and model-wide quota exclusions preserve demand and authorization", () => {
  expect(select(configured, simple, [live(b)], [{ id: "strong", effort: "low" }]).effort.name).toBe(
    "medium",
  );
  expect(select(configured, simple, all, [{ id: "fast" }]).candidate.id).toBe("economy");
  expect(() =>
    select(configured, { ...simple, complexity: 3 }, all, [{ id: "strong" }, { id: "fast" }]),
  ).toThrow("level 3");
  expect(() => select(configured, simple, [live(b)], [{ id: "strong" }])).toThrow(
    "No approved available",
  );
});

test("review uses its installed pinned effort rather than economizing away isolation/profile", () => {
  expect(select(configured, { ...simple, role: "review" }, all).effort.name).toBe("pinned");
  expect(() =>
    profile({
      ...configured,
      candidates: configured.candidates.map((x) =>
        x.id === "review" ? { ...x, efforts: [...x.efforts, effort("low", 1, 1, 1)] } : x,
      ),
    }),
  ).toThrow("single pinned effort");
  expect(() =>
    profile({ ...configured, roles: { ...configured.roles, build: ["review"] } }),
  ).toThrow("Invalid route");
});

test("invalid estimates, unsupported policy fields and legacy profiles fail instead of inventing defaults", () => {
  expect(() => profile({ ...configured, schema: 1 })).toThrow("reconfiguration");
  expect(() => profile({ ...configured, ratings: [] })).toThrow("Unknown field");
  expect(() =>
    profile({ ...configured, candidates: [{ ...a, capability: 0 }, b, c, review] }),
  ).toThrow("level");
  expect(() => profile({ ...configured, candidates: [{ ...a, basis: "" }, b, c, review] })).toThrow(
    "text",
  );
  expect(() =>
    profile({
      ...configured,
      candidates: [{ ...a, efforts: [{ ...a.efforts[0], cost: 0 }] }, b, c, review],
    }),
  ).toThrow("level");
  expect(() => assess({ ...simple, risk: 5 })).toThrow("level");
  expect(() => assess({ ...simple, rationale: "" })).toThrow("text");
  expect(profileDigest(configured)).not.toBe(
    profileDigest({
      ...configured,
      roles: { ...configured.roles, build: ["strong", "economy", "fast"] },
    }),
  );
});

test.each([
  "run-feature-models",
  "run-phase-models",
])("%s CLI selects model+effort and rejects the removed rating interface", async (name) => {
  const root = await fixture();
  const request = join(root, "request.json");
  const helper = resolve(`packages/${name}/scripts/model-routing.ts`);
  await writeFile(
    request,
    JSON.stringify({
      action: "select",
      profile: configured,
      task: { ...simple, complexity: 3 },
      available: all,
    }),
  );
  const run = Bun.spawnSync([process.execPath, helper, request]);
  expect(run.exitCode).toBe(0);
  expect(JSON.parse(run.stdout.toString())).toMatchObject({
    candidate: { id: "strong" },
    effort: { name: "high" },
    required_level: 3,
  });
  await writeFile(
    request,
    JSON.stringify({ action: "record", ratings_path: join(root, "ratings.json") }),
  );
  expect(Bun.spawnSync([process.execPath, helper, request]).exitCode).toBe(1);
  expect(await Bun.file(join(root, "ratings.json")).exists()).toBe(false);
});
