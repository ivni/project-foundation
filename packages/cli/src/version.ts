import { UserFacingError } from "./types.ts";

export interface SemanticVersion {
  major: string;
  minor: string;
  patch: string;
  prerelease: string[];
}

const IDENTIFIER = /^[0-9A-Za-z-]+$/;

export function parseSemanticVersion(version: string): SemanticVersion | undefined {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([^+]+))?(?:\+(.+))?$/.exec(version);
  if (!match) return undefined;
  const prerelease = match[4]?.split(".") ?? [];
  const build = match[5]?.split(".") ?? [];
  if (
    [...prerelease, ...build].some((identifier) => !identifier || !IDENTIFIER.test(identifier)) ||
    prerelease.some(
      (identifier) =>
        /^\d+$/.test(identifier) && identifier.length > 1 && identifier.startsWith("0"),
    )
  ) {
    return undefined;
  }
  return {
    major: match[1] ?? "0",
    minor: match[2] ?? "0",
    patch: match[3] ?? "0",
    prerelease,
  };
}

export function isSemanticVersion(version: string): boolean {
  return parseSemanticVersion(version) !== undefined;
}

function compareNumeric(left: string, right: string): number {
  if (left.length !== right.length) return Math.sign(left.length - right.length);
  return left === right ? 0 : left < right ? -1 : 1;
}

function comparePrerelease(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    if (left.length === right.length) return 0;
    return left.length === 0 ? 1 : -1;
  }
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === undefined || b === undefined) return a === undefined ? -1 : 1;
    if (a === b) continue;
    const aNumeric = /^\d+$/.test(a);
    const bNumeric = /^\d+$/.test(b);
    if (aNumeric && bNumeric) return compareNumeric(a, b);
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    return a < b ? -1 : 1;
  }
  return 0;
}

function required(version: string): SemanticVersion {
  const parsed = parseSemanticVersion(version);
  if (!parsed) throw new UserFacingError(`Unsupported semantic version: ${version}`);
  return parsed;
}

export function compareVersions(left: string, right: string): number {
  const a = required(left);
  const b = required(right);
  for (const key of ["major", "minor", "patch"] as const) {
    const comparison = compareNumeric(a[key], b[key]);
    if (comparison !== 0) return comparison;
  }
  return comparePrerelease(a.prerelease, b.prerelease);
}

export function isBreakingUpdate(from: string, to: string): boolean {
  const a = required(from);
  const b = required(to);
  if (compareNumeric(b.major, a.major) > 0) return true;
  return a.major === "0" && b.major === "0" && compareNumeric(b.minor, a.minor) > 0;
}
