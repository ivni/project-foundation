---
name: project-foundation
description: Opinionated, stack-agnostic method for laying a project's foundation — architecture, process, and artifact set. Use when starting a new project (bootstrap discovery → artifact core → gates), when overhauling or inheriting an existing codebase (audit → gap plan → retro-ADRs), or for point tasks — start or close a phase requirements slice, write an ADR, check docs-vs-code drift, register tech debt or risks, run a spike.
---

# Project Foundation

An opinionated engineering method for the **solo engineer + AI agent** setup. It defines
a standard (hard defaults for artifacts, process, gates, and platform decisions) and the
process for establishing it on a new project or retrofitting it onto an existing one.

The standard is directive within the project's applicable capabilities: defaults are
not suggestions. Marking a capability not applicable requires a one-line rationale in
discovery, not an ADR. Rejecting an applicable default is a deliberate deviation and
gets a mini-ADR recording what was changed and why. "We didn't get around to it" is
not a deviation; it is a violation.

## The standard in ten rules

1. **Docs are the project contract and the agent's inter-session memory.** They record
   intent, decisions, process, and status; code records the implementation; runtime
   observation records current behavior. A mismatch is a defect to investigate, not
   permission to overwrite either side blindly.
2. **Discovery exists from day one; the artifact core exists before build:**
   `docs/discovery.md` captures applicability and unknowns, then `CLAUDE.md`, PRD,
   tech-stack, stages, ADR log with index, architecture-lite sketch, and registers
   become canonical before phase 0 starts.
3. **Phase 0 proves the thinnest releasable path appropriate to the project.** It always
   exercises build, verification, packaging, release, and rollback. Deploy, auth,
   health checks, migrations, backups, and observability join it when applicable.
4. **Every phase starts with a requirements slice** — scope, checklist, blockers,
   consistency-check — and unknowns are closed *before* code is written.
5. **Non-negotiables are written down:** 5–7 product principles plus the domain rules
   code must enforce. Violating one is a bug, not a style choice.
6. **One local verification entry point** (lint + format check + typecheck + fast tests
   + audit). A pre-push hook provides fast feedback; required CI checks are enforcement.
7. **Decisions are recorded.** Anything hard to reverse, cross-cutting, or surprising
   gets an ADR. Deviations from this standard get a mini-ADR.
8. **Debt and risk live in a register** with an owner and a review trigger. Known debt
   without a register entry violates the standard.
9. **Applicable platform questions are answered early** — observability, auth model,
   time handling, idempotency, backups — using the capability-conditional defaults in
   [references/platform.md](references/platform.md).
10. **Releases are deliberate:** every released artifact is versioned; applicable
    deploy or publish paths run from the version, backup precedes applicable migrations,
    rollback is documented, and the real release path is rehearsed in phase 0.

## Artifact language

This skill and its templates are English. The language of *generated artifacts* is a
per-project decision: default to the language of the user's brief, confirm during
discovery, record it first in `docs/discovery.md`, then promote it into the project's
`CLAUDE.md` with the artifact core. Apply it consistently (docs, commit messages,
register entries). Translate template headings when instantiating.

## Establish applicability

Before applying hard defaults, classify the project's capabilities in
`docs/discovery.md`: deployable runtime, persistent data, human auth, machine auth,
background jobs or external delivery, public network exposure, file storage, and
multiple independently deployed components. Mark each **applicable**, **planned**, or
**not applicable**, with evidence or a one-line rationale.

A default is mandatory only when its capability is applicable. A capability marked
planned enters stages or the register with a trigger. Not applicable is not a deviation;
silently omitting an applicable default is. Phase 0 follows the resulting contour: a
service deploys and answers health checks; a CLI installs and runs; a library builds,
packages, and works in a consumer example; a data job runs and reruns safely on
representative input.

## Choose the mode

| Signal | Mode |
|---|---|
| Empty or near-empty repo, "new project", a product brief | **Bootstrap** |
| Existing codebase; "переделка", overhaul, inherited project, "bring order" | **Audit** |
| A point request: phase slice, ADR, drift check, debt entry, spike | **Reference** |

If ambiguous, ask which mode the user wants before doing anything else.

## Mode: Bootstrap (greenfield)

1. **Intake.** Read the brief. If there is none, ask the user for a free-form brain dump
   (product idea, users, constraints, stack preferences, deployment target). Do not
   interrogate before letting them talk.
2. **Open discovery.** Create `docs/discovery.md` from
   [templates/discovery.md](templates/discovery.md). This is the only project artifact
   created while high-impact unknowns remain open.
3. **Fix the artifact language and applicability** in discovery (see above). Do not
   implement infrastructure for capabilities marked not applicable.
4. **Build the unknowns register inside discovery.** List every open question the
   artifact core needs answered, grouped by impact. Typical unknowns: target users and
   core jobs, scale, product non-negotiables, stack constraints, release target, auth
   model, data sensitivity, timezone/locale, solo-vs-team process expectations.
5. **Close unknowns one question at a time**, most impactful first, per
   [references/ai-collaboration.md](references/ai-collaboration.md). Batch only trivia.
   Record every answer immediately in discovery. Do not generate the canonical artifact
   core while high-impact unknowns remain open.
6. **Generate the artifact core and promote decisions** from discovery into their
   canonical destinations, in dependency order: PRD → product principles & domain rules
   → tech-stack (verify every version against official docs, record the verification
   date) → stages (phase 0 follows the applicable contour) → architecture sketch →
   registers → ADR index and foundational ADRs (stack choice, applicable auth model, and
   any decision that was genuinely contested) → `CLAUDE.md` last, referencing the rest.
   Record each destination in discovery, mark it complete, and thereafter treat it as
   historical context rather than a parallel authority.
7. **Set up the applicable gates** per [references/gates.md](references/gates.md): local
   verification script, pre-push feedback hook, required CI checks, and a recorded git
   workflow profile — concrete commands come from the chosen stack.
8. **Open phase 0** with a requirements slice per [references/process.md](references/process.md).
9. **Consistency pass.** Re-read the generated set as a whole; fix contradictions
   before showing the result. Present a summary: artifacts created, decisions recorded,
   unknowns that remain (they go to the blockers file or the register, never silently).

## Mode: Audit (brownfield)

1. **Inventory.** Map what exists: code layout, docs, process signals (CI config, hooks,
   scripts, commit history, release tags), implicit decisions baked into the code
   (auth model, data handling, deployment), and which capabilities are applicable.
   Record applicability in `docs/discovery.md`; cheap subagents are appropriate for the
   scanning, but the analysis is yours.
2. **Gap analysis.** Compare findings against the ten rules and the four reference
   standards only where their capabilities apply. Classify each applicable item:
   present / partial / missing / contradicts. Record not-applicable items with rationale,
   but do not report them as gaps.
3. **Retro-ADRs.** Significant implicit decisions get recorded as ADRs with status
   "accepted (retroactive)" and the observed rationale. Do not relitigate them — record
   them so future changes have a baseline.
4. **Gap plan.** A prioritized adoption plan, ordered by safety-of-change: first make
   change safe (local verification, required CI, `CLAUDE.md`, status line,
   applicable backup/restore path), then the docs
   spine (PRD-as-is, stages, registers), then process (phase slices), then platform
   gaps. Phase the plan like any other work.
5. **Boundaries.** The standard governs artifacts, process, and gates — it does **not**
   mandate rewriting working code to match anyone's style. Code changes enter the plan
   only where the code contradicts a non-negotiable or blocks a gate.
6. Present the gap report and plan; start executing only after the user approves scope.

## Mode: Reference (point operations)

| Request | Do |
|---|---|
| "Start phase N" | Requirements slice per [references/process.md](references/process.md); use [templates/phase-slice/](templates/phase-slice/) |
| "Close phase N" | Phase DoD checklist; graduate open blockers to the register; sync `CLAUDE.md` status |
| "Record a decision" | ADR from [templates/adr.md](templates/adr.md); update the index |
| "Check drift" | Compare `CLAUDE.md`/docs against code and recent history; fix or flag every mismatch |
| "Register debt/risk" | Entry in the register per [templates/registers.md](templates/registers.md) |
| "Run a spike" | Spike convention in [references/process.md](references/process.md); outcome becomes an ADR |
| "Review my ADRs / stages / …" | Evaluate against the matching reference standard; report gaps |

## Files

References (the standard — load what the task needs):
- [references/artifacts.md](references/artifacts.md) — the artifact core: every artifact's purpose, hard defaults, maintenance rules
- [references/process.md](references/process.md) — phases, requirements slices, subphase discipline, DoD, spikes
- [references/gates.md](references/gates.md) — local verification, hooks, CI, release & git discipline
- [references/platform.md](references/platform.md) — early platform decisions: observability, security, data integrity, operations
- [references/ai-collaboration.md](references/ai-collaboration.md) — rules for the agent: memory, verification, autonomy boundaries, discovery technique

Templates (instantiate, translating headings into the artifact language):
- [templates/discovery.md](templates/discovery.md), [templates/claude-md.md](templates/claude-md.md),
  [templates/prd.md](templates/prd.md),
  [templates/tech-stack.md](templates/tech-stack.md), [templates/stages.md](templates/stages.md),
  [templates/architecture.md](templates/architecture.md), [templates/adr.md](templates/adr.md),
  [templates/adr-index.md](templates/adr-index.md),
  [templates/registers.md](templates/registers.md), [templates/runbook.md](templates/runbook.md),
  [templates/spike.md](templates/spike.md), [templates/phase-slice/](templates/phase-slice/)
