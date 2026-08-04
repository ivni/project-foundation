# Phased process

Work proceeds in phases; each phase opens with a requirements slice and closes with an
explicit definition of done. The unit of daily progress is the subphase.

## The requirements slice (phase opening)

Before writing any code for phase N, create `docs/phase-N/` with four files
(templates: [templates/phase-slice/](../templates/phase-slice/)):

- **scope.md** — what this phase delivers and, explicitly, what it does not. Every
  requirement gets a stable ID (`REQ-P2-001` form), acceptance criteria, a planned
  verification method, and applicable `PRINC-NNN` references (or an explicit `—`). It
  refines the PRD; disagreements are resolved *now*.
- **checklist.md** — the phase broken into subphases (`N.0`, `N.1`, …) with a status
  marker each. Subphase `N.0` is always the requirements slice itself. Its traceability
  table maps every requirement ID to a subphase, verification method, and evidence.
- **blockers.md** — phase-qualified unknowns and external dependencies
  (`BLK-P2-001`, `BLK-P2-002`, …): things that could invalidate the plan. Each has an
  owner and a resolution path; IDs are globally unambiguous and never reused.
  Blockers that outlive the phase graduate to the debt & risk register.
- **consistency-check.md** — the result of checking the new requirements against the
  canonical product principles, existing PRD, ADRs, architecture, and code. Every
  contradiction is keyed by requirement ID and lists applicable principle IDs plus its
  resolution (doc corrected, ADR written, or requirement changed). An empty
  consistency-check on a non-trivial phase is a red flag, not a good sign.

The slice is complete when every high-impact stakeholder unknown is closed and every high-impact
engineering unknown is resolved or contained — via agent research, engineering synthesis, the
discovery technique below, a spike, or an explicit blocker with an owner, interim default, and
resolution path. **Unknowns are resolved or correctly routed before build, not discovered
accidentally during it.**

## Closing unknowns (discovery technique)

1. Collect the brief (or read the existing code/docs in audit mode) *first* — never interrogate
   before absorbing what already exists.
2. Assign every unknown a decision lane and a resolution route, per
   [decision-routing.md](decision-routing.md), before deciding whether to ask about it.
3. Record what each unknown waits on. An unknown is **takeable** when everything it waits on is
   closed, and the takeable open unknowns are the frontier. Derive that set from the recorded
   dependencies instead of maintaining a separate list of it, and ask inside it only: a question
   whose answer depends on one still open invites an answer built on a guess, which has to be
   unwound later along with everything decided on top of it.
4. Close stakeholder decisions through value, behavior, experience and business, then handoff gates.
   Ask **one question at a time** using observable, plain-language options and a recommended default.
   Batch only trivial questions.
5. Translate the resulting product and UX contract into technical constraints. Research available
   evidence, apply safe reversible defaults, record ADR candidates, and use a spike only for
   uncertainty that reasoning cannot close.
6. When writes are authorized, record every answer and route immediately — into discovery during
   bootstrap, or into the current phase or canonical artifact once it exists. In read-only work,
   retain them in the report. An answer or engineering assumption that lives only in chat is not
   durable.

## Subphases

What a subphase is, its one-context-window size limit, and its definition of done live in
[subphase-contract.md](subphase-contract.md). The `run-subphase` skill ships the same copy, so the
agent that plans subphases and the agent that executes them cannot drift apart on what "done" means.

The local verification entry point and the required CI checks that contract refers to are the ones
established per [gates.md](gates.md).

## Phase definition of done

- All subphases in `checklist.md` complete.
- All `BLK-P<phase>-<seq>` resolved or explicitly graduated to the register.
- Every requirement ID maps to a completed subphase and verification evidence.
- Every requirement names applicable `PRINC-NNN` IDs or explicitly records that none
  apply; no requirement contradicts a canonical product principle.
- Consistency: intended behavior in PRD, stages, ADRs, and the agent contract agrees with code
  and runtime evidence. Resolve every mismatch by correcting the wrong layer; do not
  rewrite intent merely to match an incorrect implementation (walk them; do not assume).
- Debt & risk register reviewed — new entries added, stale entries closed.
- Agent-contract status line rewritten: phase closed, next phase named.

## Spike convention

For a technical unknown that discussion cannot close: a **timeboxed, throwaway**
prototype.

- Timebox agreed upfront (hours or a day, not weeks).
- Spike code lives in a scratch directory or dead-end branch — it is **deleted** when
  the spike ends; it never merges into main.
- The deliverable is knowledge, recorded as an ADR (or a blocker resolution), using
  [templates/spike.md](../templates/spike.md) for the intermediate notes.
- If the answer is "it works and the prototype looks fine" — the ADR records the
  approach, and the production implementation is written fresh, with tests and docs.
  Prototypes do not get promoted; that is the point of the convention.
