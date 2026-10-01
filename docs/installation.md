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

The no-argument command opens the main menu. Select `Install / update`, then:

1. Reuse a detected installation configuration, or choose different settings. Existing
   configurations include agents, `User` or `Project` scope, and `Link` or `Copy` method. User
   installations and installations in the current project are discovered automatically. Agents
   using the same scope and method are grouped together, including independent copy targets.
2. For new settings, choose scope, project root when applicable, agent environments, and the method
   for new files. Detected compatible agents are preselected. Existing installations keep their method.
3. Choose updates and additions from one list. Existing updates are preselected. Absent skills are
   unchecked when the selected agents already have managed skills; on a first installation, all
   additions are preselected. Current installations are shown separately.
4. Resolve any local modifications or unmanaged target conflicts.
5. Review the complete plan, then apply it or change the selection or configuration.

The wizard performs its full conflict preflight before the first mutation. Updates and additions
share one confirmation and rollback boundary. The final counts report updated physical managed
installations, added native targets, and selected actions skipped because content was kept. An
installation shared by several agents counts as one update.

## Direct command

```bash
bunx @ivni/project-foundation install
bunx @ivni/project-foundation@latest update
```

Both commands open the same interactive wizard. Either command can update existing skills and add
absent skills without a second invocation. There is intentionally no unattended mutation mode.

Absent skills are labeled as additions, not automatically as new release content: they may have
been deliberately omitted or removed earlier. The wizard does not persist a full-suite subscription.

## What bunx installs

`bunx` runs the package without creating a permanent global CLI installation. The package contains
the installer and exact payloads for `project-foundation`, `find-blind-spots`,
`run-discovery-interview`, `plan-feature`, `run-feature-stage`, `run-subphase`, `run-codex-review-loop`,
`run-claude-review-loop`, `run-qwen-review-loop`, `analyze-tests`, and `teach`. The selected skill
directories remain after `bunx` exits.

For the small-feature workflow, install `plan-feature`, `run-feature-stage`, and
`run-codex-review-loop` together. The planner publishes to the project's authenticated issue forge
and needs a supported document-upload route or a verified immutable discovery file link. The
executor owns checks and review and commits locally; it does not push or deploy automatically.
The workflow follows the repository's actual forge, including self-managed GitLab. `gh` is not a
requirement for GitLab: use the available `glab`/connector/API with the verified host and project.

`run-codex-review-loop` has additional runtime requirements when invoked from Claude Code, Pi,
OpenCode, or Hermes: `bun` and an authenticated `codex` CLI with access to `gpt-6.1-sol` and `xhigh`
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

`run-qwen-review-loop` requires Bun plus an authenticated Qwen Code CLI (`qwen`) with access to
`qwen3.8-max` on every host; there is no native-subagent path. The wrapper pins the model as a CLI
argument, pins `xhigh` reasoning and an empty MCP server list through a wrapper-owned system settings
file, and sets the `plan` approval mode. Plan mode is tool-surface enforcement by the Qwen Code
runtime, not an OS sandbox. Authentication stays with the Qwen Code CLI's own login or configured
provider; the installer does not install or authenticate Qwen Code.

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
