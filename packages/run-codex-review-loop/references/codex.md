# Codex host adapter

Use this adapter only when Codex is the primary implementing agent.

## Invocation containment

`agents/openai.yaml` sets `policy.allow_implicit_invocation: false`. The skill should therefore be
offered for explicit selection but not selected automatically. The restrictive `SKILL.md`
description remains a second semantic boundary.

## Launch the reviewer

1. Load `reviewer-contract.md` and `assets/review-result.schema.json`, then build the neutral context
   packet from the core workflow.
2. Prefer a fresh native Codex subagent when the host can provide all of these controls:
   - model `gpt-6.1-sol`;
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
proof of isolation when the parent can write. If the native interface cannot provide every control
above, use the packaged `scripts/run-codex-review.ts` wrapper as the standard Codex reviewer path,
without asking for separate approval merely to select it. The wrapper requires Bun and an authenticated
Codex CLI with access to the pinned profile and a functioning read-only sandbox. Check the actual
runtime and honor host, repository and user restrictions and permission prompts; a workflow invocation
does not override them. CLI authentication, account and usage limits may differ from the primary host.
If this path is unavailable or fails, report the actual blocker; ask before using any other unapproved
alternative. Do not silently weaken the required profile, isolation or reviewer identity. This package
does not install a global Codex custom-agent configuration.

On Linux, before sending a context packet to the CLI reviewer, probe the same Codex executable in
the intended execution environment with `codex sandbox --permission-profile :read-only -- /bin/true`.
This probe contains no repository content and does not consume a review pass. A successful probe is
not proof that authentication, model access, or the full review will work. If the CLI does not support
the probe, report that the capability is unverified rather than treating it as a successful check.
Diagnose a failed probe before attempting a review. For example, the nested Linux sandbox can fail
when the outer sandbox masks its daemon socket directory; changing `CODEX_HOME` alone does not fix
that conflict. Do not change socket permissions or weaken isolation to force the probe to pass.

If a supported host permission request is needed, make the exact command reviewable and identify the
original explicit skill invocation as the source of authorization to send task changes and necessary
context to Codex. State which process runs outside the outer sandbox, what it reads or writes, the
reviewer's separate read-only boundary, and the destination. Do not imply the entire launcher is
read-only. Exclude credentials and unrelated private data from the review packet. The host may still
deny the request. Honor that decision; never route around a rejection, and ask only for the specific
missing authorization or decision the host requires after completing permitted work.

For the wrapper path, run:

```text
bun <skill-root>/scripts/run-codex-review.ts --cwd <repository> --context-file <temporary-context> --pass <1-10>
```

Create the temporary context outside the repository, use an argument array or safely quoted shell
arguments, wait for completion and parse the JSON envelope. Apply the core workflow's ledger, cleanup,
result validation and pass rules.

The reviewer must not fix its own findings. All validation, edits, tests, and loop decisions stay with
the primary Codex agent.
