# The artifact core

The artifact core is MUST for every project. The listed locations are SHOULD defaults;
use another layout with a short rationale, or a mini-ADR when the change is cross-cutting.
Capability-dependent content may be omitted only when discovery marks that capability
N/A with a rationale.

```
<agent-contract>          # selected instruction file + status line (repo root)
docs/
  discovery.md            # value/UX contract + routed unknowns; historical after promotion
  glossary.md             # the project's canonical language
  PRD.md                  # product: value, users, outcomes, journey, scope, boundaries
  tech-stack.md           # constrained stack with official evidence and lifecycle
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

When writes are authorized, create this first in bootstrap and during the initial
inventory in audit mode (template: [templates/discovery.md](../templates/discovery.md)).
It is the only project artifact written while high-impact unknowns remain open. In
read-only work, return the same structure in the report without creating the file.

It records the brief, product value, functional and UX contract, business constraints,
agent-contract path, artifact language, capability matrix, assumptions, routed unknowns, and derived
engineering implications. Record stakeholder answers and resolution routes as they land, keeping
product decisions distinct from implementation mechanisms. Once high-impact stakeholder unknowns
are closed and high-impact engineering unknowns are resolved or contained with an owner, method, and
interim default, promote every decision into its canonical destination (PRD, tech-stack, stages,
architecture, ADR, register, or the agent contract), record that destination, and mark discovery
complete. A completed discovery file is historical provenance, not a living authority; current
decisions live in the canonical artifacts.

## glossary.md — the project's language

The canonical vocabulary of the problem domain (template:
[templates/glossary.md](../templates/glossary.md)). Every entry records the term, its meaning
in domain language, the **synonyms it replaces**, and its source decision.

Why it is part of the core rather than a nicety: the agent is dropped into the project every
session with no memory of the previous one. Without a recorded language it re-derives the
jargon each time, names identifiers inconsistently, and spends its context restating in twenty
words a concept the project already has one word for. A shared language makes the docs shorter,
the code navigable, and every later artifact cheaper to write.

Rules:

- **It is a glossary and nothing else.** No implementation details, no requirements, no
  decisions — those live in the PRD, the ADRs, and the agent contract. A glossary that has
  started holding decisions has become a second PRD.
- **One term, one meaning.** When a term is used for two things, split it and record both,
  with the losing reading named in `Avoid`.
- **Record the rejected synonyms.** An entry without them does not survive contact with the
  next session.
- **Write it when the term is resolved**, not in a batch at the end. A term settled in
  conversation and not written down is lost.
- Identifiers in code, test names, doc headings, and commit messages use the glossary term.
  Renaming a term updates the glossary, the code, and the docs in the same change.
- Ambiguities that were resolved stay recorded, so the same argument is not had twice.
- In audit mode the glossary is **extracted, not invented**: read the code, docs, and history
  for the language already in use, and record each conflict as a flagged ambiguity rather than
  picking a winner silently.

## Agent contract

The authoritative contract for *how the project is intended to be built*. It is the
first thing the agent reads each session, so it must be dense, current, and free of
unmarked aspiration — implemented state and explicitly marked plans stay distinct.
Code and runtime evidence still determine what is implemented and what actually runs.

Required sections (template: [templates/agent-contract.md](../templates/agent-contract.md)):

- **Status line** — a `> Status:` block near the top: what is implemented, what is in
  progress, what is next. Updated at every phase/subphase completion, in the same
  commit. This is the agent's resume point.
- **Product principles (canonical, non-negotiable)** — the sole editable list of 5–7
  principles, promoted from discovery and assigned stable, never-reused `PRINC-NNN`
  IDs. Each records its statement, operational meaning, detectable violation, and
  source. PRD, phase slices, ADRs, and other artifacts reference these IDs instead of
  mirroring the wording. Adding, removing, or semantically changing a principle MUST
  have explicit user approval and an ADR; an editorial change that preserves meaning
  MAY be made directly. Update affected references in the same change.
- **Project shape & applicability** — the current capability classification promoted
  from discovery; planned capabilities link to stages or a register trigger.
- **Repository layout** — annotated tree.
- **Tech stack** — version constraints and evidence with the rule "verify via official
  docs, never from memory" stated inline; full detail lives in `docs/tech-stack.md`.
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

Problem evidence, users and buyers, current alternatives, desired value, success and guardrails,
minimum useful outcome, core journey, the feature set sketched per phase, and — as important —
explicit non-goals. Record applicable trust, failure, recovery, business, and domain constraints
without embedding architecture choices. The PRD is a living document: phase requirements slices
refine it; when implementation or runtime diverges, determine the intended behavior first. Update
the PRD in the same change only when intent changed; otherwise fix the implementation. Never rewrite
the PRD merely to legitimize a defect. Detail level: enough that the stages plan and technical
synthesis can be derived from it; per-feature detail arrives in phase slices, not upfront. Its
Product principles section MUST link to the canonical agent-contract section and MUST NOT contain a
second editable copy. Product decisions and requirements reference applicable principles by
`PRINC-NNN` ID.

## tech-stack.md

Every entry records a **constraint type** (exact pin, compatible range, managed channel,
API/protocol version, or unversioned), the constraint itself, an official source URL,
verification date, and lifecycle/EOL state. Exact pins are the SHOULD default for
direct dependencies when the ecosystem supports them; managed services record the
provider channel, region/API constraints, and upgrade policy instead of inventing a
package-like pin. Recalled or invented values are forbidden. Non-obvious picks and
rejected alternatives get a sentence of rationale or a full ADR.

## stages.md

The phase plan. Normative rules:

- **Phase 0 proves the thinnest releasable path** for the applicable project contour.
  It always covers build, verification, packaging, release, and rollback. A service
  also exercises deploy and health checks; a CLI installs and runs; a library works in
  a consumer example; a data job runs and reruns safely on representative input.
  Capability-dependent concerns such as auth, migrations, backups, and observability
  join phase 0 only when applicable. No product features.
- Each phase has a **goal** (one sentence) and a **definition of done**.
- Phases are sized in weeks, not months. A subphase is one fresh context window (see
  [process.md](process.md)), so a phase is at most about a dozen windows: if it needs subphase
  numbering past ~12, it was two phases. The two limits cross-check each other — a phase that
  fits the calendar but not the window count was mis-sliced, and vice versa.
- The plan is updated when reality changes — a stages file describing an abandoned plan
  is a bug.

## ADRs

Three cases always get one, whatever else is true:

- A cross-cutting **SHOULD deviation** (mini-ADR: three sentences are enough), or an
  approved MUST deviation (full ADR with risk and compensating control).
- A **spike outcome** (see [process.md](process.md)).
- In audit mode: **retro-ADRs** for significant implicit decisions, status
  "accepted (retroactive)".

Every other decision earns an ADR only when **all three** of the following hold:

1. **Hard to reverse** — changing your mind later carries a real cost.
2. **Surprising without context** — a future reader will ask "why was it done this way?"
3. **The result of a genuine trade-off** — there were viable alternatives and one was chosen
   for stated reasons.

Storage model, auth channel, protocol, error-handling convention, id scheme, and event
delivery usually pass all three; that is why they are the familiar examples, not because
their subject matter is automatically ADR-worthy. If any of the three is missing, record the
decision where it belongs — the agent contract, the PRD, `tech-stack.md`, or a code comment —
and write no ADR. A log padded with decisions nobody would have questioned costs the same
attention as the log of decisions that mattered, and hides them.

Format ([templates/adr.md](../templates/adr.md)): context → decision → consequences,
plus status and date. Numbered sequentially (`0001-…`), never renumbered, indexed in
`docs/adr/README.md` using [templates/adr-index.md](../templates/adr-index.md).
Superseded ADRs stay in place with status "superseded by NNNN".

## architecture.md (architecture-lite)

Two baseline text-based views (Mermaid or equivalent), adapted to the applicable contour:

1. **Context** — the product or artifact, its users/consumers, and external systems.
2. **Runtime / package topology** — deployable units and protocols for a service;
   host, package, and consumer boundaries for a library or CLI; application, platform,
   and backend boundaries for a client; execution units and data flow for a data job.

Additional diagrams MAY document a critical trust boundary, sequence, data lifecycle,
event-failure path, or migration when the baseline views cannot carry the decision.
Every additional view states its purpose and update trigger; delete it when it no longer
earns its maintenance cost. Do not draw N/A infrastructure merely to fill the template.
Avoid routine component diagrams — they rot. All retained views follow the same-change
rule for the boundaries and decisions they document.

## registers.md — debt, risk & out of scope

One file, three tables (template: [templates/registers.md](../templates/registers.md)).
Every entry has a stable id (`DEBT-N` / `RISK-N` / `OOS-N`), a description, an owner, and a
status. Debt and risk entries also carry a **review trigger** (a date or an event: "before
phase 3", "when users > 50").

Rules:

- Known debt without an entry is a standard violation — the register is what makes
  "we'll fix it later" honest.
- Phase blockers (`BLK-P<phase>-<seq>`, see [process.md](process.md)) that outlive their phase
  graduate into this register; they do not silently disappear.
- Review the register at every phase close.

### Out of scope

Work consciously ruled outside the project's goal: a requested capability that was declined,
an idea considered and dropped, a use case the product will not serve. Each entry records what
was asked for, **why it is out of scope**, and what would put it back in.

- An out-of-scope entry is not a **deferred default**. A deferred default is inside the scope
  and returns on its revisit trigger; an out-of-scope entry returns only if the goal itself is
  redrawn, and then as new work rather than a resumption. Recording "the goal changes" as the
  reopen condition is a complete and common answer.
- It is not a substitute for **PRD non-goals** either. Non-goals are the scope boundary
  declared as part of product intent; this register is the running log of individual rejections
  with their provenance. When a rejection moves the boundary itself, update the PRD non-goals in
  the same change and reference the `OOS-N` id — do not let the two disagree.
- Consult it before working a new request. Re-litigating a rejection that is already recorded,
  with no new evidence, is the waste this table exists to prevent.
- Rejections stay recorded after the fact settles. A removed entry is a rediscussion waiting to
  happen.

## Runbooks

One file per procedure you would otherwise reconstruct under stress: deploy,
restore-from-backup, credential rotation, incident triage entry point. A runbook is
exact commands with expected output, not prose. Written when the procedure is first
performed — a deploy that has happened twice without a runbook is overdue.

## Documentation must stay current (the same-change rule)

Any change that alters behavior, structure, or conventions updates the affected
docs **in the same change** — status line, glossary, PRD, stages, architecture, registers,
agent-contract sections. When discovering an existing mismatch, first determine intent:
fix stale docs when implementation is correct; fix or register the code when it violates
the documented decision; report ambiguity or out-of-scope work instead of silently
choosing a winner. Never leave planned behavior described as implemented, or vice versa.
