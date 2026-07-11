# Engineering gates

Gates make speed safe. They are established in phase 0 (bootstrap) or in the first
step of the adoption plan (audit) — nothing else lands before them.

## The single QA entry point

One script (`scripts/qa.sh` or the stack's equivalent) that runs the fast checks:

- lint,
- format check,
- typecheck (strict — strictness is a day-one decision, retrofitting it is misery),
- dependency / supply-chain audit.

Properties:

- Fast enough to run on every push (minutes, not tens of minutes). **Tests are
  deliberately excluded** — they are heavier and run separately (below).
- One command, zero arguments, non-zero exit on any failure. If QA is "run these
  four things", nobody runs all four.
- Wired as a **pre-push hook** so it cannot be forgotten. The hook and the script live
  in the repo; installing the hook is part of bootstrap.

## Tests

- A separate command, documented next to QA in `CLAUDE.md`.
- Split fast/default from slow/integration (markers, tags, or directories) so the
  default invocation stays cheap and the expensive suite is deliberate.
- Run before any meaningful push; always run in CI. New behavior without a test is an
  incomplete subphase (see [process.md](process.md)).
- Tests prove code paths; they do not prove the feature works. Behavior claims require
  actually running the thing (see [ai-collaboration.md](ai-collaboration.md)).

## CI pipeline

Mirror the local gates, in this order, failing fast:

```
lint → typecheck → test (+coverage) → audit → build → deploy
```

- Every stage that runs locally must run identically in CI — no CI-only magic and no
  local-only checks.
- Branch pushes run everything **except** deploy.

## Release discipline

- **Deploy by version tag only** (semver). Pushing a branch never deploys. If there is
  no staging environment, say so explicitly in `CLAUDE.md` — it changes how carefully
  tags are cut.
- **Automatic backup before schema migrations**, in the deploy pipeline itself, not as
  a human step. Restore from that backup is rehearsed at least once (see
  [platform.md](platform.md)).
- Rollback is documented in a runbook *before* the first production deploy needs it.
- The whole deploy path is rehearsed in phase 0 with the walking skeleton — the first
  deploy must not coincide with the first feature.
- The running system exposes its version (from the tag) somewhere visible — a footer,
  a `/version` endpoint, a log line at startup.

## Git discipline (solo + agent default)

- Trunk-based: commit directly to `main`; no long-lived branches. A team context
  changes this — record the chosen model in `CLAUDE.md`.
- Commit messages in the project's artifact language, present tense, saying *what and
  why*, naming the phase/subphase when one applies.
- The agent **pushes only on explicit instruction** — committing locally is routine,
  publishing is not. Same for tagging (tags deploy!). See
  [ai-collaboration.md](ai-collaboration.md).

## Environments & secrets

- Dev and prod are defined by the same infrastructure definitions (compose file,
  manifests, …) differing only in credentials and sizing. A dev environment that
  drifts from prod is a gate failure waiting to happen.
- Secrets exist only on the server / in the environment — never in the repo, never in
  the artifacts. The repo may carry `.env.example` with names and fake values.

## Docs-stay-current as a gate

The same-change rule (see [artifacts.md](artifacts.md)) is a gate, not a virtue:
a behavior-changing commit that does not touch the affected docs is an incomplete
commit. Reviewing your own diff before committing includes asking "which doc does this
invalidate?".
