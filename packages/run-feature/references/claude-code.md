# Claude Code orchestration adapter

Use a new non-fork native worker for each stage. Inspect the installed delegation schema and
available workers: current docs say `Agent`; CLI 2.1.296 reported `Task` in S1. Select an already
available full worker whose effective model/effort, tools and permissions match the parent. If a
session-local definition is needed, use the runtime's transient definition with `model: inherit`
and inherited tools/permissions; do not write a global agent file. Never select `fork`, resume a
previous worker, or use worktree isolation for this shared-checkout protocol. Verify available
depth before dispatch; the stage worker invokes the external reviewer and needs no reviewer Agent.

Prepare the minimal packet using `host-worker.ts plan` as described in [hosts.md](hosts.md), with
`host: "claude-code"`, `native.tool: "Agent"` or `"Task"`, the observed worker name and schema
evidence. The generated native arguments omit model, permission, history and resume overrides.
Map them only to fields supported by the actual installed schema; a tool mismatch is a capability
checkpoint, not permission to launch a different runtime. Read exact skill paths in the packet:
non-fork workers do not inherit loaded skills or the parent's conversation/session approvals.
Carry relevant approvals as scoped evidence, then honor the child's actual permission checks.

Save the returned handle with `bind`. In interactive fork mode, even a non-fork worker can run in
the background; await its completion notification and persisted result before settling or spawning
another worker. A foreground tool return can instead be terminal. Permission prompts belong to
the host's normal user surface; never change ask/deny to bypass. On cancellation persist `stop`,
use the actual stop control and await termination, including any owned background shell/reviewer.
If that lifecycle is unavailable, retain ownership/checkpoint instead of guessing that it stopped.

The executor invokes the installed `run-codex-review-loop` **Claude Code** adapter through permitted
Bash: actual Bun/Codex CLI, Sol/xhigh and read-only sandbox. A Claude worker on an OpenAI model is
not the mandatory reviewer. After a bounded review stop, return `review-exhausted` with the ledger
to the parent; only the parent authorizes a new cycle under the shared protocol.

Sources: [subagents](https://code.claude.com/docs/en/sub-agents),
[CLI transient definitions](https://code.claude.com/docs/en/cli-reference).
Authenticated three-stage runtime acceptance is recorded separately from adapter contract tests.
