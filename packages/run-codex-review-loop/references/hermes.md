# Hermes host adapter

Use this adapter only when Hermes is the primary implementing agent.

## Explicit invocation

Invoke `/run-codex-review-loop` after confirming it appears in `/skills`. Hermes does not provide a
verified per-skill hard explicit-only flag equivalent to Codex metadata. The restrictive description
and direct invocation convention are semantic safeguards, not a technical impossibility guarantee.

## Launch the reviewer

Do not use Hermes `delegate_task` as the reviewer. A delegated Hermes child remains a Hermes runtime.
Launch the actual Codex CLI through the shared Bun wrapper, either directly with the shell tool or
through Hermes's Codex CLI integration when that integration can execute this exact command:

```text
bun <skill-root>/scripts/run-codex-review.ts --cwd <repository> --context-file <temporary-context> --pass <1-10>
```

Store the context file outside the repository and avoid shell interpolation of repository content.
Wait for the wrapper's JSON envelope, then keep finding validation, fixes, tests, and loop control in
the primary Hermes session.

If the environment cannot prove that the launched process is Codex CLI with Sol/xhigh and read-only
execution, stop and ask before fallback. Do not relabel a Hermes-native child as Codex.
