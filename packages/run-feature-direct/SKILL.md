---
name: run-feature-direct
description: Execute the remaining stages of one published feature in the current agent, with independent review and recovery. Start only when the user invokes this workflow.
---

# Run Feature Direct

Complete one published feature sequentially **in this agent**. Do not spawn implementation workers,
subagents, or a background orchestrator. This user-started workflow invokes the installed
`run-feature-stage` for one stage at a time, in this same context, and resumes control after each
stage. Standalone `run-feature-stage` still ends after one stage. Read its actual instructions and
its feature and issue-publication references; retain their entry, acceptance, review, commit, issue
readback and permission gates. This workflow changes the continuation boundary, not those gates.
Read [references/checkout-lease.md](references/checkout-lease.md) and claim its checkout-wide lease
before writing the direct checkpoint or implementing work. Keep it across all stages and release only
after the active owner is terminal and its effects are reconciled.

The invocation authorizes implementation, local checks, local commits and factual issue progress
within the selected feature, plus its required independent Codex review and identified bounded
review continuations. The authority to send stage changes and minimum relevant context to OpenAI
Codex covers this feature, its in-scope fixes and later passes. Respect narrower instructions and
actual host permission decisions. It does not authorize push, PR/MR, merge, issue closure, release,
deployment, unrelated dependency changes or work after session closure.

## Restore and execute

Resolve and pin one feature, checkout, branch, forge, issue, discovery digest and original base using
`run-feature-stage`'s shared selection rules. Read the live issue, evidence, git state and existing
feature and orchestration checkpoints before writing. Never retarget an active run because the active
pointer changed. Inspect any existing phase or feature owner; do not start while another writer is
active. An old timestamp is not proof of termination. Preserve unrelated work and attribute unfinished
work to the same stage before resuming it.

Use a separate `.agents/work/features/<feature-id>.direct.json` recovery record, not the worker
orchestrator protocol. Write it atomically with a sibling temporary file and rename. Serialize
its updates with an exclusive short-lived lock in addition to the checkout lease; record an actual owner handle and inspect
it before removing a leftover lock or taking ownership. Never age out an owner. Validate paths and
preserve existing records. Record an explicit active, awaiting-input, interrupted, cancelled or
completed status and the actual owner handle while active. Clear active ownership only after observing
the owner has stopped or after this agent completes the run. Record run identity, checkout/branch,
feature/issue, original base, current stage and action, original user authority and constraints,
starting HEAD, owned changes, check and review evidence/ledger, any commit awaiting issue update,
stop request, question and remaining work. It is recovery metadata, not the plan; the live issue is
canonical. Do not silently alter ignore rules or exclude implementation from review.

Before implementation, preflight the installed `run-codex-review-loop` and its actual independent
CLI adapter and isolation in the intended environment. On Codex use its packaged CLI wrapper, not a
native reviewer subagent; on other hosts use the packaged CLI adapter. Preserve the selected reviewer,
preflight outcome and limits. A preflight does not prove authentication, model access or future
permission. If unavailable, diagnose through authorized paths and stop before implementation with
the concrete blocker; never replace independent review with self-review.

Resume an unfinished stage, including a committed result awaiting issue update, before selecting the
first unfinished stage in the freshly read issue. Run one `run-feature-stage` in this agent. At its
return, verify the commit, tested state, independent review and dispositions, acceptance evidence,
issue result and checkboxes against a fresh issue read. Reconcile an already committed stage without
reimplementing or duplicating the commit. Reconcile any cleanup-pending record before selecting a
stage. Only after all gates, including verified cleanup, pass and the checkpoint is cleared may you
select the next stage. Do not skip a blocked predecessor. Re-read current scope and progress at
each boundary. The final stage verifies the feature-wide journey and test cleanup under the feature
workflow. Include test edits in applicable checks, independent review and commit before closeout;
do not delete tests as post-commit temporary cleanup. Complete feature-wide cleanup per
the feature workflow even if delivery gates remain pending, and report them without closing the issue.

## Recovery and stopping

Diagnose ordinary errors and retry the same stage with a changed approach; preserve side effects.
For a bounded review stop, retain its complete ledger, fixes and tested states, record the diagnosis
and changed approach, and start a new identified bounded review run under this workflow's authority.
Never use pass 11, discard unresolved findings, weaken isolation or switch reviewer silently. Do not
blindly retry an uncertain remote write: read back and reconcile first.

Checkpoint before compaction or interruption, and after resumption reconcile the actual diff, git
history, review ledger and live issue before continuing the same stage. Do not treat compaction as
completion or start a new stage on an uncommitted or unreviewed diff. If context is insufficient,
preserve evidence and remaining work; use host compaction when available, otherwise stop honestly and
resume when the user returns. Split oversized work only under the stage contract, without weakening
acceptance. On cancellation record the stop, reconcile effects, and resume only on explicit request.
For missing stakeholder decisions, permission, access or unresolved scope, save the exact question and
sources checked, then stop. No automatic continuation after session closure.

Report completed and remaining stages, checks, review, commits, issue and any precise blocker.
