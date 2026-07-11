<!-- Template for docs/stages.md. Phases sized in weeks, not months. Update when
     reality changes — a stages file describing an abandoned plan is a bug. -->

# Build stages — {{project}}

## Phase 0 — walking skeleton

**Goal:** the thinnest end-to-end deployable slice; no features.

Includes: repo + CI (lint → typecheck → test → audit → build → deploy), QA gate and
pre-push hook, deploy path exercised for real (tag → production), auth stub,
structured logging with correlation id, health endpoints, backup + rehearsed restore.

**Done when:** a tagged release deploys automatically and responds healthy in
production; the deploy and restore runbooks exist.

## Phase 1 — {{name}}

**Goal:** {{one sentence}}.

**Scope sketch:** {{feature areas; detail arrives in the phase requirements slice}}

**Done when:** {{observable criteria}}

## Phase 2 — {{name}}

...

## Sequencing notes

{{Dependencies between phases, deliberate deferrals, links to register entries for
anything pushed out.}}
