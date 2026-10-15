---
name: run-phase
description: Orchestrate the remaining subphases of one prepared phase with fresh workers, verified progress, and recovery. Start only when the user invokes this workflow.
---

# Run Phase

Orchestrate **one** existing phase requirements slice. Launch a fresh `run-subphase` executor,
await its terminal result, verify completion, then launch the next fresh executor without another
user command or manual compact. Keep implementation in the executor, not the parent conversation.
Never start the next phase automatically.

Automatic discovery is not execution authority. A user invocation authorizes sequential subphase
workers, independent review and new bounded review cycles within the agreed phase, local checks,
commits and factual progress updates. It adds no push, PR/MR, merge, tag, release, deployment,
external issue mutation, dependency installation, global configuration change or work after session
closure. Honor narrower instructions and the recorded Git profile.

Read [references/phase-workflow.md](references/phase-workflow.md) for selection, durable state,
packets, results and recovery, [references/subphase-contract.md](references/subphase-contract.md)
for completion, and [references/hosts.md](references/hosts.md) before dispatch.

## Restore and select

Resolve the phase from the user's explicit selection, an existing run checkpoint, or an unambiguous
current phase in the agent contract. If those disagree, reconcile before writing. If several phases
are plausible, ask for the phase; do not choose a new phase from the roadmap. Resolve actual slice
paths from the agent contract. Require the existing scope, checklist, blockers and ticked `N.0`.
Creating or changing a requirements slice belongs to its owner, not this workflow.

Read the whole selected checklist, scope, blockers, glossary, relevant ADRs and agent contract.
The slice owns scope/order/progress; the sidecar owns recovery only. Pin checkout, branch, phase,
slice paths and scope digest. Restore an unfinished subphase before selecting the first unticked
one in checklist order, including suffixed siblings. Do not skip predecessors or interpret phase
definition-of-done checkboxes as subphases.

Preflight available `run-subphase` and review skill roots, permissions, the recorded verification
command and fresh-worker lifecycle. Keep `run-subphase`'s entry gates. Research and resolve safe
engineering problems inside the agreed scope; a missing stakeholder decision, inaccessible runtime,
unapproved fallback or required scope change needs its concrete user answer. Never tick an open
blocker or invent acceptance criteria to pass a gate.

## Dispatch, await and verify

Persist a reservation before spawning, bind the actual child handle immediately and keep one writer
at a time. An old timestamp does not prove an executor stopped. Await or stop the real owner before
replacement, including on parent recovery. Send the minimal pinned packet; do not fork the parent
conversation or reuse a completed worker. Carry existing exclusions, approvals with scope/source,
review history, changed approach and any committed-result recovery SHA.

Await actual terminal status, then inspect the persisted result and current repository artifacts.
For `subphase-complete`, independently check:

- The result identifies this run, attempt, checkout, branch, phase and reserved subphase.
- The completion commit(s) exist on the pinned branch, descend from the starting state and contain
  this increment. Acceptance evidence and green required checks identify the tested state.
- The selected installed review loop permits committing; unresolved blocking findings remain
  blocking and permitted deferrals are in the register in the same commit. Evidence covers the
  committed substantive changes. Inspect allowed administrative completion deltas separately.
- The linked requirement rows have concrete evidence, the checklist is ticked in the completion
  commit and current file, and the agent status is accurate. No substantive uncommitted task edit
  remains; unrelated work stays excluded. Scope or verification changes require reconciliation.

A child's success sentence, exit zero or ticked checkbox alone is insufficient. Persist verified
completion and clear the checkpoint only after all gates pass; then read the current checklist and
dispatch the next subphase. Never advance on malformed, stale or unsupported results.

## Recover and finish

Diagnose ordinary errors, preserve side effects and retry the **same** subphase with a fresh worker.
At a bounded review stop, preserve the run and ledger, diagnose the cause, and authorize a new
identified review run with a changed approach and unresolved findings. Never add pass 11 to the old
run or use a reset as evidence of convergence. Review selection/independence and all gates remain.
There is no arbitrary retry-count blocker; missing user information or permission still requires an
answer, and denied actions are not retried blindly.

If a commit already exists but closeout failed, reconcile its evidence/checklist/status instead of
implementing or committing the increment again. A context-size split follows the subphase contract:
only a coherent green, reviewed part can complete; keep appended siblings and their requirement
mapping in the checklist, verify them, then continue in recorded order.

For `needs-user-input`, save the concrete question, missing fact and sources checked, then stop;
a sufficient answer resumes the same subphase. For interruption, preserve the remaining action and
reconcile effects on resume. On explicit cancellation persist the stop request, stop and await the
owned worker, inspect effects and retain recovery evidence. A late success cannot advance a cancelled
run. Explicit cancellation requires explicit resume.

After the final subphase, check the phase's full definition of done. Record factual administrative
closure only if every criterion is evidenced. If CI, runtime acceptance or another delivery gate is
pending, report subphases implemented with that gate pending; do not mark the phase closed, fabricate
evidence or perform an unauthorized delivery action. A substantive closure fix needs a fresh scoped
executor and independent review, not an unreviewed parent edit. Stop at this phase boundary.

Report brief subphase progress and a self-contained result with completed/remaining subphases,
checks, review, commits, phase status and any exact question. Keep state and evidence for resumption.
