# Claude Code host adapter

Use this adapter only when Claude Code is the primary implementing agent.

## Explicit invocation

Claude Code supports a hard user-only skill boundary through `disable-model-invocation: true` in a
Claude-specific skill definition. This package keeps one portable `SKILL.md`, whose shared validator
allows only `name` and `description`, so that field is not embedded here.

For a hard Claude Code guarantee, open `/skills`, set `run-claude-review-loop` to `user-only`, and
save the local setting. Claude Code records this as:

```json
{
  "skillOverrides": {
    "run-claude-review-loop": "user-invocable-only"
  }
}
```

Alternatively, a Claude-specific wrapper skill may set `disable-model-invocation: true` in its own
frontmatter and delegate to this portable payload. Without either control, the explicit-only
boundary is instruction-level rather than host-enforced. State that limitation instead of claiming
a hard guarantee.

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
bun <skill-root>/scripts/run-claude-review.ts --cwd <repository> --context-file <temporary-context> --run-id <run-id> --pass <1-8>
```

Create the context file outside the repository and pass paths without shell interpolation. The
wrapper provides the strict tool boundary and fresh stateless invocation. If authentication, Bun,
`fable`, `xhigh`, or the required controls are unavailable, report the exact blocker and ask before
any fallback.

The wrapper's allowlist governs model tools, not organization-managed policy hooks. Establish that
such hooks are absent or harmless, or run the whole process in suitable OS isolation, before claiming
a whole-process read-only and test-free boundary.
