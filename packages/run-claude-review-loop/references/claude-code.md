# Claude Code host adapter

Use this adapter only when Claude Code is the primary implementing agent.

## Explicit invocation

This portable payload embeds `disable-model-invocation: true` in its frontmatter, and Claude Code
honors that field: the skill's description stays out of model context and only the user can invoke
it, so the explicit-only boundary is host-enforced. A local `/skills` override that sets
`run-claude-review-loop` to `user-only` is a redundant second control, not a requirement.

## Prefer a strict native reviewer

A fresh Claude Code custom subagent may be used only if the host can verify all of these controls:

- model `fable` and effort `xhigh`, with no environment or settings override;
- fresh context containing the canonical contract, output schema, and neutral context packet;
- `Read`, `Grep`, and `Glob` as the complete tool allowlist;
- permission mode `plan`;
- no ordinary inherited hooks, plugins, skills, MCP servers, or other mutation or command path, plus
  verified harmless or absent organization-managed hooks;
- one structured result that passes the local schema and semantic state checks.

Do not use a general-purpose Claude child or inherit the implementation conversation. The primary
Claude agent owns all finding validation, edits, tests, and loop decisions.

## Use the wrapper when native proof is incomplete

Ask before changing mechanisms, then launch:

```text
bun <skill-root>/scripts/run-claude-review.ts --cwd <repository> --context-file <temporary-context> --pass <1-10>
```

Create the context file outside the repository and pass paths without shell interpolation. The
wrapper provides the strict tool boundary and fresh stateless invocation. If authentication, Bun,
`fable`, `xhigh`, or the required controls are unavailable, report the exact blocker and ask before
any fallback.

The wrapper's allowlist governs model tools, not organization-managed policy hooks. Establish that
such hooks are absent or harmless, or run the whole process in suitable OS isolation, before claiming
a whole-process read-only and test-free boundary.
