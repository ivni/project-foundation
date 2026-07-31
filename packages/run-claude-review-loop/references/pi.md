# Pi host adapter

Use this adapter only when Pi is the primary implementing agent.

## Explicit invocation

Invoke the installed skill with `/skill:run-claude-review-loop`. Pi supports
`disable-model-invocation: true`, but this portable payload omits that frontmatter field because the
shared repository validator permits only `name` and `description`. The installed payload therefore
has an instruction-level boundary. For hard Pi enforcement, create and validate a Pi-specific copy
that adds the field; the installer does not generate that override automatically.

## Launch the reviewer

Do not use a Pi-native subagent or model alias. Launch the actual Claude Code CLI through the shared
Bun wrapper:

```text
bun <skill-root>/scripts/run-claude-review.ts --cwd <repository> --context-file <temporary-context> --pass <1-8>
```

Create the context file outside the repository and pass paths as separate process arguments. Wait for
the wrapper's JSON envelope and use the core workflow for finding validation, fixes, tests, and later
passes. Stop for approval if Bun, Claude authentication, `fable/xhigh`, or the enforced read-only and
test-free tool boundary is unavailable.
