# Claude Code host adapter

Use this adapter only when Claude Code is the primary implementing agent.

## Explicit invocation

This portable payload does not set `disable-model-invocation`, so Claude Code may start the skill
itself when the user names it in a prompt — including a recurring or loop prompt. The explicit-only
boundary is instruction-level: the description and the invocation section of `SKILL.md` forbid
starting it uninvited. A local `/skills` override that sets `run-qwen-review-loop` to `user-only`
restores a host-enforced boundary where one is wanted.

## Launch the reviewer

Do not use a Claude subagent, including one configured with a Qwen-compatible model alias. Launch
the actual Qwen Code CLI through the shared Bun wrapper:

```text
bun <skill-root>/scripts/run-qwen-review.ts --cwd <repository> --context-file <temporary-context> --pass <1-10>
```

Create `<temporary-context>` outside the repository. Use an argument array or Claude Code's Bash tool
without interpolating untrusted repository content into the command. Wait for completion, parse the
single JSON envelope on stdout, and apply the core ledger and fix rules.

The wrapper pins `qwen3.8-max`, pins `xhigh` reasoning through a wrapper-owned system settings file,
and sets approval mode `plan`. Plan mode is enforced by the Qwen Code runtime on its tool surface; it
is not an OS sandbox. If Bash access, Bun, Qwen Code CLI authentication, `qwen3.8-max`, or those
controls are unavailable, stop and request approval before any fallback. Do not ask Qwen to run
tests.
