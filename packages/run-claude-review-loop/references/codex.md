# Codex host adapter

Use this adapter only when Codex is the primary implementing agent.

## Invocation containment

`agents/openai.yaml` sets `policy.allow_implicit_invocation: false`. The skill should therefore be
offered for explicit selection but not selected automatically. The restrictive `SKILL.md`
description remains a second semantic boundary.

## Launch the reviewer

Do not use a Codex subagent as the reviewer. Launch the actual Claude Code CLI through the shared Bun
wrapper:

```text
bun <skill-root>/scripts/run-claude-review.ts --cwd <repository> --context-file <temporary-context> --run-id <run-id> --pass <1-8>
```

Create `<temporary-context>` outside the repository. Pass command arguments as an array or quote only
trusted absolute paths; never interpolate repository content into the command. Wait for the single
JSON envelope on stdout and apply the core ledger and fix rules.

The wrapper pins `fable` and `xhigh`, enables safe mode and plan permissions, disables session
persistence, and exposes only `Read`, `Grep`, and `Glob`. If Bun, Claude Code CLI authentication, the
exact profile, or those controls are unavailable, stop and ask before fallback.

The allowlist blocks model-initiated tests and edits. Claude Code organization-managed hooks remain
outside it even in safe mode. Establish that they are absent or harmless, or use OS-level isolation,
before claiming a whole-process read-only and test-free boundary.
