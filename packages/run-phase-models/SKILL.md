---
name: run-phase-models
description: Execute one prepared phase with native role-specific models, task-based model and effort selection, independent review and recovery. Start only when the user invokes this workflow.
---

# Run Phase Models

Complete one prepared phase sequentially using native models selected for build, fix, investigate,
UI and architecture advice. The main chat remains the orchestrator and owns verification, independent
review and closeout. Select model AND effort per job from the approved catalog by complexity,
uncertainty and risk, minimizing relative cost and then latency among adequate pairs. Existing
`run-phase` and `run-phase-direct` retain their behavior; never start the next phase automatically.

Read [model-workflow](references/model-workflow.md) before setup/delegation. Read
[phase-workflow](references/phase-workflow.md), [subphase-contract](references/subphase-contract.md)
and the installed `run-subphase` for entry gates, scope, verification, completion and cleanup.
Use its one-subphase checklist as the parent-owned contract; role workers receive bounded jobs,
not the whole `run-subphase` loop. This variant changes ownership and reviewer selection only;
requirements, acceptance, independent review and final-tree evidence remain mandatory.

Invocation authorizes native role jobs within this phase, required local checks/commits and factual
checklist/status updates, plus the approved installed review loop and diagnosed continuation.
Profile approval pins native candidates and review-loop providers with their repository/task scope.
Existing isolated CLI routes are allowed for approved review candidates only. It does not authorize
external implementation CLIs, push, PR/MR, merge, tag, release, deployment, external issue mutation,
global application changes or continued work after session closure.

## Restore and preflight

Resolve the explicitly selected or unambiguous prepared phase from its contract. Require the existing
scope/checklist/blockers and ticked `N.0`; do not create a slice or select another phase yourself.
Read the glossary, relevant ADRs, requirement rows and recorded verification command. The slice owns
scope/order/progress; the models checkpoint owns recovery only.

Follow [checkout-lease](references/checkout-lease.md), with mode `run-phase-models` and
`.agents/work/phases/<phase-id>.models.json`. Inspect every relevant phase/feature checkpoint and
actual owner, reconcile unfinished work and claim before writes/delegation. Keep one native job at
a time. Never overlap an existing orchestrator/direct owner or age out a reservation.

Restore/pin phase, checkout/branch, slice paths/scope digest, original authority, approved profile,
capability evidence and current subphase. Assess the expected review demand and preflight an adequate
approved installed review loop and its real isolation before implementation. Its model/effort must
match the approved candidate. Here the
profile replaces `run-subphase`'s default vendor preference, but not the chosen loop's requirements.

## Execute one subphase

1. Restore the interrupted subphase or take the first unticked one in checklist order, including
   suffixed siblings. Preserve attributed unfinished changes and existing evidence. An existing
   completion commit goes straight to reconciliation; do not duplicate it.
2. Check every entry gate and state the existing verification seams before implementation. An open
   blocker or missing stakeholder choice cannot be resolved by choosing a different model.
3. Use bounded `investigate`/`advisor` jobs only for actual engineering questions. For every job,
   including `build`/`ui` and later fixes, assess complexity, uncertainty and risk and select a suitable
   model AND effort by relative cost then latency. Dispatch fresh native workers with the pinned scope,
   model/effort, profile digest and evidence destination. They must not commit or edit completion
   checkboxes. Await real termination and inspect each result before another job.
4. Run the recorded verification command and acceptance checks. Route supported failures through
   fresh `fix` jobs. Apply required affected-test cleanup and [UI verification](references/ui-verification.md)
   before final checks; capture the exact tested state.
5. Assess review demand and select an adequate approved installed loop with its pinned effort.
   Product fixes are delegated under the shared model workflow; the parent retains findings, dispositions, checks and verdict responsibility.
   Preserve loop identity for the bounded run. If a different approved loop is required after a
   terminal availability failure, start a distinct run carrying every earlier finding and tested state.
6. Verify the review permits commit and covers the actual final substantive changes. Record allowed
   deferrals in the project register. Tick the checklist, add concrete requirement evidence and update
   agent status; inspect administrative deltas separately and re-review any substantive change.
7. Commit under the project's Git profile. Read back the commit, checklist, traceability and status,
   ensuring checks/review identify the committed substantive state. Persist result/SHA before cleanup;
   preserve task assessments/selection reasons and perform verified subphase cleanup before continuing.

## Recover and finish

The shared model workflow governs role-specific availability fallback, real-owner termination,
task reassessment and pending checkpoints. Ordinary errors stay in this subphase. Exhausted review
cycles retain their full ledger and require a changed approach before a new identified run; they
cannot become clean by switching models. Missing user decisions/access/permissions stop with the
specific question. Explicit cancellation requires explicit resume.

Checkpoint before compaction. A fresh parent restores actual work and pending effects, never a
guessed success. Coherent context-size splits follow the subphase contract and preserve sibling
order, mapping, green checks and review. Before another subphase reconcile committed-result,
selection and cleanup-pending records, even if a checkbox is already ticked.

After the final subphase verify phase-wide test cleanup and the complete phase definition of done.
Substantive cleanup/fixes return through a scoped worker, checks and independent review. Report
pending CI/runtime/delivery gates honestly; do not close the phase unless all criteria are evidenced.
Complete temporary-material cleanup, preserve recovery and task assessments, and stop at this
phase boundary. Report commits, checks/review, model selections/fallbacks and remaining work.
