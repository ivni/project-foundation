---
name: project-foundation
description: Opinionated, stack-agnostic method for laying a project's product and engineering foundation — product value and UX contract, agent-led technical synthesis, architecture, process, and artifact set. Use when starting a new project (product discovery → technical synthesis → artifact core → gates), when overhauling or inheriting an existing codebase (audit → gap plan → retro-ADRs), or for point tasks — start or close a phase requirements slice, write an ADR, check docs-vs-code drift, register tech debt or risks, run a spike.
---

# Project Foundation

An opinionated engineering method for the **solo engineer + AI agent** setup. It defines
a standard (normative rules for artifacts, process, gates, and platform decisions) and the
process for establishing it on a new project or retrofitting it onto an existing one.

The standard is directive within the project's applicable capabilities. "We didn't get
around to it" is not a deviation; it is a violation.

## Normative language

- **MUST** — required for an applicable capability. Deviation requires explicit user
  approval and a full ADR describing the risk and compensating control.
- **SHOULD** — the recommended default. Deviate with a short rationale in the canonical
  artifact; use a mini-ADR when the choice is cross-cutting or hard to reverse.
- **MAY** — optional; no deviation record is required.
- **N/A** — the capability does not apply. Record a one-line rationale in discovery;
  this is not a deviation.

The ten rules below are MUST unless they explicitly say SHOULD, MAY, or depend on an
applicable capability. Elsewhere, `must`, `never`, and `only` mean MUST; a labeled
`Default:` means SHOULD unless the text explicitly raises it to MUST.

## The standard in ten rules

1. **Docs are the project contract and the agent's inter-session memory.** They record
   intent, decisions, process, and status; code records the implementation; runtime
   observation records current behavior. A mismatch is a defect to investigate, not
   permission to overwrite either side blindly.
2. **Discovery exists from day one; the artifact core exists before build:**
   `docs/discovery.md` captures product value, functional and UX intent, applicability, routed
   unknowns, and engineering implications, then the agent contract, PRD,
   tech-stack, stages, ADR log with index, architecture-lite sketch, and registers
   become canonical before phase 0 starts.
3. **Phase 0 proves the thinnest releasable path appropriate to the project.** It always
   exercises build, verification, packaging, release, and rollback. Deploy, auth,
   health checks, migrations, backups, and observability join it when applicable.
4. **Every phase starts with a requirements slice** — scope, checklist, blockers,
   consistency-check — and unknowns are resolved or correctly routed with a safe interim default
   *before* code is written. Stakeholders decide outcomes and constraints; the agent researches and
   synthesizes implementation mechanisms.
5. **Non-negotiables are written down:** the agent contract is the sole canonical home
   for 5–7 product principles with stable `PRINC-NNN` IDs, plus the domain rules code
   must enforce. Other artifacts reference principle IDs instead of mirroring their
   wording. Violating one is a bug, not a style choice.
6. **One local verification entry point** (lint + format check + typecheck + fast tests
   + audit). A pre-push hook provides fast feedback; required CI checks are enforcement.
7. **Decisions are recorded.** Anything hard to reverse, cross-cutting, or surprising
   gets an ADR. MUST deviations require explicit approval and a full ADR; cross-cutting
   SHOULD deviations get a mini-ADR.
8. **Debt and risk live in a register** with an owner and a review trigger. Known debt
   without a register entry violates the standard.
9. **Applicable platform questions are answered early through agent-led synthesis** — observability,
   auth model, time handling, idempotency, backups — using the capability-conditional defaults in
   [references/platform.md](references/platform.md). Ask the user only for product-visible policy,
   budget, timing, or risk trade-offs that the evidence cannot supply.
10. **Releases are deliberate:** every released artifact is versioned; applicable
    deploy or publish paths run from the version, backup precedes applicable migrations,
    rollback is documented, and the real release path is rehearsed in phase 0.

## Artifact language

This skill and its templates are English. The language of *generated artifacts* is a
per-project decision: default to the language of the user's brief, confirm during
discovery, record it first in `docs/discovery.md`, then promote it into the project's
agent contract with the artifact core. Apply it consistently (docs, commit messages,
register entries). Translate template headings when instantiating.

## Choose the agent contract

Select the project-level instruction file during discovery and record its path in
`docs/discovery.md`. Reuse an existing project convention. Otherwise default to
`CLAUDE.md` for Claude Code, `AGENTS.md` for Codex, or a user-specified equivalent.
In this skill, **agent contract** means that selected file; instantiate
[templates/agent-contract.md](templates/agent-contract.md) at the chosen path. Do not
create competing instruction files unless the user explicitly requests synchronized
adapters and names one canonical contract.

## Establish applicability

Before applying capability-conditional rules, classify the project's capabilities in
`docs/discovery.md`: deployable runtime, persistent data, human auth, machine auth,
background jobs or external delivery, public network exposure, file storage, and
multiple independently deployed components. Mark each **applicable**, **planned**, or
**N/A**, with evidence or a one-line rationale.

Derive applicability from the brief, product behavior, code, and runtime evidence whenever possible.
Ask the user about externally meaningful behavior or constraints, not about the infrastructure that
implements them.

A capability-conditional rule applies only when its capability is applicable: MUST is
required, SHOULD is recommended, and N/A is not a deviation. A capability marked planned
enters stages or the register with a trigger. Silently omitting an applicable MUST is a
violation. Phase 0 follows the resulting contour: a
service deploys and answers health checks; a CLI installs and runs; a library builds,
packages, and works in a consumer example; a data job runs and reruns safely on
representative input.

## Respect requested write scope

Read-only instructions override every workflow step that creates, edits, fixes, records,
scaffolds, or commits. When the user asks to review, audit, assess, or plan without
changes, inspect the project and return discovery, applicability, drift, and gap results
in the response only. Do not create `docs/discovery.md` or any other artifact until the
user explicitly authorizes writes. Proposed patches are not authorization to apply them.

## Choose the mode

| Signal | Mode |
|---|---|
| Empty or near-empty repo, "new project", a product brief | **Bootstrap** |
| Existing codebase; "переделка", overhaul, inherited project, "bring order" | **Audit** |
| A point request: phase slice, ADR, drift check, debt entry, spike | **Reference** |

If ambiguous, ask which mode the user wants before doing anything else.

## Mode: Bootstrap (greenfield)

1. **Intake.** Read the brief. If there is none, ask the user for a free-form brain dump
   (problem, users, current alternative, desired value, essential functionality, UX priorities,
   business constraints, stack preferences, deployment target). Do not interrogate before letting
   them talk or assume they can choose implementation mechanisms.
2. **Open discovery.** When writes are authorized, create `docs/discovery.md` from
   [templates/discovery.md](templates/discovery.md); it is the only project artifact
   created while high-impact unknowns remain open. In read-only work, use the same
   structure in the response without creating the file.
3. **Fix the agent contract path, artifact language, and applicability** in discovery
   (see above). Do not implement infrastructure for capabilities marked N/A.
4. **Build the routed unknowns register inside discovery.** For every unknown record its decision
   lane — product value, functionality and domain, UX, business constraint, or engineering — and its
   resolution route: stakeholder decision, agent research, user research, engineering synthesis,
   spike, or deferred default. Typical stakeholder unknowns include target users, current
   alternatives, desired value, success and guardrails, minimum useful outcome, core journey,
   non-goals, product principles, domain rules, policy, budget, and timing. Typical engineering
   unknowns include scale, stack constraints, release target, auth mechanism, data representation,
   and deployment topology.
5. **Close stakeholder unknowns one question at a time** through value, behavior, experience and
   business, then handoff gates, per
   [references/ai-collaboration.md](references/ai-collaboration.md). Batch only trivia. Ask for
   outcomes, observable behavior, policy, priorities, and constraints; do not ask the user to choose
   schemas, indexes, frameworks, API patterns, or migration mechanisms unless they explicitly
   request technical collaboration. Record every answer immediately in discovery, or in the
   read-only report when writes are not authorized.
6. **Perform agent-led technical synthesis.** Translate the agreed product, domain, UX, and business
   contract into architecture and quality constraints. Research repository and official-source facts,
   apply safe capability defaults, identify ADR candidates, and route irreducible uncertainty to a
   bounded spike. Ask the user only when the remaining choice changes observable behavior, policy,
   budget, timing, or accepted risk. Product discovery may complete while technical mechanisms remain
   routed to synthesis; do not generate the canonical artifact core while a high-impact stakeholder
   decision is open or a high-impact engineering unknown lacks containment and an owner or method.
7. **When writes are authorized, generate the artifact core and promote decisions**
   from discovery into their canonical destinations, in dependency order: product
   intent into PRD → product principles with stable `PRINC-NNN` IDs and domain rules
   into the agent contract (the sole editable principle list; PRD and phase slices
   reference it) → tech-stack (**MUST** record each constraint type, official source
   URL, verification date, and lifecycle/EOL) → stages (phase 0 follows the applicable
   contour) → architecture sketch → registers → ADR index and foundational ADRs (stack
   choice, applicable auth model, and any decision that was genuinely contested) →
   complete the agent contract last, referencing the rest.
   Record each destination in discovery, mark it complete, and thereafter treat it as
   historical context rather than a parallel authority.
8. **Set up the applicable gates** per [references/gates.md](references/gates.md): local
   verification script, pre-push feedback hook, required CI checks, and a recorded git
   workflow profile — concrete commands come from the chosen stack.
9. **Open phase 0** with a requirements slice per [references/process.md](references/process.md).
10. **Consistency pass.** Re-read the generated set as a whole; fix contradictions,
   duplicated editable principle lists, and unresolved `PRINC-NNN` references before
   showing the result. Present a summary: artifacts created, decisions recorded,
   unknowns that remain (they go to the blockers file or the register, never silently).

## Mode: Audit (brownfield)

1. **Inventory.** Map what exists: code layout, docs, process signals (CI config, hooks,
   scripts, commit history, release tags), implicit decisions baked into the code
   (auth model, data handling, deployment), the current or selected agent contract,
   and which capabilities are applicable.
   If writes are authorized, record applicability in `docs/discovery.md`; otherwise keep
   it in the read-only report. Cheap subagents are appropriate for scanning, but the
   analysis is yours.
2. **Gap analysis.** Compare findings against the ten rules and the four reference
   standards only where their capabilities apply. Classify each applicable item:
   present / partial / missing / contradicts. Record N/A items with rationale,
   but do not report them as gaps.
3. **Retro-ADRs.** Significant implicit decisions become ADRs with status
   "accepted (retroactive)" and the observed rationale. When read-only, propose the
   entries in the report; when writes are authorized, record them. Do not relitigate
   them — preserve a baseline for future changes.
4. **Gap plan.** A prioritized adoption plan, ordered by safety-of-change: first make
   change safe (local verification, required CI, agent contract, status line,
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
| "Close phase N" | Phase DoD checklist; graduate open blockers to the register; sync agent-contract status |
| "Record a decision" | ADR from [templates/adr.md](templates/adr.md); update the index |
| "Check drift" | Compare the agent contract/docs against code and recent history; report every mismatch; fix only when writes are authorized |
| "Register debt/risk" | Entry in the register per [templates/registers.md](templates/registers.md) |
| "Run a spike" | Spike convention in [references/process.md](references/process.md); outcome becomes an ADR |
| "Review my ADRs / stages / …" | Evaluate against the matching reference standard; report gaps |

## Files

References (the standard — load what the task needs):
- [references/artifacts.md](references/artifacts.md) — the artifact core: every artifact's purpose, normative rules, maintenance rules
- [references/process.md](references/process.md) — phases, requirements slices, subphase discipline, DoD, spikes
- [references/gates.md](references/gates.md) — local verification, hooks, CI, release & git discipline
- [references/platform.md](references/platform.md) — early platform decisions: observability, security, data integrity, operations
- [references/ai-collaboration.md](references/ai-collaboration.md) — rules for the agent: memory, verification, autonomy boundaries, discovery technique

Templates (instantiate, translating headings into the artifact language):
- [templates/discovery.md](templates/discovery.md), [templates/agent-contract.md](templates/agent-contract.md),
  [templates/prd.md](templates/prd.md),
  [templates/tech-stack.md](templates/tech-stack.md), [templates/stages.md](templates/stages.md),
  [templates/architecture.md](templates/architecture.md), [templates/adr.md](templates/adr.md),
  [templates/adr-index.md](templates/adr-index.md),
  [templates/registers.md](templates/registers.md), [templates/runbook.md](templates/runbook.md),
  [templates/spike.md](templates/spike.md), [templates/phase-slice/](templates/phase-slice/)
