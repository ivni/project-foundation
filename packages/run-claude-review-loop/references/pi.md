# Pi host adapter

Use this adapter only when Pi is the primary implementing agent.

## Explicit invocation

Invoke the installed skill with `/skill:run-claude-review-loop`. This portable payload embeds
`disable-model-invocation: true` in its frontmatter, and Pi honors that field by hiding the skill
from the system prompt until the user names it, so the explicit-only boundary is host-enforced on
Pi.

## Launch the reviewer

Do not use a Pi-native subagent or model alias. Launch the actual Claude Code CLI through the shared
Bun wrapper:

```text
bun <skill-root>/scripts/run-claude-review.ts --cwd <repository> --context-file <temporary-context> --pass <1-10>
```

Create the context file outside the repository and pass paths as separate process arguments. Wait for
the wrapper's JSON envelope and use the core workflow for finding validation, fixes, tests, and later
passes. Stop for approval if Bun, Claude authentication, `fable/xhigh`, or the enforced read-only and
test-free tool boundary is unavailable.
