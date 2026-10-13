# Hermes orchestration adapter

Use an independent same-host CLI worker for every attempt:
`hermes [--profile <effective-profile>] chat --in <checkout> --query-file <packet> --oneshot --format stream-json`.
The bundled runner uses separate arguments, a private temporary packet and the exact shared checkout;
it does not use resume/continue, native worktree isolation or a previous conversation. Read
[hosts.md](hosts.md) for effective configuration and process lifecycle.

Preflight the installed CLI help, active profile/provider/model/reasoning/toolsets and terminal,
skill and command permissions. `configuration.values` can carry the effective `profile`,
`provider`, `model`, `reasoning` and `toolsets`; omit a value only when existing config/env discovery
reproduces it. Named profile selection affects configuration/auth discovery: never select another
profile to escape a deny or create/edit one. Session-only permissions/restrictions that a fresh CLI
cannot reproduce require a capability checkpoint before launch. The runner inherits its environment;
it never copies credentials into the brief or records their values.

The parent is the orchestrator; each CLI worker is a one-stage leaf. Hermes native `delegate_task`
has distinct foreground/background delivery, depth and one-shot total-child limits (the documented
default is two total children). This route uses **zero native children** for its stage/reviewer
pair. Three sequential independent CLI workers therefore do not require increasing or resetting
that native limit. The stage leaf invokes the external Codex reviewer, not nested Hermes delegates.
If the parent lacks permitted CLI/terminal access, preserve the concrete checkpoint; do not switch
to a worktree or widen native limits as a bypass. No continuation after session closure is promised.

Stream JSON progress does not close a stage. Await process-tree completion and inspect the result
file, actual checks/Codex-review logs, commit, issue readback and cleared stage checkpoint. Persist
`stop` before sending cancellation to the owning runner; await termination and reconcile before
retry. Necessary missing information is returned as `needs-user-input` when the one-shot leaf
cannot ask. Error retries and new bounded review cycles use the same shared history/identity rules.

Use the installed review skill's **Hermes** adapter with actual Bun/Codex CLI Sol/xhigh/read-only.
Neither Hermes delegation nor an OpenAI model setting substitutes for that runtime.
Sources: [CLI](https://hermes-agent.nousresearch.com/docs/user-guide/cli),
[parser](https://github.com/NousResearch/hermes-agent/blob/main/hermes_cli/_parser.py),
[delegation limits and delivery](https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation).
Three process doubles prove runner sequencing only; actual Hermes acceptance remains separate.
