# The artifact core

Every project carries this set. Locations are the hard default; deviating from the
layout (not the existence) is a mini-ADR. Capability-dependent content may be omitted
only when `docs/discovery.md` marks that capability not applicable with a rationale.

```
CLAUDE.md                 # agent contract + status line (repo root)
docs/
  discovery.md            # applicability + bootstrap/audit unknowns; historical after promotion
  PRD.md                  # product: problem, users, features, boundaries
  tech-stack.md           # pinned stack with verification dates and rationale
  stages.md               # phase plan: goal + DoD per phase
  architecture.md         # architecture-lite: context + runtime/package topology
  registers.md            # debt & risk register
  adr/
    README.md             # index: number, title, status, one-line summary
    0001-<slug>.md        # sequentially numbered, never renumbered
  runbooks/               # operational procedures
  phase-N/                # requirements slice per phase (see process.md)
    scope.md  checklist.md  blockers.md  consistency-check.md
```

## discovery.md — applicability and unknowns

Create this first in bootstrap and during the initial inventory in audit mode
(template: [templates/discovery.md](../templates/discovery.md)). It is the only project
artifact written while high-impact unknowns remain open.

It records the brief, artifact language, capability matrix, assumptions, and explicit
unknowns. Record answers here as they land. Once high-impact unknowns are closed,
promote every decision into its canonical destination (PRD, tech-stack, stages,
architecture, ADR, register, or `CLAUDE.md`), record that destination, and mark discovery
complete. A completed discovery file is historical provenance, not a living authority;
current decisions live in the canonical artifacts.

## CLAUDE.md — the agent contract

The authoritative contract for *how the project is intended to be built*. It is the
first thing the agent reads each session, so it must be dense, current, and free of
unmarked aspiration — implemented state and explicitly marked plans stay distinct.
Code and runtime evidence still determine what is implemented and what actually runs.

Required sections (template: [templates/claude-md.md](../templates/claude-md.md)):

- **Status line** — a `> Status:` block near the top: what is implemented, what is in
  progress, what is next. Updated at every phase/subphase completion, in the same
  commit. This is the agent's resume point.
- **Product principles (non-negotiable)** — 5–7 principles phrased so a violation is
  detectable ("violating them is a bug, not a style choice"). These come out of
  discovery, not out of a template.
- **Project shape & applicability** — the current capability classification promoted
  from discovery; planned capabilities link to stages or a register trigger.
- **Repository layout** — annotated tree.
- **Tech stack** — pinned versions with the rule "verify via official docs, never from
  memory" stated inline; the full detail lives in `docs/tech-stack.md`.
- **Commands** — build, test, and the single local verification entry point (lint,
  format check, typecheck, fast tests, audit).
- **Git & release workflow** — workflow profile, commit-message language, release
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
when implementation or runtime diverges, determine the intended behavior first. Update
the PRD in the same change only when intent changed; otherwise fix the implementation.
Never rewrite the PRD merely to legitimize a defect. Detail level: enough that the
stages plan can be derived from it; per-feature detail arrives in phase slices, not upfront.

## tech-stack.md

Every entry pinned to a version, with the **date it was verified against official
docs**. Recalled or invented version numbers are forbidden — this is the most common
way an AI agent silently corrupts a project. Non-obvious picks (and rejected
alternatives) get a sentence of rationale or a full ADR.

## stages.md

The phase plan. Hard defaults:

- **Phase 0 proves the thinnest releasable path** for the applicable project contour.
  It always covers build, verification, packaging, release, and rollback. A service
  also exercises deploy and health checks; a CLI installs and runs; a library works in
  a consumer example; a data job runs and reruns safely on representative input.
  Capability-dependent concerns such as auth, migrations, backups, and observability
  join phase 0 only when applicable. No product features.
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
`docs/adr/README.md` using [templates/adr-index.md](../templates/adr-index.md).
Superseded ADRs stay in place with status "superseded by NNNN".

## architecture.md (architecture-lite)

Two text-based views (Mermaid or equivalent), adapted to the applicable contour:

1. **Context** — the product or artifact, its users/consumers, and external systems.
2. **Runtime / package topology** — deployable units and protocols for a service;
   host, package, and consumer boundaries for a library or CLI; application, platform,
   and backend boundaries for a client; execution units and data flow for a data job.

Do not draw infrastructure marked not applicable merely to fill the template. Avoid
component-level diagrams — they rot. Both views follow the same-change rule: changing
a runtime unit, consumer boundary, or integration updates the diagram in the same commit.

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
CLAUDE.md sections. When discovering an existing mismatch, first determine intent:
fix stale docs when implementation is correct; fix or register the code when it violates
the documented decision; report ambiguity or out-of-scope work instead of silently
choosing a winner. Never leave planned behavior described as implemented, or vice versa.
