---
name: run-feature-models
description: Execute one published feature with native role-specific models, task-based model and effort selection, independent review and recovery. Start only when the user invokes this workflow.
---

# Run Feature Models

Complete the remaining stages of one published feature, sequentially. The parent coordinates
bounded native build/UI/fix/investigation/advisor jobs and owns verification, independent review,
commits and issue readback. The main chat remains the orchestrator. Select model AND effort per job
from an approved catalog, meeting complexity/uncertainty/risk floors before minimizing relative cost
and then latency. Existing `run-feature` and `run-feature-direct` retain their behavior.

Read [model-workflow](references/model-workflow.md) before setup or delegation. It defines native
capability checks, approvals, six roles, task assessment, effort selection, fallback and recovery. Read
[feature-workflow](references/feature-workflow.md), [issue-publication](references/issue-publication.md)
and the installed `run-feature-stage` for selection, entry gates, verification, completion and cleanup.
Use its stage checklist as the parent-owned contract; do not launch its entire implementation loop
inside a role worker. This variant changes job ownership and reviewer selection as specified here;
it does not waive scope, acceptance, independent review, final-tree identity or issue readback.

Invocation authorizes in-scope local implementation/checks/commits, factual issue progress, native
delegation to approved role models, and the chosen installed independent review loop with diagnosed
continuations. Profile approval names the allowed native candidates and review-loop providers and
their repository/task scope. Do not reinterpret an approved native model as permission for an
external worker CLI. Existing CLI review routes are permitted only for approved review candidates.
No push, PR/MR, merge, release, deployment, issue closure or work after session closure is added.

## Restore and preflight

Resolve one open published issue, repository, discovery digest, original base and completed stage
commits using the feature contract. The live issue owns scope/order/progress. Preserve unrelated
changes and restore the active increment before selecting the first unfinished stage.

Read all relevant phase/feature owner records and the actual host status. Follow
[checkout-lease](references/checkout-lease.md); use mode `run-feature-models` with
`.agents/work/features/<feature-id>.models.json`. Claim before checkpoint writes or delegation.
Never reset an existing orchestrator/direct run to switch modes; reconcile its terminal owner,
unfinished work, ledger and any committed-awaiting-issue result first. Do not call the old
`run-feature` state helper for this different role-job lifecycle.

Pin the approved profile, authorization and host capability evidence in the models checkpoint.
Assess the increment's expected review demand and preflight an adequate approved review route before
implementation. The default
executor's Codex-only selection is replaced, in this variant only, by the approved review candidates;
each installed loop retains its own exact model, effort, isolation, findings and verdict rules.
Profile/runtime gaps stop before product edits; never silently weaken review or guess model IDs.

## Execute one stage

1. Re-read the live issue and stage criteria, discovery and attributed recovery changes. Pin the
   stage contract digest and starting HEAD. Preserve the existing verification seams and test policy.
2. If an engineering uncertainty needs evidence, select a bounded `investigate` or `advisor` job.
   Inspect the result. A stakeholder decision remains the user's; do not replan from an agent opinion.
3. Choose `build`, or `ui` for UI work, and assess complexity, uncertainty and risk for each bounded
   job. Call the selector with those requirements and observed availability. Persist its exact model
   AND effort, resource estimates and reason; reserve and dispatch a fresh native worker with explicit
   model/effort. Inspect actual changes and terminal status before any subsequent job.
4. Before each fix, broad check or repeat review, apply [verification between fix rounds](references/fix-rounds.md).
   Reassess model/effort for scoped `fix` jobs and give the worker the failing case first. The parent
   owns candidate acceptance at real seams. Maintain required test cleanup and save the tested state.
   For UI work, prepare and inspect the shared results before dispatching a required critic. Use the
   [critic assignment](references/ui-verification.md) and handle requests for additional evidence.
5. Assess review demand and select an adequate installed loop with its pinned effort. Product fixes
   use new native `fix` jobs under the shared model workflow; the parent validates findings and reruns checks. Preserve the selected loop
   throughout its bounded run. A change of loop at a terminal availability failure starts a new run
   carrying the full unresolved ledger; it cannot erase a verdict or bypass a permission denial.
6. Inspect green checks, actual review output and ledger, permitted deferrals and final tree identity.
   Only then commit this stage locally under the project's Git profile. Save the SHA immediately as
   committed-awaiting-issue. Update only this stage's result/checklist in the live issue and read back
   the same SHA. Do not duplicate an uncertain write; inspect the existing remote marker/result first.
7. Preserve task assessments, actual model/effort choices and failed-attempt diagnoses. Perform
   verified stage cleanup with a cleanup-pending checkpoint, then reread the live issue before the
   next stage. A role job's success cannot advance the stage by itself.

## Recover and finish

Use the shared model workflow's checkpoints, terminal-owner reconciliation and bounded availability
fallback. Diagnose ordinary errors inside the same stage. For an exhausted/disputed review cycle,
preserve all findings/fixes/tested states and record a changed approach before a new identified run;
budget exhaustion is not a clean verdict or, by itself, a question for the user. A missing decision,
access or permission gets its exact question and a durable checkpoint.

On resume inspect actual Git/issue effects, the pinned profile and pending closeout/cleanup before
dispatch. Reconcile a committed increment instead of implementing it again. Explicit cancellation
stops all owned jobs and requires explicit resume; a late result cannot advance a cancelled run.

After the last stage verify feature-wide acceptance and test/temporary cleanup, report implemented
status with pending delivery gates, and stop. Preserve the open issue unless separately authorized
to close it. Include checks/review, commit SHAs, issue link, models/fallbacks and remaining work.
