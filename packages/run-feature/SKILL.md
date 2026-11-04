---
name: run-feature
description: Orchestrate the remaining stages of one published feature with fresh workers, verified progress, and recovery. Start only when the user invokes this workflow.
---

# Run Feature

Act as the orchestrator of one already published feature. Launch a fresh `run-feature-stage`
executor, await its terminal result, verify completion, then launch the next fresh executor without
another user command or manual compact. Do not implement the stage in the parent conversation.

Automatic discovery is not execution authority. A user invocation authorizes sequential stage
workers and Codex review continuation within the agreed feature, local checks/commits and issue
progress. A dependency security audit finding authorizes the affected project dependency upgrade and
installation needed to fix and verify it, as specified by the stage skill. It adds no unrelated
dependency installation or upgrades, push, PR/MR, merge, release, deployment, issue closure, global
profile change or background execution after session closure. Honor narrower instructions.
Each executor still consumes exactly one stage, including committed-result recovery.

Read [references/feature-workflow.md](references/feature-workflow.md) and
[references/issue-publication.md](references/issue-publication.md) before selection or remote work.
Read [references/protocol.md](references/protocol.md) for the state/helper/result contract and the
adapter for the current host: [Codex](references/codex.md),
[Claude Code](references/claude-code.md), [Pi](references/pi.md),
[OpenCode](references/opencode.md), or [Hermes](references/hermes.md).
The four non-Codex routes use [references/hosts.md](references/hosts.md) for minimal packets and
process lifecycle. Inspect actual runtime capabilities and effective permissions before dispatch;
an implemented adapter is not proof that the current host is authenticated or accepted end to end.
Read [references/watchdog.md](references/watchdog.md) for progress events, bounded waits,
diagnosis, corrective instructions and terminal-owner replacement before starting workers.
Read [references/checkout-lease.md](references/checkout-lease.md) and acquire its checkout-wide
lease before dispatch; keep it across the run and release it only after terminal-owner reconciliation.

## Restore and dispatch

Resolve the feature once using the shared rules. Verify repository, issue marker, discovery digest,
original base and completed predecessor commits in the selected checkout. Require an open published
issue and available stage skill, independent Codex review, checks and authenticated issue read/update
path. An existing sidecar pins selection across parent compaction and active-pointer changes. Do not
reset it to switch features. A closed issue or intentional task change requires reconciliation.

Before dispatching implementation, inspect the selected Codex review adapter and preflight its
actual runtime and isolation in the environment the worker will use. On the Linux CLI path, run the
review skill's shared CLI preflight; record the command, environment, result and limitation in the
run checkpoint and worker packet. Diagnose failure and use only a supported, authorized permission
request or adapter path. If the required path is unavailable, retain reconnaissance and stop before
implementation with the concrete capability or permission blocker. A successful probe does not prove
authentication, model access, future permission or review success; recheck when the environment changes.

Inspect local changes and existing stage/review checkpoints. Preserve unrelated work. Read an active
worker's real host status; wait or stop and await it before replacement. A timer does not establish a
stale owner. Run the protocol helper to reserve the selected stage, then spawn and bind the actual
handle. Launch no second writer while one executor is active.
Before reservation inspect phase and feature direct-workflow records under `.agents/work/phases/`
and `.agents/work/features/`; reconcile their actual owners and never overlap an active writer.

Send only the pinned packet described in the protocol, exact stage/review skill roots and constraints.
The worker restores the live issue, discovery and repository itself; never inherit the implementation
conversation. Pass the user invocation's Codex review authority, the preflight outcome, actual prior
review ledger and explicitly granted fallback approvals. Never
invent an approval because a parent approved a different action.

## Await, verify and continue

Wait through the host's completion surface in bounded intervals and inspect watchdog assessments
between waits. Require operation boundaries and evidence-backed milestones; liveness alone is not
progress. Diagnose recurring errors or overdue work, send a specific correction, and if ineffective
stop and await the owned worker before a fresh attempt of the same stage. Preserve failure and
recovery history so replacement cannot repeat the same loop. A timeout never releases ownership.
Retain short summaries and durable pointers; omit raw
traces from parent context. Save a result before cleaning temporary packets. Read the actual result,
Git state, evidence artifacts, feature checkpoint and latest issue from the pinned forge. Normalize
issue stages from that fresh read for the helper; a local snapshot is not live readback.

For `stage-complete`, inspect acceptance/check logs and independent review/ledger: the tested and
reviewed code must match the commit, every blocking finding must have a permitted disposition, and
issue result plus checkboxes must identify that same SHA. Reconcile substantive contract changes.
The helper checks identity, ancestry, tree evidence, unique stage commit and cleared checkpoint;
its success does not replace this semantic verification. Before `settle` clears the stage identity,
persist the cleanup-pending record specified by the feature workflow. After verification and terminal
settlement, perform and verify cleanup; reconcile a pending record before any subsequent dispatch,
including on restart. Only then select the next unfinished stage.
After the last stage verify feature-wide acceptance and report `implemented` with delivery gates;
do not close the issue automatically. Complete the feature-wide temporary-material cleanup in the
feature workflow before reporting the run finished, even when delivery gates remain pending.

For other outcomes investigate the cause and side effects before dispatch:

- `retryable-error`: fix a safe in-scope cause or change approach, then start a fresh attempt of the
  same stage. Malformed output and false success require investigation, never advancement.
- `review-exhausted`: end the bounded run and preserve its full ledger. Diagnose exhaustion/dispute/
  non-convergence, append a new run with the changed approach, and launch a fresh worker of the same
  stage carrying unresolved findings, prior fixes and tested states. No pass 11 in the old run.
- `needs-user-input`: research available sources first; persist the concrete question, missing fact
  and sources checked, then stop for that answer. A sufficient answer resumes the same stage.
- `interrupted`: save the action/remaining work and reconcile Git/issue side effects on resume.
  Physical runtime/usage interruption is not stage completion or a stakeholder decision.

Repetition, no progress or a review pass budget alone never ends the whole feature as a user blocker.
There is no additional retry-count limit. Review independence, permissions and acceptance remain
mandatory. A new permission, scope decision or unavailable access requires the exact missing user
information; do not retry denied actions or uncertain remote writes blindly.

On explicit cancellation persist a stop request, stop the owned executor, await termination and
inspect side effects. Preserve any committed-awaiting-issue SHA. A late result cannot automatically
advance a cancelled run. Resume only on an explicit user instruction. A genuine blocker answer can
resume directly after its sufficiency is established; do not demand another command.

Report brief stage progress and a self-contained final result with checks/review, commits, issue,
remaining stages or exact question. Keep the sidecar and evidence so a fresh parent can resume.
