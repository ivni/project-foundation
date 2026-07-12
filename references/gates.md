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
- dependency / supply-chain audit.

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
  separate command for slow/integration tests next to it in `CLAUDE.md`.
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
- If a deployable runtime has no staging environment, say so explicitly in `CLAUDE.md`
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

Choose one trunk-based profile and record it in `CLAUDE.md`; neither uses long-lived
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

## Docs-stay-current as a gate

The same-change rule (see [artifacts.md](artifacts.md)) is a gate, not a virtue:
a behavior-changing commit that does not touch the affected docs is an incomplete
commit. Reviewing your own diff before committing includes asking "which doc does this
invalidate?".
