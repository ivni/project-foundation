# Phased process

Work proceeds in phases; each phase opens with a requirements slice and closes with an
explicit definition of done. The unit of daily progress is the subphase.

## The requirements slice (phase opening)

Before writing any code for phase N, create `docs/phase-N/` with four files
(templates: [templates/phase-slice/](../templates/phase-slice/)):

- **scope.md** — what this phase delivers and, explicitly, what it does not. Refines
  the PRD for this slice; disagreements between them are resolved *now*, in the PRD.
- **checklist.md** — the phase broken into subphases (`N.0`, `N.1`, …) with a status
  marker each. Subphase `N.0` is always the requirements slice itself.
- **blockers.md** — numbered unknowns and external dependencies (`BLK-1`, `BLK-2`, …):
  things that could invalidate the plan. Each has an owner and a resolution path.
  Blockers that outlive the phase graduate to the debt & risk register.
- **consistency-check.md** — the result of checking the new requirements against
  existing PRD, ADRs, architecture, and code. Every contradiction found is listed with
  its resolution (doc corrected, ADR written, or requirement changed). An empty
  consistency-check on a non-trivial phase is a red flag, not a good sign.

The slice is complete when every high-impact unknown is closed — via the discovery
technique below, via a spike, or by explicitly parking it as a blocker with a
resolution path. **Unknowns are closed before build, not during.**

## Closing unknowns (discovery technique)

1. Collect the brief (or read the existing code/docs in audit mode) *first* — never
   interrogate before absorbing what already exists.
2. Write the unknowns down as an explicit list, ordered by impact.
3. Ask the user **one question at a time**, most impactful first. Each question comes
   with concrete options and a recommended default. Batch only trivial questions.
4. Record every answer immediately — into `docs/discovery.md` during bootstrap, or into
   the current phase/canonical artifact once it exists. An answer that lives only in
   chat is lost.

## Subphases

A subphase is one coherent, committable increment — typically one to a few commits.
A subphase is done only when **all** of the following hold:

- Local verification green; required CI green before merge or release (see
  [gates.md](gates.md)).
- New behavior covered by tests, and the change verified by actually running it —
  not only by tests and typecheck passing.
- Docs updated in the same change (same-change rule).
- `checklist.md` ticked; the `CLAUDE.md` status line updated if the completion is
  externally meaningful.

Commit granularity follows subphases; a commit message names the phase/subphase when
one applies.

## Phase definition of done

- All subphases in `checklist.md` complete.
- All `BLK-N` resolved or explicitly graduated to the register.
- Consistency: intended behavior in PRD, stages, ADRs, and `CLAUDE.md` agrees with code
  and runtime evidence. Resolve every mismatch by correcting the wrong layer; do not
  rewrite intent merely to match an incorrect implementation (walk them; do not assume).
- Debt & risk register reviewed — new entries added, stale entries closed.
- `CLAUDE.md` status line rewritten: phase closed, next phase named.

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
