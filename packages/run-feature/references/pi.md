# Pi orchestration adapter

Use a fresh Pi CLI process in the pinned checkout for each attempt. The base installation need not
have a subagent tool; no extension is installed by this workflow. `host-worker.ts run` executes
`pi --mode json -p --no-session ... -- <brief>` with an argument array, no shell interpolation,
session resume or previous conversation. See [hosts.md](hosts.md) for the request and lifecycle.

Preflight the installed CLI help and effective configuration. Record the current provider/model
as `configuration.values.model` (the resolved `provider/id`), and thinking level when applicable.
Carry effective `tools`/`exclude-tools` when their CLI semantics match this installation; an empty
values object is valid only when fresh config/env discovery is demonstrably equivalent. The helper
permits these fields only. It does not select a model, alter auth or grant project trust. Pi can
load extensions, MCP and project configuration during startup: confirm the same already trusted
resources and permissions load without automatic installs or broadening session-only restrictions.
If flags/extensions or permission state cannot be reproduced, preserve that concrete capability
checkpoint; do not drop a deny, set `--approve` or install a delegation extension as a fallback.

Wait for actual process exit and the transport record; JSON progress and exit zero alone do not
prove a stage completed. The worker reads the exact installed stage/review skill files and writes
the shared structured result. A worker with no clarification tool returns its question to the
parent. The parent checks Git, actual checks/reviewer evidence, live issue/readback and checkpoint
before advancement. Cancel through the owning runner, await terminal process-tree observation,
then reconcile side effects and settle. Keep raw stdout/stderr and durable review/result evidence;
the runner removes the temporary packet after the awaited lifecycle.

Invoke the installed review skill's **Pi** adapter through the worker's permitted shell. It uses
actual Codex CLI via the packaged wrapper, not a Pi agent/model alias. Pi's own tool access is not
a read-only reviewer sandbox. Missing Bun/Codex auth/profile/sandbox is a capability requiring the
appropriate input/approval; ordinary errors and review exhaustion follow the common protocol.

Sources: [upstream process launcher](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts),
[CLI options](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/cli/args.ts),
[skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md).
Contract process doubles do not establish authenticated Pi acceptance.
