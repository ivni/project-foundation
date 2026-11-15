#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const ROLES = ["build", "fix", "investigate", "ui", "advisor", "review"] as const;
export type Role = (typeof ROLES)[number];
export type Level = 1 | 2 | 3 | 4;
export type Relative = 1 | 2 | 3;
export interface Effort {
  name: string;
  level: Level;
  cost: Relative;
  latency: Relative;
  basis: string;
}
export interface Candidate {
  id: string;
  host: string;
  model: string;
  route: "native" | "review-loop";
  loop?: "run-codex-review-loop" | "run-claude-review-loop" | "run-qwen-review-loop";
  capability: Level;
  basis: string;
  efforts: Effort[];
}
export interface Profile {
  schema: 2;
  candidates: Candidate[];
  roles: Record<Role, string[]>;
}
export interface Task {
  role: Role;
  complexity: Level;
  uncertainty: Level;
  risk: Level;
  rationale: string;
}
export interface Available {
  id: string;
  host: string;
  model: string;
  route: Candidate["route"];
  loop?: NonNullable<Candidate["loop"]>;
  efforts: string[];
}
export interface Exclusion {
  id: string;
  effort?: string;
}
export interface Selection {
  profile_sha256: string;
  task: Task;
  required_level: Level;
  candidate: Candidate;
  effort: Effort;
  eligible_pairs: number;
  reason: string;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected object");
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 2000 || /[\r\n\0]/.test(value))
    throw new Error("Expected bounded single-line text");
  return value;
}
function keys(value: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new Error("Unknown field");
}
function level(value: unknown, maximum = 4): Level {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > maximum)
    throw new Error(`Expected integer level 1..${maximum}`);
  return value as Level;
}
function role(value: unknown): Role {
  if (!ROLES.includes(value as Role)) throw new Error("Unknown role");
  return value as Role;
}
function route(
  v: Record<string, unknown>,
): Pick<Candidate, "id" | "host" | "model" | "route" | "loop"> {
  const result: Pick<Candidate, "id" | "host" | "model" | "route" | "loop"> = {
    id: string(v.id),
    host: string(v.host),
    model: string(v.model),
    route: v.route as Candidate["route"],
  };
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(result.id)) throw new Error("Invalid candidate ID");
  if (v.route === "review-loop") {
    if (
      !["run-codex-review-loop", "run-claude-review-loop", "run-qwen-review-loop"].includes(
        String(v.loop),
      )
    )
      throw new Error("Unsupported review loop");
    result.loop = v.loop as NonNullable<Candidate["loop"]>;
  } else if (v.route !== "native" || v.loop !== undefined)
    throw new Error("Invalid candidate route");
  return result;
}
function identity(c: Pick<Candidate, "host" | "model" | "route" | "loop">): string {
  return JSON.stringify([c.host, c.model, c.route, c.loop ?? null]);
}
function effort(value: unknown): Effort {
  const v = object(value);
  keys(v, ["name", "level", "cost", "latency", "basis"]);
  return {
    name: string(v.name),
    level: level(v.level),
    cost: level(v.cost, 3) as Relative,
    latency: level(v.latency, 3) as Relative,
    basis: string(v.basis),
  };
}
export function candidate(value: unknown): Candidate {
  const v = object(value);
  keys(v, ["id", "host", "model", "route", "loop", "capability", "basis", "efforts"]);
  if (!Array.isArray(v.efforts) || !v.efforts.length)
    throw new Error("Expected explicit effort options");
  const efforts = v.efforts.map(effort);
  if (new Set(efforts.map((e) => e.name)).size !== efforts.length)
    throw new Error("Duplicate effort");
  if (v.route === "review-loop" && efforts.length !== 1)
    throw new Error("Review loop must retain its single pinned effort");
  return { ...route(v), capability: level(v.capability), basis: string(v.basis), efforts };
}
export function profile(value: unknown): Profile {
  const v = object(value);
  keys(v, ["schema", "candidates", "roles"]);
  if (v.schema !== 2 || !Array.isArray(v.candidates) || !v.candidates.length)
    throw new Error(
      "Expected profile schema 2; legacy ratings profiles require explicit reconfiguration",
    );
  const candidates = v.candidates.map(candidate);
  if (new Set(candidates.map((c) => c.id)).size !== candidates.length)
    throw new Error("Duplicate candidate");
  if (new Set(candidates.map(identity)).size !== candidates.length)
    throw new Error("Duplicate candidate identity");
  const mapping = object(v.roles);
  keys(mapping, [...ROLES]);
  const roles = {} as Profile["roles"];
  for (const name of ROLES) {
    const list = mapping[name];
    if (!Array.isArray(list) || !list.length || new Set(list).size !== list.length)
      throw new Error(`Expected unique approved candidates for ${name}`);
    roles[name] = list.map((id) => {
      const c = candidates.find((item) => item.id === id);
      if (!c || (name === "review" ? c.route !== "review-loop" : c.route !== "native"))
        throw new Error(`Invalid route for ${name}`);
      return c.id;
    });
  }
  return { schema: 2, candidates, roles };
}
export function profileDigest(value: Profile): string {
  return createHash("sha256")
    .update(JSON.stringify(profile(value)))
    .digest("hex");
}
export function assess(value: unknown): Task {
  const v = object(value);
  keys(v, ["role", "complexity", "uncertainty", "risk", "rationale"]);
  return {
    role: role(v.role),
    complexity: level(v.complexity),
    uncertainty: level(v.uncertainty),
    risk: level(v.risk),
    rationale: string(v.rationale),
  };
}
export function requiredLevel(value: Task): Level {
  const t = assess(value);
  return Math.max(t.complexity, t.uncertainty, t.risk) as Level;
}
function availability(value: unknown): Available {
  const v = object(value);
  keys(v, ["id", "host", "model", "route", "loop", "efforts"]);
  if (!Array.isArray(v.efforts) || !v.efforts.length) throw new Error("Expected observed efforts");
  const efforts = v.efforts.map(string);
  if (new Set(efforts).size !== efforts.length) throw new Error("Duplicate observed effort");
  return { ...route(v), efforts };
}
function exclusion(value: unknown): Exclusion {
  const v = object(value);
  keys(v, ["id", "effort"]);
  const result: Exclusion = { id: string(v.id) };
  if (v.effort !== undefined) result.effort = string(v.effort);
  return result;
}
export function select(
  approved: Profile,
  job: Task,
  available: Available[],
  excluded: Exclusion[] = [],
): Selection {
  const p = profile(approved);
  const task = assess(job);
  const required = requiredLevel(task);
  const observed = available.map(availability);
  if (new Set(observed.map((c) => c.id)).size !== observed.length)
    throw new Error("Duplicate observed candidate");
  const skip = excluded.map(exclusion);
  const pairs: { candidate: Candidate; effort: Effort; order: number }[] = [];
  for (const [order, id] of p.roles[task.role].entries()) {
    const c = p.candidates.find((entry) => entry.id === id) as Candidate;
    const live = observed.find((entry) => entry.id === id && identity(entry) === identity(c));
    if (!live || c.capability < required) continue;
    for (const e of c.efforts) {
      if (
        e.level < required ||
        !live.efforts.includes(e.name) ||
        skip.some((x) => x.id === id && (x.effort === undefined || x.effort === e.name))
      )
        continue;
      pairs.push({ candidate: c, effort: e, order });
    }
  }
  if (!pairs.length)
    throw new Error(`No approved available model/effort meets ${task.role} level ${required}`);
  pairs.sort(
    (a, b) =>
      a.effort.cost - b.effort.cost ||
      a.effort.latency - b.effort.latency ||
      a.effort.level - b.effort.level ||
      a.order - b.order,
  );
  const best = pairs[0] as (typeof pairs)[number];
  return {
    profile_sha256: profileDigest(p),
    task,
    required_level: required,
    candidate: best.candidate,
    effort: best.effort,
    eligible_pairs: pairs.length,
    reason: `Minimum capability/effort ${required}; relative cost first, latency second, then lowest sufficient effort and approved model order`,
  };
}

if (import.meta.main) {
  try {
    if (process.argv.length !== 3) throw new Error("Usage: bun model-routing.ts REQUEST.json");
    const request = object(JSON.parse(await readFile(process.argv[2] as string, "utf8")));
    let result: unknown;
    if (request.action === "validate") {
      keys(request, ["action", "profile"]);
      const p = profile(request.profile);
      result = { profile: p, profile_sha256: profileDigest(p) };
    } else if (request.action === "select") {
      keys(request, ["action", "profile", "task", "available", "excluded"]);
      if (
        !Array.isArray(request.available) ||
        (request.excluded !== undefined && !Array.isArray(request.excluded))
      )
        throw new Error("Invalid selection inputs");
      result = select(
        profile(request.profile),
        assess(request.task),
        request.available.map(availability),
        ((request.excluded ?? []) as unknown[]).map(exclusion),
      );
    } else throw new Error("Unknown routing action; ratings are not supported");
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
