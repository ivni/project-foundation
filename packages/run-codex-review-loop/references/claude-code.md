# Claude Code host adapter

Use this adapter only when Claude Code is the primary implementing agent.

## Explicit invocation

This portable payload does not set `disable-model-invocation`, so Claude Code may start the skill
itself when the user names it in a prompt — including a recurring or loop prompt. The explicit-only
boundary is instruction-level: the description and the invocation section of `SKILL.md` forbid
starting it uninvited. A local `/skills` override that sets `run-codex-review-loop` to `user-only`
restores a host-enforced boundary where one is wanted.

## Launch the reviewer

Do not use a Claude subagent, including one configured with an OpenAI-compatible model. Launch the
actual Codex CLI through the shared Bun wrapper:

```text
bun <skill-root>/scripts/run-codex-review.ts --cwd <repository> --context-file <temporary-context> --pass <1-10>
```

Create `<temporary-context>` outside the repository. Use an argument array or Claude Code's Bash tool
without interpolating untrusted repository content into the command. Wait for completion, parse the
single JSON envelope on stdout, and apply the core ledger and fix rules.

If Bash access, Bun, Codex CLI authentication, `gpt-5.6-sol`, `xhigh`, or read-only execution is
unavailable, stop and request approval before any fallback. Do not ask Codex to run tests.
