# Claude Code host adapter

Use this adapter only when Claude Code is the primary implementing agent.

## Explicit invocation

Claude Code supports a hard user-only skill boundary through `disable-model-invocation: true` in a
Claude-specific skill definition. This package keeps one portable `SKILL.md`, whose shared validator
allows only `name` and `description`, so that field is not embedded here.

For a hard Claude Code guarantee, configure a local Claude skill override or wrapper command that
sets `disable-model-invocation: true` and delegates to this installed payload. Without that local
override, the explicit-only boundary is instruction-level rather than host-enforced. State that
limitation instead of claiming a hard guarantee.

## Launch the reviewer

Do not use a Claude subagent, including one configured with an OpenAI-compatible model. Launch the
actual Codex CLI through the shared Bun wrapper:

```text
bun <skill-root>/scripts/run-codex-review.ts --cwd <repository> --context-file <temporary-context> --pass <1-5>
```

Create `<temporary-context>` outside the repository. Use an argument array or Claude Code's Bash tool
without interpolating untrusted repository content into the command. Wait for completion, parse the
single JSON envelope on stdout, and apply the core ledger and fix rules.

If Bash access, Bun, Codex CLI authentication, `gpt-5.6-sol`, `xhigh`, or read-only execution is
unavailable, stop and request approval before any fallback. Do not ask Codex to run tests.
