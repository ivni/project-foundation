# Engineering gates

Gates make speed safe. They are established in phase 0 (bootstrap) or in the first
step of the adoption plan (audit) — nothing else lands before them.
Capability-dependent gates apply only to capabilities marked applicable in
`docs/discovery.md`; local verification, required CI, versioning, and documentation
gates always apply.

## The single local verification entry point

One script (`scripts/qa.sh` or the stack's equivalent) that runs the fast checks:

- lint,
- format check,
- typecheck (strict — strictness is a day-one decision, retrofitting it is misery),
- fast/default tests,
- dependency / supply-chain audit,
- the agent-contract check (see below).

Properties:

- Fast enough to run on every push (minutes, not tens of minutes). Keep slow and
  integration suites separate; the default fast suite belongs here.
- One command, zero arguments, non-zero exit on any failure. If verification is "run these
  five things", nobody runs all five.
- Wire it as a **pre-push feedback hook**. Hooks can be missing or bypassed, so they are
  never the enforcement boundary; required CI checks are. Keep the hook and script in
  the repo, and make hook installation part of bootstrap.

## Tests

- The fast/default suite runs inside the local verification command. Document a
  separate command for slow/integration tests next to it in the agent contract.
- Split fast/default from slow/integration (markers, tags, or directories) so local
  verification stays cheap and the expensive suite is deliberate.
- Run all applicable suites in CI. New behavior without a test is an incomplete
  subphase (see [process.md](process.md)).
- Tests prove code paths; they do not prove the feature works. Behavior claims require
  actually running the thing (see [ai-collaboration.md](ai-collaboration.md)).

## CI pipeline

Mirror the local gates, in this order, failing fast:

```
lint → format check → typecheck → test (+coverage) → audit → build/package → [publish/deploy]
```

- Every stage that runs locally must run identically in CI — no CI-only magic and no
  local-only checks.
- In protected-trunk mode, required checks gate merge. In every mode, the release job
  refuses to release a commit unless that exact commit has completed required CI.
- Branch pushes run everything **except** the applicable publish/deploy step.

## Release discipline

- **Release from a version tag only** (semver unless the ecosystem requires another
  scheme). A tag deploys a service, publishes a package, or produces a signed client
  artifact according to the applicable contour; pushing a branch never releases.
- If a deployable runtime has no staging environment, say so explicitly in the agent contract
  — it changes how carefully tags are cut.
- When persistent data and schema migrations apply, run an **automatic backup before
  migration** in the release pipeline, not as a human step. Rehearse restore from that
  backup at least once (see [platform.md](platform.md)).
- Document rollback or withdrawal before the first real release needs it: previous
  deployment for a service, package deprecation/yank policy for a library, and artifact
  rollback/update behavior for a client application.
- Rehearse the real publish/deploy/release path in phase 0; the first release-path run
  must not coincide with the first feature.
- Expose the version through the appropriate surface: endpoint or startup log for a
  service, `--version` for a CLI, package metadata for a library, or an about/build
  screen for a client application.

## Git discipline

Choose one trunk-based profile and record it in the agent contract; neither uses long-lived
branches:

- **Protected trunk — default when the remote supports required checks.** Work on a
  short-lived branch, merge through a PR, require CI before merge, and prohibit direct
  pushes to `main`.
- **Solo-fast — allowed for a single maintainer who accepts a briefly red `main`.** Run
  local verification before direct push; CI runs after push, and release/tag automation
  refuses commits without green required checks. State this tradeoff explicitly.

- Commit messages in the project's artifact language, present tense, saying *what and
  why*, naming the phase/subphase when one applies.
- The agent **pushes only on explicit instruction** — committing locally is routine,
  publishing is not. Same for tagging (tags release!). See
  [ai-collaboration.md](ai-collaboration.md).

## Environments & secrets

- When a deployable runtime applies, dev and prod use the same infrastructure
  definitions (compose file, manifests, …), differing only in credentials and sizing.
  A dev environment that drifts from prod is a gate failure waiting to happen.
- Secrets exist only on the server / in the environment — never in the repo, never in
  the artifacts. The repo may carry `.env.example` with names and fake values.

## The agent contract gate

The contract is read into every session in full, so its length is a recurring cost paid by
every future session, and nothing in normal work pushes back on growth. The gate does.

One canonical file, `AGENTS.md` unless an ADR records another path. Harness-specific files —
`CLAUDE.md` for Claude Code and any equivalent — contain the import of that file and nothing else:

```markdown
@AGENTS.md
```

The check fails when:

- the canonical contract is missing at its recorded path;
- it exceeds **300 lines** or **15 KB**;
- a configured harness file is missing. The harness reads that file and nothing else, so its
  absence means the agent works with no contract at all — the one failure the harness cannot
  report itself. A project with no harness file declares that explicitly by configuring an empty
  pointer list; dropping a path from the list is not something that should happen by omission;
- a harness file is anything other than that single import line: the check compares the file's
  content, blank lines aside, against the import, rather than searching for the import inside it.
  Asking only whether the import appears leaves every way of adding a rule beside it — a paragraph
  below, an indented heading, a second import — passing;
- a configured budget is not a positive integer. A limit that reaches the comparison as a typo is
  answered by the shell with "not an integer", which an `if` swallows, so the budget it guards is
  never compared and the gate reports success.

The contract path is compared as text, never as a search pattern, so a harness file importing a
path that merely resembles the canonical one fails like any other non-pointer.

Reference implementation:
[templates/check-agent-contract.sh](../templates/check-agent-contract.sh). Copy it into the
project, point the variables at the recorded paths, and call it from the single local
verification entry point so it also runs in CI. It needs no toolchain, so it works from the
first commit of any stack.

The remedy for a red gate is moving detail into `docs/` and linking it — the contract is an
index of the project's rules, not their full text. Raising the limit is a SHOULD deviation and
needs an ADR that names what the extra context costs every session; a project with genuinely
large domain rules may take that route deliberately, but not silently and not by editing the
number mid-commit.

The size limit is also the reason the contract is not a development log. History belongs to git,
ADRs, and the changelog; the contract keeps one rewritten `> Status:` paragraph.

## Docs-stay-current as a gate

The same-change rule (see [artifacts.md](artifacts.md)) keeps retained contracts and procedures
accurate: ask which reader's decision or action a change would invalidate, and update those records.
It does not require a documentation edit for every commit, or a prose copy of tests and implementation.
An unchanged document is correct when its promises still hold.
