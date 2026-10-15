# Project Foundation

Project Foundation is a focused Agent Skill suite for moving from uncertainty to an agreed,
durable project foundation:

- **Find Blind Spots** performs a read-only search for consequential unknowns, classifies them by
  product, UX, business, domain, or engineering concern, and routes each to the right owner or
  validation method.
- **Discovery Interview** defaults to a non-technical product-owner track for product value,
  functionality, domain rules, UX, and business constraints. It asks one stakeholder-owned decision
  at a time while writing only one scratch discovery record.
- **Plan Feature** turns completed discovery for a small feature into an implementation issue with
  ordered stages, acceptance checks, and an attached discovery snapshot.
- **Run Feature Stage** restores the active issue after compaction, completes one stage with
  agent-owned verification, Codex review, and a local commit, then records progress and stops.
- **Run Feature** orchestrates the remaining stages of one published feature with fresh workers,
  verifies each stage before continuing, and preserves recovery and review history.
- **Run Subphase** takes exactly one subphase of a phase requirements slice to done — entry gate,
  agreed verification seams, vertical slices, verification evidence, an independent review, one
  commit — and then stops, because a subphase is sized to a single context window.
- **Run Phase** orchestrates the remaining subphases of one prepared phase with a fresh worker for
  each one, verifies completion and preserves recovery/review history before continuing.
- **Codex Review Loop** explicitly launches an independent read-only Codex reviewer over the current
  task's uncommitted changes, then lets the primary agent validate findings, make bounded fixes, run
  checks, and re-review until clean or honestly blocked.
- **Claude Review Loop** runs the same bounded workflow through an actual Claude Fable/xhigh reviewer
  with only read-only file inspection tools; the primary agent remains responsible for all tests.
- **Qwen Review Loop** runs the same bounded workflow through an actual Qwen Code CLI reviewer pinned
  to `qwen3.8-max` with `xhigh` reasoning in the read-only plan approval mode; the primary agent
  remains responsible for all tests.
- **Analyze Tests** reports which tests can be removed or consolidated, what can run in parallel,
  and what else can be faster. It starts with analysis and applies selected proposals only after a
  separate command. It can use existing results and safe local measurements.
- **Project Foundation** turns the resulting product and UX contract into agent-led technical
  synthesis, architecture, delivery process, and a canonical artifact set.

One further skill stands apart from that arc and is installed independently:

- **Teach** treats the current directory as a stateful learning workspace — mission, curated
  sources, glossary, learning records, and lessons — so a topic can be taught across many sessions.
  It shares no artifacts with the engineering skills and never touches a software project's docs.

The package includes an interactive Bun installer for Codex, Claude Code, Pi, OpenCode, and
Hermes Agent.

## Quick start

Install [Bun](https://bun.com/docs/installation), then run:

```bash
bunx @ivni/project-foundation
```

Choose `Install / update`. The wizard reuses an existing installation's agents, scope, and method,
or lets you choose different settings. On a first installation, all thirteen skills are preselected.
For an existing installation, updates are preselected and absent skills are optional additions.
You can update installed skills and add others in one run, with one complete preview before writing
anything.

The skill registry is the source of truth: each registry key is also the package directory, native
target name, managed-store name, and receipt `skillId`. Adding another skill does not require a new
installer code path.

You can also open a flow directly:

```bash
bunx @ivni/project-foundation install
bunx @ivni/project-foundation@latest update
bunx @ivni/project-foundation remove
```

`install` and `update` open the same wizard. Both update existing managed installations and offer
absent skills for installation; running both commands is unnecessary.

Nothing is installed globally as an executable. `bunx` downloads and runs the package for that
invocation. Use `@latest` for updates when you want to bypass ambiguity around cached package
resolution.

## Small-feature delivery

After `$run-discovery-interview` finishes, invoke `$plan-feature` to create the implementation issue
and attach the discovery record. Invoke `$run-feature-stage` once per stage, or start `$run-feature`
to orchestrate the remaining stages with a fresh worker for each one. The orchestration route
has adapters for Codex, Claude Code, Pi, OpenCode and Hermes. Codex has observed execution evidence;
the four other routes have documentation and contract evidence, with authenticated runtime checks
omitted by the feature owner's acceptance decision. See [compatibility](docs/compatibility.md#feature-orchestration-acceptance)
for the evidence and platform limits. Each adapter requires its actual authenticated runtime and
permissions when used.
These workflows work without repeated parameters: a local pointer selects the active issue,
while the issue owns the plan and progress. Explicit issue or discovery arguments select a
different task when needed.
Repeating `$plan-feature` returns the existing published plan and preserves stage progress and review
checkpoints. Replanning is an explicit request and retains completed work and the original base.

The stage executor runs acceptance checks and `run-codex-review-loop`, fixes permitted findings,
commits locally, updates the issue, and stops. An interrupted stage is resumed; a committed stage
whose issue update failed is reconciled instead of implemented again. The last stage verifies the
whole feature. Push, merge, release, and deployment require their own authorization.

The orchestrator diagnoses ordinary failures and retries the same stage. A bounded Codex review
stop starts a new review cycle with the existing findings and history. When necessary information
is missing, it saves a checkpoint and asks a concrete question; a sufficient answer continues that
stage. Cancellation stops the active worker, waits for termination and retains recovery evidence;
explicit cancellation requires explicit resume. It does not continue after the session closes.

Install `run-codex-review-loop` alongside `run-feature-stage`, and `run-feature` for orchestration.
The feature skills use the issue platform selected by the destination or verified remote. GitLab, including self-managed instances
and nested groups, uses `glab` or an available authenticated connector/API; GitHub uses its own
integration. Other platforms use equivalent issue and upload operations without changing the workflow.
Planning needs an actual document-upload route or an existing immutable discovery file link. The
planner verifies the published file; a local path does not count as an attachment.

## Phase delivery

After the phase requirements slice is ready (`N.0` ticked), invoke `$run-phase` with the phase name,
or use a bare invocation when the current phase is unambiguous in the agent contract. Install
`run-phase`, `run-subphase` and an independent review loop together. The parent dispatches one fresh
`run-subphase` worker at a time, verifies checks, acceptance evidence, review and committed checklist
progress, then continues through the remaining subphases. Standalone `$run-subphase` still does one
subphase and stops.

Ordinary errors retry the same subphase; exhausted review cycles retain findings and resume in a new
bounded run after diagnosis. A committed increment is reconciled instead of built again. Missing user
information stops with a saved question; cancellation stops the owned worker and requires explicit
resume. Recovery metadata lives under `.agents/work/phases/`; the slice remains the plan/progress
source. The workflow stops at this phase boundary, verifies the full phase definition of done, and
reports any pending CI/runtime/delivery gates separately. Push, release and deployment are separate.

Workers require an actual fresh delegation and cancellation lifecycle. Codex, Claude Code and OpenCode
use native workers when available. Pi/Hermes require an existing compatible process supervisor;
`run-phase` does not bundle one. See [phase orchestration compatibility](docs/compatibility.md#phase-orchestration)
for validation limits.

## Test-suite analysis

Ask `$analyze-tests` to analyze the repository's tests. The report includes evidence, retained
protection, expected benefit, risks, and validation plans under numbered proposals. By default it
reads code and existing results and may run bounded safe local measurements without changing tests
or configuration. Request static-only analysis when no commands with side effects should run.

Then select proposals in a separate message, for example: `$analyze-tests apply T-02 and T-05`.
The skill checks that the report still matches the code, applies only the selected scope, and verifies
correctness and performance separately. It does not commit or publish automatically.

## Supported environments

| Agent | User scope | Project scope |
| --- | --- | --- |
| Codex | `~/.agents/skills` | `.agents/skills` |
| Claude Code | `~/.claude/skills` | `.claude/skills` |
| Pi | `~/.pi/agent/skills` | `.pi/skills` |
| OpenCode | `~/.config/opencode/skills` | `.opencode/skills` |
| Hermes Agent | `~/.hermes/skills` | Not supported |

The installer understands cross-agent discovery. For example, Codex, Pi, and OpenCode can share
one `.agents/skills` target instead of receiving redundant copies.

## Safety model

- Every mutation is preceded by a preview.
- A multi-skill operation uses an outer compensating transaction, so a later skill failure rolls
  back earlier skill mutations from the same confirmation.
- Existing unmanaged content is never overwritten silently.
- Locally modified managed installs can be shown as a diff, kept, removed, or backed up first.
- Multi-path operations use compensating rollback when a write fails.
- Downgrades are rejected.
- The installer never writes `.git` or mutates the index, branches, commits, or worktrees. Project-scope files can change the working tree and remain the user's Git responsibility.
- No telemetry is collected.

## Documentation

- [Installation](docs/installation.md)
- [Targets and scopes](docs/targets-and-scopes.md)
- [Copy vs link](docs/copy-vs-link.md)
- [Updating](docs/updating.md)
- [Removing](docs/removing.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Compatibility sources](docs/compatibility.md)
- [Development](docs/development.md)
- [Release process](docs/release.md)

## Development

```bash
bun install --frozen-lockfile
bun run check
```

The public package is the repository root. The private workspaces under `packages/` separate the
CLI source from the thirteen raw skill payloads. See [Development](docs/development.md) for the full
layout and verification workflow.

## License

[MIT](LICENSE)
