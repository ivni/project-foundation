# Codex host adapter

Use this adapter only when Codex is the primary implementing agent.

## Invocation containment

`agents/openai.yaml` sets `policy.allow_implicit_invocation: false`. The skill should therefore be
offered for explicit selection but not selected automatically. The restrictive `SKILL.md`
description remains a second semantic boundary.

## Launch the reviewer

Do not use a Codex subagent as the reviewer. Launch the actual Qwen Code CLI through the shared Bun
wrapper:

```text
bun <skill-root>/scripts/run-qwen-review.ts --cwd <repository> --context-file <temporary-context> --pass <1-10>
```

Create `<temporary-context>` outside the repository. Pass command arguments as an array or quote only
trusted absolute paths; never interpolate repository content into the command. Wait for the single
JSON envelope on stdout and apply the core ledger and fix rules.

The wrapper pins `qwen3.8-max`, pins `xhigh` reasoning through a wrapper-owned system settings file,
and sets approval mode `plan`. Plan mode is enforced by the Qwen Code runtime on its tool surface; it
is not an OS sandbox. If Bun, Qwen Code CLI authentication, the exact model, or those controls are
unavailable, stop and ask before fallback.
