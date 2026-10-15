## Review continuation under orchestration

A pinned packet from a user-started `run-phase` delegates this loop through `run-subphase`.
A user-started `run-feature` delegates the Codex loop through `run-feature-stage`; it does not change
that workflow's required reviewer. At a terminal exhausted/disputed/non-converged run, preserve its
verdict, limitations, ledger, fixes and tested states and return the cause to the orchestrator.
The parent may authorize a new identified run after diagnosis, carrying all task-wide history and
unresolved blocking findings. Its new packet supplies that authority, predecessor run and changed
approach; start at pass 1 of the new run, never pass 11 in the old run. A missing scope/permission/
access fact still needs the specific user answer. Other safe engineering errors are diagnosed and
retried; review requirements remain. This exception applies only to a user-started orchestration.
Standalone calls keep every bounded stop below. A new run identity never makes an unresolved finding
clean, permits ignoring convergence, changes reviewer selection or approves an unavailable fallback.
