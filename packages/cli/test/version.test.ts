import { expect, test } from "bun:test";
import { compareVersions, isBreakingUpdate, isSemanticVersion } from "../src/version.ts";

test("validates complete SemVer strings", () => {
  expect(isSemanticVersion("1.0.0")).toBe(true);
  expect(isSemanticVersion("1.0.0-beta.1+build.7")).toBe(true);
  expect(isSemanticVersion("1.0.0/../../../escaped")).toBe(false);
  expect(isSemanticVersion("1.0.0garbage")).toBe(false);
  expect(isSemanticVersion("01.0.0")).toBe(false);
  expect(isSemanticVersion("1.0.0-01")).toBe(false);
});

test("implements SemVer prerelease precedence", () => {
  expect(compareVersions("1.0.0-beta.1", "1.0.0-beta.2")).toBe(-1);
  expect(compareVersions("1.0.0-beta.2", "1.0.0")).toBe(-1);
  expect(compareVersions("1.0.0+build.1", "1.0.0+build.2")).toBe(0);
  expect(compareVersions("10.0.0", "2.0.0")).toBe(1);
  expect(() => compareVersions("1.0.0-invalid.01", "1.0.0")).toThrow(
    "Unsupported semantic version",
  );
});

test("detects breaking stable and zero-major updates", () => {
  expect(isBreakingUpdate("1.9.0", "2.0.0")).toBe(true);
  expect(isBreakingUpdate("0.2.0", "0.3.0")).toBe(true);
  expect(isBreakingUpdate("1.0.0-beta.1", "1.0.0")).toBe(false);
});
