# Preparing host workers

Read the matching host adapter and [protocol.md](protocol.md). Reserve an attempt with `dispatch`
before preparing a worker. The bundled helper reads the pinned sidecar and feature record; a changed
active pointer never selects a different feature. Use Bun and a JSON argument file:

```text
bun <run-feature-root>/scripts/host-worker.ts plan /absolute/request.json
bun <run-feature-root>/scripts/host-worker.ts run /absolute/request.json
```

Request: `{host, cwd, state_path, stage_skill_root, review_skill_root, configuration, constraints,
native?}`. `host` is `claude-code`, `pi`, `opencode` or `hermes`; `cwd` is the exact checkout root,
skill roots are absolute verified installed roots, and `state_path` is the fixed relative sidecar.
`constraints` contains the relevant user/repository boundaries and scoped approval evidence, never
credentials or prior conversation. `configuration` is `{source, equivalent: true, values}`: the
parent must inspect actual effective host settings and put the evidence reference in `source`.
The boolean records that preflight decision; the helper does not attest permissions or apply policy.
Never assert equivalence merely because CLI defaults seem likely to match. Native `values` is `{}`;
process values are the allowlisted scalar settings described by that host adapter. Other fields,
arbitrary argv, trust grants, resume flags and permission overrides are rejected. If effective
permissions/extensions/config cannot be reproduced without expanding access, do not launch.

Native requests add `{tool, worker, schema_ref}` from the installed runtime. `plan` returns the
minimal prompt/native arguments; use the actual host tool, retain its handle, `bind` immediately,
await completion/cancellation and persist its structured result. No native tool is invoked by Bun,
and fixture shape validation is not a real host smoke. Do not use `run` for native hosts.
Use bounded waits and [watchdog.md](watchdog.md) to supervise progress; native packet execution
must include its telemetry/command helper paths and the host's actual correction/stop surfaces.

For Pi/Hermes, `run` spawns the selected binary with inherited environment, no shell and no detached
durable job. It uses a dedicated Linux child subreaper while awaiting the child and binds the PID/attempt handle.
Keep the terminal/tool handle for the **runner**, which owns cancellation. Persist `stop` before
sending SIGINT/SIGTERM to that runner; it awaits the host and terminates owned descendants even
when shell/reviewer processes started separate sessions/groups.
SIGKILL of the runner, host crash or unknown owner is an interruption requiring reconciliation,
never proof that the worker is gone. The portable installer does not imply a portable process supervisor. This route requires Linux,
readable owned /proc task/children/stat records and Bun FFI with libc.so.6 prctl/pidfd functions.
Preflight those capabilities; the helper rejects other OSes rather than substitute group-only
cancellation. Use a separately verified native/process lifecycle on macOS/Windows. It changes no
global process policy: only the dedicated supervisor adopts its own orphans; caller children remain
unrelated. Stable process descriptors avoid signalling recycled PIDs.

Per-attempt artifacts under `.agents/work/features/<feature>.<attempt>.host/` are exclusive:
`launch.json`, `stdout.log`, `stderr.log`, `transport.json`, and the worker's `result.json`.
The launch record retains PID/runner/attempt facts before bind for uncertain-start reconciliation;
verify actual ownership before signalling an old PID. Streams go directly to
files, keeping parent context bounded. The final runner JSON is **transport evidence**, including
exit/signal, handle and result presence; it is never stage success. The parent saves/inspects it,
uses actual terminal observation in `settle`, and verifies all completion gates separately. A failed
spawn leaves the reservation for parent reconciliation; a spawn/bind uncertainty must be inspected
before another dispatch. A malformed/missing result is diagnosed from preserved raw output and
Git/issue/checkpoint facts, then normalized to the common failure result by the parent. Never invent
a passing review, commit or readback. Temporary packet files are removed after the awaited lifecycle;
durable evidence is retained. Retries use fresh attempts and never overwrite old transport records.

The process supervisor samples watchdog assessments at the configured interval and checks recorded
stop requests every 250 ms. It retains the owner until process-tree cleanup finishes. The parent
still uses bounded tool/terminal waits to inspect assessments and decide correction/replacement;
sampling alone does not diagnose a loop, send messages or claim stage completion. A watchdog
replacement request is honored automatically by the owning supervisor without a second signal.
