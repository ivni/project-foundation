# OpenCode host adapter

Use this adapter only when OpenCode is the primary implementing agent.

## Explicit invocation

OpenCode skill permissions can allow, ask, or deny loading, but no verified per-skill user-only flag
equivalent to Codex metadata is available. Configure the skill permission to `ask` when possible and
invoke `run-codex-review-loop` explicitly. This reduces accidental loading but is not a hard proof
that semantic invocation can never occur.

## Launch the reviewer

Do not use an OpenCode native agent configured with an OpenAI model. Launch the actual Codex CLI
through the shared Bun wrapper:

```text
bun <skill-root>/scripts/run-codex-review.ts --cwd <repository> --context-file <temporary-context> --run-id <run-id> --pass <1-8>
```

Keep the context file outside the repository and pass command arguments without shell interpolation.
Wait for the wrapper's single JSON envelope, validate it, and use the core workflow for the finding
ledger, fixes, primary-agent tests, and subsequent passes.

If OpenCode denies the skill or process tool, or Bun, Codex CLI authentication, Sol/xhigh, or the
read-only sandbox is unavailable, return the precise capability blocker and ask before fallback.
