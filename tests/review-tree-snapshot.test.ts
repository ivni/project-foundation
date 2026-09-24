import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as claude from "../packages/run-claude-review-loop/scripts/tree-snapshot.ts";
import * as codex from "../packages/run-codex-review-loop/scripts/tree-snapshot.ts";
import * as qwen from "../packages/run-qwen-review-loop/scripts/tree-snapshot.ts";

for (const [name, snapshot] of Object.entries({ codex, claude, qwen })) {
  describe(`${name} working-tree snapshots`, () => {
    let root: string;
    const git = (...args: string[]) => {
      const result = Bun.spawnSync(["git", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
      if (result.exitCode !== 0) throw new Error(result.stderr.toString());
      return result.stdout;
    };
    const write = (path: string, content: string | Buffer) => {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    };
    const digest = (excluded: string[] = []) => {
      const result = snapshot.readTreeSnapshot(root, excluded);
      expect(result.limitation).toBeNull();
      expect(result.digest).toStartWith("v2:");
      return result.digest;
    };
    beforeEach(() => {
      root = mkdtempSync(join(tmpdir(), "review-tree-test-"));
      git("init", "--quiet");
      write("tracked.txt", "baseline\n");
      git("add", ".");
      git(
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.com",
        "commit",
        "--quiet",
        "-m",
        "baseline",
      );
    });
    afterEach(() => rmSync(root, { recursive: true, force: true }));

    test("detects new-file edits, rename and removal without modifying the index", () => {
      const untrackedName = process.platform === "win32" ? "new space.txt" : 'new space\n"file.txt';
      const baseline = digest();
      const index = readFileSync(join(root, ".git/index"));
      write(untrackedName, "first");
      const created = digest();
      expect(created).not.toBe(baseline);
      expect(digest()).toBe(created);
      write(untrackedName, "other");
      const edited = digest();
      expect(edited).not.toBe(created);
      renameSync(join(root, untrackedName), join(root, "renamed.txt"));
      expect(digest()).not.toBe(edited);
      unlinkSync(join(root, "renamed.txt"));
      expect(digest()).toBe(baseline);
      expect(readFileSync(join(root, ".git/index"))).toEqual(index);
    });

    test("honors Git ignores and narrow artifact exclusions, but includes configuration and tracked artifacts", () => {
      write(".gitignore", "cache/\n");
      write(".git/info/exclude", "local-cache/\n");
      const exclusions = [join(root, ".state/project-foundation/codex-review-runs")];
      const beforeSnapshot = snapshot.readTreeSnapshot(root, exclusions);
      expect(
        beforeSnapshot.exclusions.untracked_artifact_directories,
        JSON.stringify({
          root,
          real: realpathSync(root),
          gitRoot: git("rev-parse", "--show-toplevel").toString(),
          exclusions,
        }),
      ).toEqual([join(".state", "project-foundation", "codex-review-runs")]);
      const before = digest(exclusions);
      write("cache/generated", "ignored");
      write("local-cache/generated", "ignored");
      write(".state/project-foundation/codex-review-runs/run.json", "first");
      expect(snapshot.readTreeSnapshot(root, exclusions)).toEqual(beforeSnapshot);
      expect(digest(exclusions)).toBe(before);
      write(".state/project-foundation/codex-review-runs/run.json", "other");
      expect(digest(exclusions)).toBe(before);
      expect(
        snapshot.readTreeSnapshot(root, exclusions).exclusions.untracked_artifact_directories,
      ).toEqual([join(".state", "project-foundation", "codex-review-runs")]);
      write(".agents/instructions.md", "review me");
      expect(digest(exclusions)).not.toBe(before);
      const config = digest(exclusions);
      write(".state/project-foundation/codex-review-runs-other/source", "review me too");
      expect(digest(exclusions)).not.toBe(config);
      git("add", ".state/project-foundation/codex-review-runs/run.json");
      const staged = digest(exclusions);
      write(".state/project-foundation/codex-review-runs/run.json", "tracked edit");
      expect(digest(exclusions)).not.toBe(staged);
      git("add", "-f", "cache/generated");
      const trackedIgnored = digest(exclusions);
      write("cache/generated", "tracked despite ignore");
      expect(digest(exclusions)).not.toBe(trackedIgnored);
    });

    test.skipIf(process.platform === "win32")(
      "hashes symlink targets without reading their contents, including dangling links",
      () => {
        write(".git/target-a", "one");
        symlinkSync(".git/target-a", join(root, "link"));
        const first = digest();
        write(".git/target-a", "two");
        expect(digest()).toBe(first);
        unlinkSync(join(root, "link"));
        symlinkSync(".git/target-missing", join(root, "link"));
        expect(digest()).not.toBe(first);
      },
    );

    test("detects edits to already-dirty tracked binary content", () => {
      write("binary", Buffer.from([0, 1]));
      git("add", "binary");
      git(
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.com",
        "commit",
        "--quiet",
        "-m",
        "binary",
      );
      write("binary", Buffer.from([0, 2]));
      const first = digest();
      write("binary", Buffer.from([0, 3]));
      expect(digest()).not.toBe(first);
    });

    test("detects staged-only edits with identical working content and MM status", () => {
      write("tracked.txt", "index one");
      git("add", "tracked.txt");
      write("tracked.txt", "working");
      const first = digest();
      const status = git("status", "--porcelain").toString();
      write("tracked.txt", "index two");
      git("add", "tracked.txt");
      write("tracked.txt", "working");
      expect(git("status", "--porcelain").toString()).toBe(status);
      expect(digest()).not.toBe(first);
    });

    test("excludes state through symlink ancestors before and after directory creation", () => {
      mkdirSync(join(root, "real-state"));
      symlinkSync(
        join(root, "real-state"),
        join(root, "alias-state"),
        process.platform === "win32" ? "junction" : "dir",
      );
      const exclusions = [join(root, "alias-state/project-foundation/codex-review-runs")];
      const first = digest(exclusions);
      write("real-state/project-foundation/codex-review-runs/run.json", "first");
      expect(digest(exclusions)).toBe(first);
      write("real-state/project-foundation/codex-review-runs/run.json", "second");
      expect(digest(exclusions)).toBe(first);
      write("real-state/source", "included");
      expect(digest(exclusions)).not.toBe(first);
    });

    test.skipIf(process.platform === "win32")(
      "detects executable-bit changes in new scripts",
      () => {
        write("new.sh", "#!/bin/sh\nexit 0\n");
        chmodSync(join(root, "new.sh"), 0o644);
        const first = digest();
        chmodSync(join(root, "new.sh"), 0o755);
        expect(digest()).not.toBe(first);
      },
    );

    test.skipIf(process.getuid?.() === 0 || process.platform === "win32")(
      "reports incomplete Git traversal as unknown even with successful exit code",
      () => {
        write("hidden/new", "contents");
        const readable = digest();
        chmodSync(join(root, "hidden"), 0);
        try {
          const listing = Bun.spawnSync(
            ["git", "ls-files", "--others", "--exclude-standard", "-z"],
            {
              cwd: root,
              stdout: "pipe",
              stderr: "pipe",
            },
          );
          expect(listing.exitCode).toBe(0);
          expect(listing.stderr.length).toBeGreaterThan(0);
          const result = snapshot.readTreeSnapshot(root);
          expect(result.digest).toBeNull();
          expect(result.limitation).not.toBeNull();
          expect(snapshot.compareTreeDigests(readable, result.digest)).toBeNull();
        } finally {
          chmodSync(join(root, "hidden"), 0o700);
        }
      },
    );

    test("includes staged content before the first commit", () => {
      git("checkout", "--orphan", "snapshot-unborn");
      expect(snapshot.readTreeSnapshot(root).head).toBeNull();
      git("add", "tracked.txt");
      const first = digest();
      write("tracked.txt", "new staged content");
      git("add", "tracked.txt");
      expect(digest()).not.toBe(first);
    });

    test.skipIf(process.getuid?.() === 0 || process.platform === "win32")(
      "reports unreadable files as unknown",
      () => {
        write("unreadable", "contents");
        chmodSync(join(root, "unreadable"), 0);
        try {
          const result = snapshot.readTreeSnapshot(root);
          expect(result.digest).toBeNull();
          expect(result.limitation).toContain("unreadable");
          expect(snapshot.compareTreeDigests("v2:previous", result.digest)).toBeNull();
        } finally {
          chmodSync(join(root, "unreadable"), 0o600);
        }
      },
    );

    test("does not compare legacy or unavailable digests", () => {
      const current = digest();
      expect(snapshot.compareTreeDigests("old-sha256", current)).toBeNull();
      expect(snapshot.compareTreeDigests(null, current)).toBeNull();
      expect(snapshot.compareTreeDigests(current, current)).toBe(false);
      write("new", "changed");
      expect(snapshot.compareTreeDigests(current, digest())).toBe(true);
      const invalid = snapshot.readTreeSnapshot(join(root, "missing"));
      expect(invalid.digest).toBeNull();
      expect(invalid.limitation).not.toBeNull();
    });
  });
}
