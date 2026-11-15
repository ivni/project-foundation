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
- Tests attributable to or affected by this subphase reviewed for ongoing value; unnecessary tests
  and unused test helpers/fixtures removed under the maintenance rules below, before final checks,
  independent review and commit. No whole-suite audit is required.
- `checklist.md` ticked; the agent-contract status line updated if the completion is externally
  meaningful.
- Temporary materials attributable to the subphase cleaned up after verification, with necessary
  evidence and recovery records preserved, as specified by the phase workflow.

## Proportionate verification and test maintenance

For UI work, read [UI acceptance and review](ui-verification.md) when defining acceptance or preparing
verification: observable criteria, focused re-review and reusable evidence, without weakening project gates.

Reuse or adapt existing tests before adding new ones. Checks must observe the changed contract and
detect its violation; matching coverage lines or a green run alone does not establish this. Preserve
automated regression protection for substantive repeatable behavior. For reversible, low-risk changes,
a planned probe or manual flow can suffice when it directly verifies acceptance criteria and leaves no
material regression risk unprotected. Required project gates still apply.

As part of finishing a subphase or phase, clean up tests introduced or affected by that work. Remove
retired expectations, duplicates with equivalent retained protection, completed one-time probes with
no ongoing value, and tests whose cost is disproportionate to the low significance of their remaining
risk. A unique test may be removed without replacement when that low-risk tradeoff is supported and
explained within the authorized task. Historical regression status is not immunity. Distinguish
acceptance evidence from permanent regression protection; release, age, or repeated green runs alone
are not reasons to delete. Keep migration checks needed for supported upgrades, installs, or recovery.

Review expensive affected E2E first: keep meaningful user journeys and real integration protection;
move business-rule variants to cheaper levels or remove low-value variants where justified. Different
levels can protect different failures, and internal assertions may enforce ordering or resource limits.
Group tests sharing a rationale, check for exceptions, and name exact removals. Remove related helpers
and fixtures only after checking their remaining consumers. Do this before final checks, review and
commit; a test edit discovered later requires renewed applicable checks and independent review.

Do not delete or weaken a test merely because it fails, is flaky, slow, or hard to update. Preserve
strong protection for consequential failures such as permission bypass, data loss/corruption, and
irreversible operations; reducing that protection requires an explicit stakeholder risk decision.
Unclear protection calls for a bounded investigation, not an assumption of low risk. Briefly explain
removals, retained protection and any accepted residual risk in the existing change summary. No
whole-suite audit, deletion quota, or separate test-value register is required. Test count and coverage
growth are not goals; required project gates and coverage thresholds remain in force.

Commit granularity follows subphases; a commit message names the phase and subphase when one applies.
