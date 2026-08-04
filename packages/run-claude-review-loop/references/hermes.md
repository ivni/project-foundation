# Hermes host adapter

Use this adapter only when Hermes is the primary implementing agent.

## Explicit invocation

Invoke `/run-claude-review-loop` after confirming it appears in `/skills`. Hermes does not provide a
verified per-skill hard explicit-only flag equivalent to Codex metadata. The restrictive description
and direct invocation convention are semantic safeguards, not a technical impossibility guarantee.

## Launch the reviewer

Do not use Hermes `delegate_task` as the reviewer. A delegated Hermes child remains a Hermes runtime.
Launch the actual Claude Code CLI through the shared Bun wrapper:

```text
bun <skill-root>/scripts/run-claude-review.ts --cwd <repository> --context-file <temporary-context> --pass <1-10>
```

Store the context file outside the repository and avoid shell interpolation of repository content.
Wait for the wrapper's JSON envelope, then keep finding validation, fixes, tests, and loop control in
the primary Hermes session. If the environment cannot prove the actual Claude CLI, `fable/xhigh`, and
the read-only test-free tool boundary, stop and ask before fallback.
