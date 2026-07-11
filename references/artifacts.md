# The artifact core

Every project carries this set. Locations are the hard default; deviating from the
layout (not the existence) is a mini-ADR.

```
CLAUDE.md                 # agent contract + status line (repo root)
docs/
  PRD.md                  # product: problem, users, features, boundaries
  tech-stack.md           # pinned stack with verification dates and rationale
  stages.md               # phase plan: goal + DoD per phase
  architecture.md         # C4-lite: context + containers (text-based diagrams)
  registers.md            # debt & risk register
  adr/
    README.md             # index: number, title, status, one-line summary
    0001-<slug>.md        # sequentially numbered, never renumbered
  runbooks/               # operational procedures
  phase-N/                # requirements slice per phase (see process.md)
    scope.md  checklist.md  blockers.md  consistency-check.md
```

## CLAUDE.md — the agent contract

The single source of truth for *how the project is built*. It is the first thing the
agent reads each session, so it must be dense, current, and free of aspiration — it
describes reality plus explicitly-marked plans, never a blur of the two.

Required sections (template: [templates/claude-md.md](../templates/claude-md.md)):

- **Status line** — a `> Status:` block near the top: what is implemented, what is in
  progress, what is next. Updated at every phase/subphase completion, in the same
  commit. This is the agent's resume point.
- **Product principles (non-negotiable)** — 5–7 principles phrased so a violation is
  detectable ("violating them is a bug, not a style choice"). These come out of
  discovery, not out of a template.
- **Repository layout** — annotated tree.
- **Tech stack** — pinned versions with the rule "verify via official docs, never from
  memory" stated inline; the full detail lives in `docs/tech-stack.md`.
- **Commands** — build, lint, typecheck, test, and the single QA entry point.
- **Git & release workflow** — branching model, commit-message language, deploy
  trigger, and the agent's autonomy boundaries (see
  [ai-collaboration.md](ai-collaboration.md)).
- **Documentation must stay current** — the same-change rule (see below).
- **Domain rules that code MUST enforce** — the business invariants that make the
  product correct. Each phrased as a testable constraint.
- **Security & platform rules** — the decisions from [platform.md](platform.md) that
  apply to this project.
- **Gotchas / easy mistakes** — a living list of traps discovered while building.

## PRD

Problem, users and their jobs, the feature set sketched per phase, and — as important —
explicit non-goals. The PRD is a living document: phase requirements slices refine it;
when reality diverges, the PRD is corrected in the same change. Detail level: enough
that the stages plan can be derived from it; per-feature detail arrives in phase slices,
not upfront.

## tech-stack.md

Every entry pinned to a version, with the **date it was verified against official
docs**. Recalled or invented version numbers are forbidden — this is the most common
way an AI agent silently corrupts a project. Non-obvious picks (and rejected
alternatives) get a sentence of rationale or a full ADR.

## stages.md

The phase plan. Hard defaults:

- **Phase 0 is a walking skeleton** — the thinnest end-to-end deployable slice: repo,
  CI, deploy path exercised for real, auth stub, structured logging, health checks.
  No features. Its purpose is to make every later phase's work immediately shippable
  and to surface infrastructure unknowns while they are cheap.
- Each phase has a **goal** (one sentence) and a **definition of done**.
- Phases are sized in weeks, not months; if a phase needs subphase numbering past ~12,
  it was two phases.
- The plan is updated when reality changes — a stages file describing an abandoned plan
  is a bug.

## ADRs

When to write one:

- A decision that is hard to reverse (storage model, auth channel, protocol).
- A cross-cutting convention (error handling, id scheme, event delivery).
- Anything a future reader would find surprising without context.
- A **deviation from this standard** (mini-ADR: three sentences are enough).
- A **spike outcome** (see [process.md](process.md)).
- In audit mode: **retro-ADRs** for significant implicit decisions, status
  "accepted (retroactive)".

Format ([templates/adr.md](../templates/adr.md)): context → decision → consequences,
plus status and date. Numbered sequentially (`0001-…`), never renumbered, indexed in
`docs/adr/README.md`. Superseded ADRs stay in place with status "superseded by NNNN".

## architecture.md (C4-lite)

Two text-based diagrams (Mermaid or equivalent), no more:

1. **Context** — the system, its users, and external systems it talks to.
2. **Containers** — deployable units (app, workers, DB, cache, storage, external
   services) and the protocols between them.

No component-level diagrams — they rot. The two diagrams fall under the same-change
rule: adding a container or integration updates the diagram in the same commit.

## registers.md — debt & risk

One file, two tables (template: [templates/registers.md](../templates/registers.md)).
Every entry has: stable id (`DEBT-N` / `RISK-N`), description, owner, **review
trigger** (a date or an event: "before phase 3", "when users > 50"), and status.

Rules:

- Known debt without an entry is a standard violation — the register is what makes
  "we'll fix it later" honest.
- Phase blockers (`BLK-N`, see [process.md](process.md)) that outlive their phase
  graduate into this register; they do not silently disappear.
- Review the register at every phase close.

## Runbooks

One file per procedure you would otherwise reconstruct under stress: deploy,
restore-from-backup, credential rotation, incident triage entry point. A runbook is
exact commands with expected output, not prose. Written when the procedure is first
performed — a deploy that has happened twice without a runbook is overdue.

## Documentation must stay current (the same-change rule)

Any change that alters behavior, structure, or conventions updates the affected
docs **in the same change** — status line, PRD, stages, architecture, registers,
CLAUDE.md sections. Noticing a stale doc while working on something else: fix it
immediately if small, otherwise register it. Never leave a doc describing planned
behavior as implemented, or vice versa.
