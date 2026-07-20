# Codex host adapter

Use this adapter only when Codex is the primary implementing agent.

## Invocation containment

`agents/openai.yaml` sets `policy.allow_implicit_invocation: false`. The skill should therefore be
offered for explicit selection but not selected automatically. The restrictive `SKILL.md`
description remains a second semantic boundary.

## Launch the reviewer

1. Load `reviewer-contract.md` and `assets/review-result.schema.json`, then build the neutral context
   packet from the core workflow.
2. Spawn a fresh native Codex subagent with:
   - model `gpt-5.6-sol`;
   - reasoning effort `xhigh`;
   - no inherited implementation conversation or suspected findings;
   - a selected custom reviewer profile or delegation override that sets the sandbox to read-only;
   - an explicit no-test instruction, which remains a reviewer contract rather than a command
     sandbox;
   - the complete reviewer contract, output schema, and neutral context packet in its task message.
3. Use a non-inheriting or minimally inherited turn fork when the available delegation interface
   supports it. Supply all required context directly.
4. Wait for the reviewer to finish and validate its result against
   `assets/review-result.schema.json` and the semantic state rules in `reviewer-contract.md`.

Native subagents normally inherit the parent sandbox. A read-only sentence in the task message is not
proof of isolation when the parent can write. If native delegation cannot select a real read-only
custom reviewer or sandbox override, pin the exact model and reasoning effort, or create a fresh
context, stop before pass 1 and ask whether the user approves the external wrapper or another stated
fallback. This package does not install a global Codex custom-agent configuration. Never silently
substitute a general-purpose subagent.

The reviewer must not fix its own findings. All validation, edits, tests, and loop decisions stay with
the primary Codex agent.
