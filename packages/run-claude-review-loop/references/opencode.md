# OpenCode host adapter

Use this adapter only when OpenCode is the primary implementing agent.

## Explicit invocation

OpenCode skill permissions can allow, ask, or deny loading, but no verified per-skill user-only flag
equivalent to Codex metadata is available. Configure the skill permission to `ask` when possible and
invoke `run-claude-review-loop` explicitly. This is not a hard impossibility guarantee.

## Launch the reviewer

Do not use an OpenCode-native agent or model alias. Launch the actual Claude Code CLI through the
shared Bun wrapper:

```text
bun <skill-root>/scripts/run-claude-review.ts --cwd <repository> --context-file <temporary-context> --run-id <run-id> --pass <1-8>
```

Keep the context file outside the repository and pass command arguments without shell interpolation.
Wait for the wrapper's single JSON envelope, validate it, and use the core workflow for the ledger,
fixes, primary-agent tests, and subsequent passes. If the process tool, Bun, Claude authentication,
`fable/xhigh`, or the enforced tool boundary is unavailable, report the blocker and ask before
fallback.
