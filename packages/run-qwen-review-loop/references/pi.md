# Pi host adapter

Use this adapter only when Pi is the primary implementing agent.

## Explicit invocation

Invoke the installed skill with `/skill:run-qwen-review-loop`, or name it in a prompt. This
portable payload does not set `disable-model-invocation`, so the skill stays visible to the model
and the explicit-only boundary is instruction-level: the description and the invocation section of
`SKILL.md` forbid starting it uninvited.

## Launch the reviewer

Do not use a Pi-native subagent or model alias as the reviewer. Launch the actual Qwen Code CLI
through the shared Bun wrapper:

```text
bun <skill-root>/scripts/run-qwen-review.ts --cwd <repository> --context-file <temporary-context> --pass <1-10>
```

Create the context file outside the repository and pass paths as separate process arguments. Pi's
base runtime does not supply a built-in permission sandbox, so do not infer reviewer isolation from
the host. The wrapper's plan approval mode and reviewer contract are the required boundary, and plan
mode is runtime-level tool enforcement rather than an OS sandbox.

Wait for the wrapper's JSON envelope and use the core workflow for validation, fixes, tests, and
iteration. Stop for approval if Bun, Qwen Code CLI authentication, the exact `qwen3.8-max`/`xhigh`
profile, or the plan approval mode is unavailable.
