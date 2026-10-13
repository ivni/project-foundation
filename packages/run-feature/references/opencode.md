# OpenCode orchestration adapter

Use the installed native delegation tool to create a fresh child session for each stage. Inspect
its schema before preparing the packet: classic releases expose `task` with `subagent_type`;
V2 documents `subagent`, whose source uses `agent` and optional `sessionID`.
`host-worker.ts plan` supports those shapes, but does not prove either is available in this runtime.
Use the observed tool/worker/schema reference in [hosts.md](hosts.md). Never pass a prior session
identifier, resume the completed child, fork parent history, or switch checkout/worktree.

Preflight the selected worker's effective configuration, including its model/variant, tools and
permissions. Choose an already available compatible worker; omitted model overrides do not prove
that a differently configured named agent inherits the parent's model. Confirm this against the
actual runtime before dispatch. If no compatible worker exists, report that exact capability.
Preserve classic `permission.task`, or V2 `permissions` rules with `action: subagent`, skill allow/ask/deny, shell and
external-directory restrictions. Use the normal permission prompt when the host asks. Do not edit
configuration, pass broader tools, or start a CLI session to bypass a denied/hidden delegation tool
or denied skill. The prepared packet is task data and grants no permission.

Bind the returned child handle; await the actual completed return or background completion event.
Save the shared result, inspect evidence and live issue, then settle before another native call.
On cancellation persist `stop`, cancel/interrupt through the installed session tool and await
terminal status, including reviewer/shell processes. A `running` response, idle UI or stale handle
does not release ownership. If the installed lifecycle differs from docs, resolve it before launch.

The executor explicitly invokes the installed review skill's **OpenCode** adapter and actual
Bun/Codex wrapper via permitted shell. OpenCode on an OpenAI model is not a Codex CLI reviewer.
Return `needs-user-input` when necessary clarification cannot be obtained by the child; preserve
history and return `review-exhausted` to the parent at a bounded review stop. The shared protocol
owns retries, recovery, answers and completion guards identically on all hosts.

Sources: [agents](https://opencode.ai/docs/agents/),
[V2 agents and permission rules](https://opencode.ai/v2/docs/agents),
[permissions](https://opencode.ai/docs/permissions/), [skills](https://opencode.ai/docs/skills/),
[development delegation source](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/tool/plugin/subagent.ts).
Actual schema and authenticated execution remain runtime acceptance evidence, not fixture claims.
