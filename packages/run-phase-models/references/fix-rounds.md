# Verification between fix rounds

The agent responsible for the stage, subphase or standalone review makes the following decisions
before dispatching fixes, expensive checks or the next review. Use the existing finding ledger and
checkpoint. On resume, recover the last reviewed tree, observed failures and prior fix outcomes.
Keep the owning workflow's authority for edits, delegation and continuation throughout recovery.

## Get feedback on the failure first

Give the fixer the failing action, expected outcome, affected boundary and fastest faithful check.
Start with the known failure on its recorded inputs, reusing an existing failing observation when
available. Check the correction there, then exercise the affected neighboring behavior. A failure
found late in a suite becomes the first targeted check of the next attempt. An intermittent failure
may require its original ordering, load or environment. If only the wider run can reproduce it,
use that run and record why. A passing isolated case cannot settle a failure seen only under load.

## Decide whether to launch a broad check

Before launching or repeating a broad QA command or browser matrix, inspect its actual comparison
base, selected cases and duration of the last comparable run. Use the runner's selection preview,
log or configuration. If a value is unavailable, say which one once and work from the available
evidence. A command named `--changed` may select every scenario or include earlier commits.

Record the selection, timing and reason for the broad run alongside the known failing case in the
existing work record. Run a directly checkable failure first. After it passes, choose the next
checks for the actual delta since the last verified snapshot, including affected shared
components. Hand the fixer the focused checks. The owner runs or verifies the broad checks on the
assembled candidate at the project's required boundary. Reuse a result when it covers the same
required check and scope on that exact tree, build, configuration and fixtures. Honor any required rerun.
Keep every mandatory gate, its prescribed base, all required UI states, independent critics and
polish thresholds. A targeted result alone cannot close the increment.

## Decide whether another ordinary round is warranted

Count completed fix batches for this increment across QA, UX/UI and code review. Several reports
on one batch count once. For each batch, distinguish a confirmed recurrence of a repaired cause,
a substantial regression introduced by the fix, and an unrelated or previously undiscovered
defect. Use the observed behavior and the change that caused it. Scores, finding counts and new
finding IDs alone cannot establish recurrence.

If **two consecutive fix batches** show recurrence of the same cause or introduce substantial
regressions, suspend ordinary fix batches and review passes. Apply an existing mandatory stop
earlier when it applies. Keep the increment open. A new run ID, fresh worker or compaction carries
the outstanding diagnosis forward.

Continue with one bounded engineering investigation. Isolate one failing user behavior at the
real boundary, check the premise of the previous fixes, and try the changed approach on the
smallest affected slice. Before expanding the fix or commissioning another review, the owner must
verify evidence that the original failure and a related case now satisfy the same behavioral rule.
Record the two outcomes, their tested identity and any remaining findings in the existing ledger.
If the trial fails, record which premise it ruled out. Continue only with a distinct hypothesis
that the evidence supports or an independently verifiable split within scope. If neither is
available, report the open failure and the missing evidence. Escalate a specific product, access
or scope decision only when it belongs to the user. After a verified trial, resume normal checks
and independent review under the owning workflow's continuation authority and pass limits.
