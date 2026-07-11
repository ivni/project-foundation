<!-- docs/phase-N/scope.md — what phase N delivers and, explicitly, what it does
     not. Refines the PRD for this slice; PRD disagreements are resolved NOW, in
     the PRD, before build. -->

# Phase {{N}} — scope

**Goal:** {{one sentence, same as docs/stages.md}}

## In scope

<!-- Requirements at build-ready detail: behavior, invariants, edge cases decided.
     Group by feature area. Each item should be checkable at phase close. -->

- {{requirement}}

## Out of scope (this phase)

<!-- Explicitly deferred, with destination: a later phase, a register entry, or
     dropped. Nothing vanishes silently. -->

- {{deferred item}} → {{phase M / DEBT-N / dropped because …}}

## Decisions made in this slice

{{Links to ADRs written while slicing, one line each.}}
