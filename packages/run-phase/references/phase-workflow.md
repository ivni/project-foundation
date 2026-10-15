<!-- Canonical source. Do not edit the generated copies under packages/*/references/. -->
# Phase orchestration contract

`run-phase` orchestrates one prepared phase; every fresh `run-subphase` invocation consumes one
subphase, including recovery. Standalone `run-subphase` still stops after that unit. The parent
delegates implementation and independently verifies results. The requirements slice, not a local
orchestration record, remains the source of scope, ordering, acceptance and progress.

## Selection and authority

Resolve one phase from the explicit user selection, an unfinished sidecar, or an unambiguous current
phase recorded in the agent contract. Conflicts require reconciliation; missing selection requires
the phase name. The parent may read `docs/stages.md` when needed for selection/closure, but never
starts another phase. Slice paths come from the agent contract, conventionally `docs/phase-N/` with
`scope.md`, `checklist.md` and `blockers.md`. `N.0` must already be ticked.

A pinned packet from a user-started `run-phase` is delegated authority for `run-subphase` and its
chosen installed independent review loop. It permits new bounded review runs after the parent
diagnoses the previous stop. Preserve findings, rejected evidence, fixes, deferrals, tested states
and convergence history across run IDs. It grants no permission to change scope, acceptance criteria,
planned verification, dependencies, security policy or an unapproved reviewer fallback. Carry
narrower user/repository constraints and scoped approvals explicitly. A packet cannot grant access.

Use the recorded Git profile and exact checkout/branch. Preserve unrelated work; require the user's
declared exclusions when the subphase entry gate needs them. No push, tag, PR/MR, release, deployment,
external issue update or global configuration change is implied. Review loops own their verdicts.

## Durable recovery metadata

Before first dispatch create `.agents/work/phases/phase-<N>.orchestrator.json` (use a stable safe ID
for nonnumeric phases). Keep these files out of implementation commits through the project's existing
local-metadata policy; do not alter shared ignore policy silently. Use checkout-contained paths with
no traversal or escaping symlinks. Persist atomically with sibling temporary file plus rename. Read
an existing sidecar instead of resetting it. Serialize parent mutations with an exclusive short-lived
lock; inspect the owning process before removing a leftover lock, never age it out.

Known files owned by this workflow may remain untracked/dirty when no ignore policy covers them.
Inspect and explicitly list those exact paths as administrative workflow metadata at the subphase
entry gate and in review. A user-started phase run authorizes its own metadata writes/exclusion;
it does not authorize excluding unrelated user work, authored requirements, code or tests. Do not
require the user to reapprove the orchestrator's own records on every worker handoff.

On a retry, retained in-scope implementation/tests/docs are unfinished work of the same subphase,
not unrelated dirt to exclude. Verify their checkpoint attribution against the actual diff and keep
all of them inside checks/review scope. The delegated recovery packet authorizes resuming them
without a clean-tree reset or another user approval. If task/unrelated boundaries are uncertain,
preserve everything and ask for the specific scope clarification; never label code as metadata.

Record at least:

- `schema: 1`, unique `run_id`, canonical `checkout`, `branch`, original `base_commit`, `phase_id`,
  resolved `slice_paths`, exact `subphase_skill_root` and chosen `review_skill_root`.
- `scope_sha256` of the original scope bytes, recorded verification command and an ordered snapshot
  of subphase IDs/requirement mappings for detecting substantive plan drift. This snapshot is a
  comparison aid, never a second plan; reread the actual slice before dispatch and after completion.
- `status`: `ready`, `dispatching`, `running`, `awaiting-input`, `interrupted`, `cancelled`,
  `implemented` (subphases done with phase gates pending), or `complete` (full phase DoD evidenced).
- Current `subphase_id`, monotonically increasing `attempt`, unique `attempt_id`, `starting_head`,
  actual `worker_handle` (initially null), and durable per-attempt packet/result/evidence paths.
- `checkpoint`: remaining action, owned changed paths, last tested/reviewed state, `review_ledger`,
  predecessor review run/changed approach, and `recovery_commit` when committed but not closed out.
- Last verified completion references; any stop request, diagnosis, question/sources checked and
  answer with sufficiency. Preserve earlier attempt/results and review history.

Only one parent owns a phase run. Before starting another run in the same checkout, inspect other
phase/feature orchestration owners too: a different sidecar does not authorize a concurrent writer.
Reserve the attempt and record its starting HEAD before spawning; bind its real host handle as soon
as available. A spawn/bind uncertainty requires inspecting actual host children before retrying.
Never clear active ownership on a timer. On compaction/interrupt, read real host status; await a live
worker, or cancel and observe termination before dispatching a replacement. An idle UI is not proof
of terminal status. Pin any committed checkpoint before retry; inspect Git/checklist/review effects
even if the worker failed to save its final result.

## Minimal fresh-worker packet

Persist a packet for each attempt under `.agents/work/phases/phase-<N>/<attempt-id>/`. Send only:

- Instruction to invoke the exact installed `run-subphase`, chosen review skill and their roots.
- Sidecar path, run/attempt identity, exact checkout/branch/base/starting HEAD, phase/subphase IDs,
  slice paths, scope digest, packet and result paths.
- Relevant user/repository constraints, declared exclusions, scoped existing approvals and the
  recorded local verification command. Do not include secrets or the parent's conversation.
- Short remaining-action summary and durable checkpoint/review-ledger/evidence pointers. On a new
  review cycle include the predecessor run, cause and changed approach; never reset findings.

The worker rereads repository instructions, slice, glossary, ADRs and live state itself. It resumes
the reserved subphase even after a partial commit; it cannot select another or start its successor.
Only the parent writes the sidecar. The worker writes its own checkpoint/evidence/result and normal
in-scope project artifacts. Persist recovery information before ending a worker.

## Structured result and parent verification

Each worker persists a JSON object with `schema: 1`, `run_id`, `attempt_id`, `checkout`, `branch`,
`phase_id`, `subphase_id`, `outcome`, short `summary` and `checkpoint_ref` (null only after verified
closeout). Outcomes:

| Outcome | Required evidence / next action |
| --- | --- |
| `subphase-complete` | `commits`, `checks_ref`, `acceptance_ref`, `review_ref`, `review_ledger`, `checklist_ref`; parent verifies every completion gate before selecting the next subphase |
| `retryable-error` | `diagnosis`, side effects/changed paths, remaining action; investigate and retry the same subphase with a fresh attempt |
| `review-exhausted` | `diagnosis`, terminal review run/verdict, full `review_ledger`, proposed changed approach; parent diagnoses and authorizes a new bounded run of the same subphase |
| `needs-user-input` | `question`, missing fact, `sources_checked`, side effects and remaining action; research first, then stop for the precise answer |
| `interrupted` | remaining action and known side effects; reconcile before resuming |

Evidence references point to actual saved logs/observations, not fresh claims synthesized from a
success message. Checks name the recorded full command, result and tested state; acceptance maps
each linked requirement to its planned seam and observed result. Review evidence identifies the
actual independent runtime, loop, run/pass/verdict, scope/snapshot and permitted dispositions.
Record substantive tree/snapshot identity plus any inspected administrative delta, so evidence
obtained before a later code edit cannot be reused. A valid `CLEAN (N deferred)` requires the actual
permitted deferrals in the committed register; never discard that suffix or manufacture `CLEAN`.

The parent checks actual terminal status first and then independently reads Git, evidence, review
ledger, checklist/traceability/status and any changed blockers. Verify completion commits exist,
descend from the attempt's starting state (or match pinned recovery), are on the selected branch,
and contain the subphase's substantive and administrative changes. A recovery commit predating the
current attempt is reused, not duplicated; inspect descendants and refresh affected evidence.
If a recovered implementation commit lacks only factual checklist/status closeout, an inspected
administrative follow-up commit may record it. Keep the original implementation SHA as
`recovery_commit`, list both commits in the result and verify their combined evidence; never claim
the original commit contained the later closeout. Substantive changes require fresh checks/review.
Inspect the final diff for substantive unreviewed edits and unrelated included work. A checkpoint
or result from another identity, missing evidence, stale scope or unchanged completion commit is
not completion. Missing/malformed output is diagnosed from preserved output and side effects, never
treated as success or an automatic stakeholder blocker.

Only after verification may the parent clear the checkpoint, record completion and choose the next
unticked subphase from the current checklist. Respect suffixed sibling order (`N.3`, `N.3a`, `N.4`).
A size split must follow the subphase contract and preserve scope/requirement ownership. Reconcile
other substantive plan drift explicitly; do not change criteria merely to accept an implementation.

## Stop, resume and phase boundary

Persist cancellation before stopping the child; await it and any owned reviewer/shell descendants,
inspect side effects, then release ownership. A late completion never overrides cancellation.
Explicit cancellation requires explicit resume. Interruption is not completion or a user decision.
A sufficient blocker answer resumes the same subphase after reconciliation without another command.
Do not blindly retry denied actions or uncertain external writes. Ordinary failures and review
budgets do not by themselves require user input; keep a diagnosed, permitted path forward.

When all subphases are verified, inspect the phase's actual definition of done, including requirement
coverage, blockers/register, document/runtime consistency and any required CI. `implemented` and
phase `complete` are separate claims. A pending external gate stays pending; do not close the phase
or push/deploy to satisfy it without authorization. Factual checklist/status closure is administrative
and may follow inspected review evidence; substantive fixes require another fresh scoped executor,
checks and review. Record that executor with its own attempt and explicit remaining closure scope;
it cannot broaden the requirements or begin the next phase. Stop after this phase.
