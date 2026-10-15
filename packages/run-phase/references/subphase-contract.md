<!-- Canonical source. Do not edit the generated copies under packages/*/references/. -->
# The subphase contract

The unit of daily progress is the subphase. This file defines what one is, how large it may be, and
when it is done. The agent that plans subphases and the agent that executes them work from the same
copy, so neither can hold a private definition of "done".

## What a subphase is

A subphase is one coherent, committable increment — typically one to a few commits — **sized to one
fresh context window**. An agent that starts from `scope.md`, `checklist.md`, `blockers.md`, and the
repository, with no conversational history, must be able to carry it to done.

That sizing rule has two consequences, and both are diagnostic rather than inconvenient:

- Needing to compact or clear context mid-subphase means it was two subphases. Split it by appending
  a suffixed sibling (`N.3` keeps what was finished, `N.3a` carries the rest) rather than renumbering
  what follows, so the traceability table and earlier commit messages stay valid.
- Needing a fact that was only ever said in chat means the slice is not recorded yet. Record it in the
  artifact that owns it — scope, blockers, glossary, ADR — and never keep a session alive as that
  fact's storage.

## When a subphase is done

A subphase is done only when **all** of the following hold:

- Local verification green through the project's single recorded entry point; required CI green before
  merge or release.
- Changed behavior has proportionate acceptance and regression evidence under the rules below, and
  the change is verified by actually running it — not only by tests and typecheck passing.
- Relevant related paths checked when a change or defect can affect them. Repeated syntax alone does
  not require a tree-wide sweep, per-hit ledger, or a universal detector of future occurrences.
- Every linked requirement has acceptance evidence recorded in the traceability table. Evidence is a
  command and its result, or a reference to an existing CI result or recorded observation identifying
  the tested state; "tested manually", "works as expected", and "verified" alone are not evidence.
- Docs updated in the same change (same-change rule).
- `checklist.md` ticked; the agent-contract status line updated if the completion is externally
  meaningful.

## Proportionate verification and test maintenance

Reuse or adapt existing tests before adding new ones. Checks must observe the changed contract and
detect its violation; matching coverage lines or a green run alone does not establish this. Preserve
automated regression protection for substantive repeatable behavior. For reversible, low-risk changes,
a planned probe or manual flow can suffice when it directly verifies acceptance criteria and leaves no
material regression risk unprotected. Required project gates still apply.

Review tests affected by the change. Remove obsolete tests when their requirement or supported path
has been retired; consolidate duplicates only when a retained check detects the same failure under
the relevant conditions. Preserve unique boundaries, error paths, and regression cases. Different
test levels can protect different failures of the same behavior. Prefer observable outcomes over
incidental implementation details, but retain checks of internals when they enforce an actual contract,
such as operation ordering or resource limits.

Do not delete or weaken a test merely because it fails, is flaky, slow, or hard to update. If its
protection is unclear, retain it until that is resolved. Briefly explain removals and retained protection
in the change summary, then run applicable checks. No whole-suite audit, deletion quota, or separate
test-value register is required. Test count and coverage growth are not goals in themselves; existing
required coverage thresholds remain in force.

Commit granularity follows subphases; a commit message names the phase and subphase when one applies.
