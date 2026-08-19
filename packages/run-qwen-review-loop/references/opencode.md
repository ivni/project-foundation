# OpenCode host adapter

Use this adapter only when OpenCode is the primary implementing agent.

## Explicit invocation

OpenCode skill permissions can allow, ask, or deny loading, but no verified per-skill user-only flag
equivalent to Codex metadata is available. Configure the skill permission to `ask` when possible and
invoke `run-qwen-review-loop` explicitly. This is not a hard impossibility guarantee.

## Launch the reviewer

Do not use an OpenCode-native agent or model alias. Launch the actual Qwen Code CLI through the
shared Bun wrapper:

```text
bun <skill-root>/scripts/run-qwen-review.ts --cwd <repository> --context-file <temporary-context> --pass <1-10>
```

Keep the context file outside the repository and pass command arguments without shell interpolation.
Wait for the wrapper's single JSON envelope, validate it, and use the core workflow for the finding
ledger, fixes, primary-agent tests, and subsequent passes.

If OpenCode denies the skill or process tool, or Bun, Qwen Code CLI authentication,
`qwen3.8-max`/`xhigh`, or the plan approval mode is unavailable, return the precise capability
blocker and ask before fallback.
