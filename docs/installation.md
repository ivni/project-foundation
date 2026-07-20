# Installation

## Requirements

- Bun 1.3 or newer
- An interactive terminal (TTY)
- At least one supported agent environment

Install Bun using the [official instructions](https://bun.com/docs/installation). Confirm it is
available:

```bash
bun --version
```

## Run the installer

```bash
bunx @ivni/project-foundation
```

The no-argument command opens the main menu. Select `Install`, then:

1. Choose one or more skills. All packaged skills are preselected.
2. Choose one or more agent environments. Detected agents are preselected.
3. Choose `User` or `Project` scope.
4. Confirm the project root when using project scope.
5. Choose `Link` or `Copy`.
6. Review every skill and target path.
7. Confirm the installation.

The wizard can edit any selection from the preview screen. It performs its full conflict preflight
before the first mutation.

## Direct command

```bash
bunx @ivni/project-foundation install
```

The command is still interactive. There is intentionally no unattended mutation mode in the first
release.

## What bunx installs

`bunx` runs the package without creating a permanent global CLI installation. The package contains
the installer and exact payloads for `project-foundation`, `find-blind-spots`,
`run-discovery-interview`, `run-codex-review-loop`, and `run-claude-review-loop`. The selected skill
directories remain after `bunx` exits.

`run-codex-review-loop` has additional runtime requirements when invoked from Claude Code, Pi,
OpenCode, or Hermes: `bun` and an authenticated `codex` CLI with access to `gpt-5.6-sol` and `xhigh`
reasoning. Codex-hosted use delegates to a native Codex subagent. The installer copies the wrapper
and adapter instructions but does not install or authenticate the Codex CLI or install a global
read-only Codex custom-agent profile. Without a native read-only reviewer override, the Codex adapter
asks before using the external wrapper.

`run-claude-review-loop` requires Bun plus an authenticated Claude Code CLI with access to the
`fable` model alias and `xhigh` effort when the packaged wrapper is used. The wrapper invokes a
direct Claude executable, strips conflicting profile and content-telemetry variables, disables
updates and nonessential traffic, runs a no-tool profile probe, enables safe and plan modes, and
exposes only `Read`, `Grep`, and `Glob`. The probe is an additional small model call for every wrapper
invocation. The installer does not install or authenticate Claude Code. A Claude Code host may use a
native fresh custom subagent only when it can prove the same model, effort, read-only, test-free, and
context-isolation controls.

Each skill is installed as an independent immediate child of the agent's skill root, so agent
discovery does not depend on nested-skill behavior. Its package directory, target directory,
managed-store directory, and receipt all use the same `skillId`.

Schema 1 installations from older releases are not managed by this architecture. If an old target
occupies a selected path, installation uses the normal conflict screen and requires an explicit
choice to show the diff, replace it, back it up and replace it, or keep it.

## Existing content

If a destination already exists, the installer compares its payload before changing anything.
Matching content can be adopted. Different content offers only explicit actions:

- Show diff
- Remove and replace
- Remove, back up, and replace
- Keep the existing content and skip that target

Backups are stored in the platform user-data directory, never inside the user's repository.

When several skills are selected, the wizard preflights all of them before confirmation and wraps
their per-skill transactions in a suite transaction. If a later skill fails, earlier mutations from
the same confirmed operation are restored.
