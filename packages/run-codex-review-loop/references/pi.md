# Pi host adapter

Use this adapter only when Pi is the primary implementing agent.

## Explicit invocation

Invoke the installed skill with `/skill:run-codex-review-loop`. Pi supports
`disable-model-invocation: true`, but this portable payload omits that frontmatter field because the
shared repository validator permits only `name` and `description`. The installed payload therefore
has an instruction-level boundary. For hard Pi enforcement, create and validate a Pi-specific copy
that adds the field; the installer does not generate that override automatically.

## Launch the reviewer

Do not use a Pi-native subagent or model alias as the reviewer. Launch the actual Codex CLI through
the shared Bun wrapper:

```text
bun <skill-root>/scripts/run-codex-review.ts --cwd <repository> --context-file <temporary-context> --pass <1-5>
```

Create the context file outside the repository and pass paths as separate process arguments. Pi's
base runtime does not supply a built-in permission sandbox, so do not infer reviewer isolation from
the host. The wrapper's Codex `read-only` sandbox and reviewer contract are the required boundary.

Wait for the wrapper's JSON envelope and use the core workflow for validation, fixes, tests, and
iteration. Stop for approval if Bun, Codex CLI authentication, the exact Sol/xhigh profile, or
read-only execution is unavailable.
