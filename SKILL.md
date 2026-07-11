---
name: project-foundation
description: Opinionated, stack-agnostic method for laying a project's foundation — architecture, process, and artifact set. Use when starting a new project (bootstrap discovery → artifact core → gates), when overhauling or inheriting an existing codebase (audit → gap plan → retro-ADRs), or for point tasks — start or close a phase requirements slice, write an ADR, check docs-vs-code drift, register tech debt or risks, run a spike.
---

# Project Foundation

An opinionated engineering method for the **solo engineer + AI agent** setup. It defines
a standard (hard defaults for artifacts, process, gates, and platform decisions) and the
process for establishing it on a new project or retrofitting it onto an existing one.

The standard is directive: defaults are not suggestions. Deviating is allowed, but only
deliberately — every deviation gets a mini-ADR recording what was changed and why.
"We didn't get around to it" is not a deviation; it is a violation.

## The standard in ten rules

1. **Docs are the system of record and the agent's inter-session memory.** The project's
   `CLAUDE.md` is the working contract; a stale doc is a bug, not a nuisance.
2. **The artifact core exists from day one:** `CLAUDE.md`, PRD, tech-stack, stages plan,
   ADR log with index, architecture sketch (C4-lite), debt & risk register.
3. **Phase 0 is a walking skeleton:** the thinnest deployable slice through the full
   contour (repo, CI, deploy, auth stub, logging, health checks) ships before any feature.
4. **Every phase starts with a requirements slice** — scope, checklist, blockers,
   consistency-check — and unknowns are closed *before* code is written.
5. **Non-negotiables are written down:** 5–7 product principles plus the domain rules
   code must enforce. Violating one is a bug, not a style choice.
6. **One QA entry point** (single script: lint + typecheck + audit), wired as a pre-push
   gate; CI mirrors it and adds tests.
7. **Decisions are recorded.** Anything hard to reverse, cross-cutting, or surprising
   gets an ADR. Deviations from this standard get a mini-ADR.
8. **Debt and risk live in a register** with an owner and a review trigger. Known debt
   without a register entry violates the standard.
9. **Platform questions are answered early** — observability, auth model, time handling,
   idempotency, backups — using the hard defaults in [references/platform.md](references/platform.md).
10. **Releases are deliberate:** version-tag deploys only, backup before migration,
    rollback documented, the deploy path rehearsed in phase 0.

## Artifact language

This skill and its templates are English. The language of *generated artifacts* is a
per-project decision: default to the language of the user's brief, confirm during
discovery, record it in the project's `CLAUDE.md`, and apply it consistently (docs,
commit messages, register entries). Translate template headings when instantiating.

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
2. **Fix the artifact language** (see above).
3. **Build the unknowns register.** List every open question the artifact core needs
   answered, grouped by impact. Typical unknowns: target users and core jobs, scale,
   product non-negotiables, stack constraints, deployment/hosting, auth model, data
   sensitivity, timezone/locale, solo-vs-team process expectations.
4. **Close unknowns one question at a time**, most impactful first, per
   [references/ai-collaboration.md](references/ai-collaboration.md). Batch only trivia.
   Do not generate artifacts while high-impact unknowns are open.
5. **Generate the artifact core** from [templates/](templates/), in dependency order:
   PRD → product principles & domain rules → tech-stack (verify every version against
   official docs, record the verification date) → stages (phase 0 = walking skeleton) →
   architecture sketch → registers → foundational ADRs (stack choice, auth model, and
   any decision that was genuinely contested) → `CLAUDE.md` last, referencing the rest.
6. **Set up the gates** per [references/gates.md](references/gates.md): QA script,
   pre-push hook, CI skeleton — concrete commands come from the chosen stack.
7. **Open phase 0** with a requirements slice per [references/process.md](references/process.md).
8. **Consistency pass.** Re-read the generated set as a whole; fix contradictions
   before showing the result. Present a summary: artifacts created, decisions recorded,
   unknowns that remain (they go to the blockers file or the register, never silently).

## Mode: Audit (brownfield)

1. **Inventory.** Map what exists: code layout, docs, process signals (CI config, hooks,
   scripts, commit history, release tags), and implicit decisions baked into the code
   (auth model, data handling, deployment). Cheap subagents are appropriate for the
   scanning; the analysis is yours.
2. **Gap analysis.** Compare findings against the ten rules and the four reference
   standards. Classify each item: present / partial / missing / contradicts.
3. **Retro-ADRs.** Significant implicit decisions get recorded as ADRs with status
   "accepted (retroactive)" and the observed rationale. Do not relitigate them — record
   them so future changes have a baseline.
4. **Gap plan.** A prioritized adoption plan, ordered by safety-of-change: first make
   change safe (QA gate, `CLAUDE.md`, status line, backup/restore path), then the docs
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
- [references/gates.md](references/gates.md) — QA entry point, hooks, CI, release & git discipline
- [references/platform.md](references/platform.md) — early platform decisions: observability, security, data integrity, operations
- [references/ai-collaboration.md](references/ai-collaboration.md) — rules for the agent: memory, verification, autonomy boundaries, discovery technique

Templates (instantiate, translating headings into the artifact language):
- [templates/claude-md.md](templates/claude-md.md), [templates/prd.md](templates/prd.md),
  [templates/tech-stack.md](templates/tech-stack.md), [templates/stages.md](templates/stages.md),
  [templates/architecture.md](templates/architecture.md), [templates/adr.md](templates/adr.md),
  [templates/registers.md](templates/registers.md), [templates/runbook.md](templates/runbook.md),
  [templates/spike.md](templates/spike.md), [templates/phase-slice/](templates/phase-slice/)
