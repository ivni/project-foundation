---
name: run-phase-direct
description: Execute the remaining subphases of one prepared phase in the current agent, with independent review and recovery. Start only when the user invokes this workflow.
---

# Run Phase Direct

Complete one prepared phase sequentially **in this agent**. Do not spawn implementation workers,
subagents, or a background orchestrator. Invoke the installed `run-subphase` for one subphase at a
time in this same context, and resume control after each subphase. Read its actual instructions and
subphase contract. Standalone `run-subphase` still ends after one subphase; this workflow changes
only the continuation boundary, not entry, verification, review or commit gates.
Read [references/checkout-lease.md](references/checkout-lease.md) and claim its checkout-wide lease
before writing the direct checkpoint or implementing work. Keep it across all subphases and release
only after the active owner is terminal and its effects are reconciled.

The invocation authorizes local implementation, checks, commits and selected independent review
within this phase, including identified bounded review continuations. Honor narrower instructions,
the recorded git profile and actual permission decisions. It does not authorize push, PR/MR, tag,
release, deployment, external issue updates, unrelated dependency changes, or work after session
closure. If Codex is the chosen loop, the invocation authorizes sending phase changes and minimum
relevant context to OpenAI Codex for review, including in-scope fixes and later passes. Do not change
review provider or infer approval for an unapproved fallback.

## Restore and execute

Resolve one phase from the explicit selection, existing checkpoint or unambiguous current phase;
reconcile conflicts and ask if selection remains ambiguous. Resolve paths from the agent contract.
Read the complete scope, checklist, blockers, glossary and relevant ADRs. Require the existing slice
and ticked `N.0`; do not create or change its requirements. Pin checkout, branch, phase, slice paths,
scope digest, verification command and chosen installed review loop. The slice owns scope, order and
progress. Restore unfinished work before the first unticked subphase, including suffixed siblings;
never skip predecessors or start another phase.

Inspect existing phase and feature owners before writing. Do not start while another writer is active;
an old timestamp is not proof of termination. Preserve unrelated work and attribute unfinished work
to the same subphase before resuming. Use a separate
`.agents/work/phases/phase-<N>.direct.json` recovery record, with a stable safe ID for nonnumeric
phases, not a fresh-worker sidecar. Write atomically using sibling temporary file and rename. Serialize
its updates with an exclusive short-lived lock in addition to the checkout lease; record an actual owner handle and inspect
it before removing a leftover lock or taking ownership. Never age out an owner. Validate paths and
preserve existing records. Record an explicit active, awaiting-input, interrupted, cancelled or
completed status and the actual owner handle while active. Clear active ownership only after observing
the owner has stopped or after this agent completes the run. Record run identity, checkout/branch,
phase/slice/scope digest, user authority and constraints, selected loop, current subphase/action,
starting HEAD, owned changes, checks/review evidence and ledger, recovery commit, stop request,
question and remaining work. This is recovery metadata, not a second plan; do not silently change
ignore rules or exclude implementation from review.

Resolve review using `run-subphase`'s selection rules and the user's explicit choice. Preflight the
selected installed loop's actual independent CLI adapter and isolation before implementation. Do not
use a native reviewer subagent. Preserve the provider, command, environment, result and limits; a
preflight does not establish authentication, model access or future permission. Diagnose authorized
paths and stop before implementation if the required capability remains unavailable; never use
self-review or change the selected provider silently.

Run one `run-subphase` in this agent. At its return inspect the completion commit and current branch,
required checks, tested state, acceptance and traceability evidence, independent review and permitted
deferrals, checklist and status. Reconcile an existing committed increment without implementing it
again. Reconcile any cleanup-pending record before selecting a subphase. Only after all gates, including
verified cleanup, pass and the checkpoint is cleared, reread the slice and select the next subphase.
Honor scope or verification changes and retain split siblings in recorded order. After the
last subphase verify phase-wide test cleanup under the subphase contract, then the full phase
definition of done. Test edits belong before applicable checks, independent review and commit;
do not treat them as post-commit temporary cleanup. Complete phase-wide cleanup per the phase
workflow, even if delivery gates remain pending; report those gates honestly and do not start another
phase or perform unauthorized delivery actions.

## Recovery and stopping

Diagnose ordinary errors and retry the same subphase with a changed approach; preserve side effects.
For a bounded review stop, retain its full ledger, fixes and tested states, record the diagnosis and
changed approach, and start a new identified bounded review run under this workflow's authority.
Never use pass 11, discard unresolved findings, weaken isolation or silently switch reviewer.

Checkpoint before compaction or interruption. On resumption reconcile the actual diff, history,
checklist and review ledger before continuing the same subphase. Do not treat compaction as completion
or start the next subphase over uncommitted or unreviewed work. If context is insufficient, preserve
evidence and remaining work; use host compaction when available, otherwise stop honestly and resume
when the user returns. Split oversized work only under the subphase contract and keep every gate.
On cancellation record the stop, reconcile effects, and resume only on explicit request. For missing
stakeholder decisions, permission, access or unresolved scope, save the exact question and sources
checked, then stop. No automatic continuation after session closure.

Report completed and remaining subphases, checks, review, commits, phase status and any exact blocker.
