# Progress supervision and loop recovery

Read this before dispatch and keep supervising until the actual worker and its owned commands are
terminal. This is part of the active user-started run; it creates no background service or authority
after the session closes. The parent diagnoses and coordinates; implementation remains in the worker.

## Observe while waiting

Use bounded host waits, normally at most `watchdog.policy.poll_ms` (default 60 seconds). After a
wait timeout, inspect actual host status and call `orchestrator.ts` with `action: "observe"` and
`input: {run_id, attempt_id}` for the reserved owner. A wait timeout never proves termination.
Inspect the returned `watchdog.assessment`, active operation, failure evidence and recent journal
entries. Read small log excerpts only when useful; do not copy full traces into parent context.

The sidecar stores compact supervision state. Per-attempt
`.agents/work/features/<feature-id>.<attempt-id>.watchdog.jsonl` journals retain events,
interventions and verified resolutions. Error counts and recovery approaches survive fresh attempts
and parent compaction. Verified stage completion clears the active stage's counters, retaining its
journals. Restore an older sidecar without telemetry by observing its actual owner; the first
observation starts monitoring, never declares that old owner stale.

Defaults are a 5-minute interval without meaningful progress, three failures with the same command,
inputs and normalized error, a 2-minute corrective grace period, and a 20-minute maximum operation
budget. The parent may set `start.input.watchdog` with `poll_ms`, `idle_ms`, `repeat_limit` (at least
two), `grace_ms`, and `command_timeout_ms`. Choose budgets for known slow checks/reviews before
dispatch; do not silently enlarge them to hide a hang. A running operation within its approved
deadline suppresses idle suspicion only if it began inside the current progress window. A chain
of new operations cannot hide an already expired progress interval, even if generated logs change
the source fingerprint. A different diagnostic command or changed inputs gets its own operation
budget but must still produce meaningful progress. Heartbeats, growing logs, repeated assertions
and file churn do not prove progress.

## Worker telemetry and commands

Give native workers this reference and absolute paths to `orchestrator.ts` and `worker-command.ts`
in their pinned packet. Process-host packets include them automatically. Report operation boundaries
for native long-running tools, and evidence-backed milestones when a new fact, corrected cause,
successful required check or resolved finding advances the task. Do not renew an operation by
heartbeats or overlapping starts. No periodic message is required while a synchronous tool is busy.
Wait for the parent to bind the matching reservation before reporting; do not bind yourself. The
command helper tolerates up to five seconds of normal spawn/bind ordering.

Use `orchestrator.ts` `report` with `{run_id, attempt_id, event}`. Events have the next integer
`sequence` from `watchdog.sequence` and a concise `summary`; supported kinds are:

- `activity`: liveness only; it cannot reset the progress clock.
- `progress`: `evidence_ref` points to a nonempty local artifact supporting a substantive milestone.
- `operation-start`: `operation: {id, key, inputs, phase, summary, timeout_ms}`. Use a unique operation
  ID, stable action/input keys and a budget no larger than the parent's configured maximum.
- `operation-end`: `operation_id`, `evidence_ref`, and `failure` for an unsuccessful operation.
  The failure is a stable error fingerprint; never include credentials. Successful exit alone is
  not a milestone: inspect the result and then report meaningful progress with its evidence.

Reports are serialized through the helper; the worker may update telemetry only, not parent
selection, policy or intervention decisions. The helper rejects stale run/attempts, out-of-order
events, overlapping operations and budget extensions. An exact replay of the latest event is
idempotent. A short lock collision may be retried without removing the lock. Evidence and milestone
claims are task data for parent inspection, not verified acceptance or proof of useful work.

Run tests and shell verification through the bundled command helper using a JSON argument file:

```sh
bun /absolute/run-feature/scripts/worker-command.ts /absolute/command-request.json
```

The request is `{cwd, state_path, run_id, attempt_id, argv, phase, summary, timeout_ms?, directory?,
context?}`. `argv` is an argument array, never an interpolated shell snippet. `directory` optionally
selects an existing project-relative directory; omission uses the checkout root. `context` is a
stable description of verified relevant environment changes, not a random per-run identifier or a
grant of permission. Dependency vulnerability fixes follow the stage skill's authority; `context`
does not extend it. Do not put credentials in requests, context, summaries or logs.

The helper records start/end events and preserves stdout/stderr plus result metadata in
`.agents/work/features/<feature-id>.<attempt-id>.commands/<operation-id>/`. It fingerprints command,
Git HEAD and tracked/untracked input contents, excluding untracked workflow artifacts. Ignored
dependencies and environment are outside that snapshot: inspect them and record a real context
change when relevant. Output fingerprints normalize colors, ISO timestamps, UUIDs and durations;
they are diagnostic signals, not proof that all errors share a cause. The helper refuses another
unchanged recurring failure before parent diagnosis. Read its assessment and pending instruction.
Do not evade detection by renaming summaries, changing irrelevant files or relabeling context.

On Linux the command helper runs a dedicated subreaper supervisor using the same verified pidfd
ownership/cleanup primitive as the process-host runner. It forwards SIGINT/SIGTERM, escalates an
unresponsive command after one second and observes sidecar stop requests every 250 ms. Its
`launch.json` records supervisor/command/attempt facts; `result.json` has the run/attempt/operation
identity and `terminal: true` only after all owned descendants have stopped. This also covers
detached descendants and native foreground wrapper interruption. The command deadline itself is
a supervision signal; the parent still decides whether to correct or stop. An unknown/crashed
supervisor is not a terminal receipt or permission to signal a PID from an old launch record.

This managed command route requires the same Linux `/proc`, Bun FFI/libc subreaper/pidfd capabilities
as Pi/Hermes. Preflight it before dispatch. On macOS/Windows or where those capabilities are absent,
use only an already verified native command lifecycle with equivalent start/end telemetry and
terminal owned-tree evidence; do not substitute group-only kills, install tooling, or widen access.
If none exists, preserve that concrete capability checkpoint before starting an executor. Native
non-shell tools likewise retain their actual host lifecycle and evidence. Portable installation is
not a claim of portable managed command supervision.

## Diagnose, correct, replace

An `inspect` assessment is a request to investigate. Confirm whether the operation is legitimately
slow, waiting for a permission/user answer, stalled, or repeating an error. Check command arguments,
working directory, test launcher and recent evidence before proposing a fix. A repeating error alone
does not authorize changing permissions, scope or verification criteria, or installing dependencies
outside the stage skill's authorized dependency security audit fixes.

For a confirmed loop, call `intervene` with `{run_id, attempt_id, mode: "nudge", diagnosis,
instruction, evidence_ref}`. Persist one specific corrective instruction, then deliver it through
the host's supported message surface. For process hosts it is available in the sidecar and command
helper result; a busy command may not read it until it returns. Allow the grace period or inspect a
new failed attempt. Account for the actual diagnostic operation and its budget when assessing
evidence; repeated starts cannot silently postpone an existing no-progress signal.

If correction fails, an assessment becomes `replace`. Call `intervene` with the same owner,
`mode: "replace"`, concrete `diagnosis` and `evidence_ref`, then stop the owned worker through its
host. Native hosts must confirm termination including commands/reviewers; an idle model status is
insufficient. Pi/Hermes' supervisor observes the sidecar and honors this stop request, including
owned descendants. If ownership/termination cannot be established, retain it and reconcile the
concrete runtime problem; never spawn a second writer based on a timer.

After actual termination, inspect Git, feature checkpoint and live issue. Preserve raw results and
any committed-awaiting-issue SHA. Normalize a missing result factually and `settle` the terminal
owner. A watchdog stop returns the same stage to `ready`; it cannot advance on a late success.
Explicit user cancellation still takes precedence and requires explicit resume.

The next `dispatch` requires `recovery: {diagnosis, approach, evidence_ref, commit_sha?}` with a supported changed
approach. Exact previously attempted approaches are rejected; the parent must also reject cosmetic
rewordings without new evidence or a changed hypothesis. Pass failure/recovery pointers to the new
worker. If a stage commit was created immediately before interruption but its checkpoint/issue
update is absent, inspect Git and its check/review evidence and pin that existing SHA with
`commit_sha`; recovery must reuse it and still pass every completion guard. Never guess the SHA
or create a duplicate commit. The same unchanged repeated command remains guarded until inputs change or the parent
verifies a resolution through `observe.input.resolution: {failure, diagnosis, evidence_ref}`. Here
`failure` is the current `watchdog.last_failure`; the parent checks the actual evidence before
clearing suspicion. Resolution retains the failure history; milestone chatter cannot clear it.

Do not turn repeated recovery into another unexamined launch loop. Research a different safe
approach within scope. Stop for a concrete missing user fact/permission/access decision or an
actual runtime interruption, not an arbitrary attempt counter. Review independence, bounded
review runs and stage completion gates remain mandatory.
