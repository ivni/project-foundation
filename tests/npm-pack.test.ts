import { describe, expect, test } from "bun:test";
import { packedFilePaths, parsePackManifest } from "../scripts/npm-pack.ts";

const files = [{ path: "dist/cli.js" }, { path: "README.md" }];

describe("parsePackManifest", () => {
  test("reads the npm 11 array shape", () => {
    expect(parsePackManifest(JSON.stringify([{ name: "pkg", files }])).files).toEqual(files);
  });

  test("reads the npm 12 map shape", () => {
    expect(
      parsePackManifest(JSON.stringify({ "@scope/pkg": { name: "@scope/pkg", files } })).files,
    ).toEqual(files);
  });

  test.each([
    ["not json", "not json", /did not return JSON/],
    ["an empty array", "[]", /unexpected result/],
    ["two manifests", JSON.stringify([{ files }, { files }]), /unexpected result/],
    ["two mapped manifests", JSON.stringify({ a: { files }, b: { files } }), /unexpected result/],
    ["a scalar", "42", /unexpected result/],
    ["null", "null", /unexpected result/],
    ["a manifest without files", JSON.stringify([{ name: "pkg" }]), /file manifest/],
    ["a mapped manifest without files", JSON.stringify({ pkg: { name: "pkg" } }), /file manifest/],
    [
      "a singleton wrapper that is not a package-name map",
      JSON.stringify({ result: { files } }),
      /unexpected result/,
    ],
    [
      "a mapped manifest whose key is not its package name",
      JSON.stringify({ "@scope/pkg": { name: "other", files } }),
      /unexpected result/,
    ],
    ["a pathless entry", JSON.stringify([{ files: [{ size: 1 }] }]), /invalid file manifest entry/],
    ["a scalar entry", JSON.stringify([{ files: ["dist/cli.js"] }]), /invalid file manifest entry/],
  ])("rejects %s", (_label, output, message) => {
    expect(() => parsePackManifest(output)).toThrow(message);
  });
});

/**
 * The manifest lists every packed file, so an empty set must come from an empty package rather than
 * from a shape the parser silently failed to read.
 */
test("packedFilePaths collects the paths of the single manifest", () => {
  expect(packedFilePaths(JSON.stringify({ pkg: { name: "pkg", files } }))).toEqual(
    new Set(["dist/cli.js", "README.md"]),
  );
});
