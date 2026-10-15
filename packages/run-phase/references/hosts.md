# Fresh phase workers

Inspect the current host's actual tools, configuration and permissions before dispatch. Use a fresh
worker in the same pinned checkout for every attempt. Do not inherit the parent's conversation,
reuse a completed session, switch worktrees or create user-owned chats. Installing the payload does
not install/authenticate runtimes or configure agents. See [phase-workflow.md](phase-workflow.md)
for packets/results; `run-feature`'s feature-specific helpers do not accept phase state.

## Codex

Use native fresh delegation. On Desktop, use `collaboration.spawn_agent` with `fork_turns: "none"`
and the minimal packet; omit model/effort overrides. Record the actual handle, await terminal
notification via `wait_agent`, and inspect the persisted result. Use `interrupt_agent` on cancellation
and confirm termination before releasing ownership. On CLI/IDE use the equivalent observed native
spawn/await/cancel lifecycle. If unavailable, retain a capability checkpoint; do not create another
chat or substitute the parent as executor.

The executor selects the installed independent review loop per `run-subphase`. Its actual adapter
owns reviewer model/effort/read-only restrictions and fallback approval. Native executor delegation
does not itself provide the reviewer's required isolation.

## Claude Code and OpenCode

Use an available native full worker with a fresh, non-fork context. Inspect the actual schema and
effective worker configuration; names differ by runtime/version (`Agent`/`Task` on Claude Code,
`task`/`subagent` on OpenCode). Select an existing worker whose model/effort, tools and permissions
preserve the current session's constraints. Omitted overrides alone do not prove inheritance.
Do not pass a prior session ID or a broader permission profile. Skills may need to be read explicitly
from the packet's exact paths. Carry approval evidence without bypassing normal permission prompts.

Bind the returned handle; await the actual completed return/background event, including owned shell
and reviewer work. A running response or idle UI does not release ownership. Use the runtime's stop
control and observe termination before replacement. If any part of this lifecycle is unavailable,
save the concrete capability/input needed. Each worker invokes the selected review skill's actual
host adapter; an OpenAI model configured in a different host is not a Codex runtime reviewer.

## Pi and Hermes

Use a fresh same-host CLI process only when the installed CLI and an available process supervisor
can preserve effective configuration/permissions and await/cancel the complete owned process tree.
Inspect actual CLI help and supervisor capabilities; this skill bundles instructions, not a process
supervisor. If that lifecycle cannot be established, save a capability checkpoint and ask for the
specific missing access/setup. Do not launch an unmanaged process or reuse feature-specific helpers.

Pass the persisted packet as data using separate argv or a private input file, never shell
interpolation. Use the current provider/model/reasoning/tools and already trusted config/extensions;
never install an extension, reset delegation limits or widen trust to make dispatch work. Do not use
resume/continue flags or detached jobs. Keep raw streams in per-attempt files, retain the real
runner handle, await actual process-tree completion, and cancel through the owning supervisor.
If cancellation/owner state is uncertain, reconcile before another writer. An exit code or JSON
progress event is transport evidence, never subphase completion. A one-shot child returns any
necessary question to the parent through its persisted result. Review uses the selected installed
loop's Pi/Hermes adapter and actual reviewer runtime.

## Runtime evidence

These routes describe required capabilities, not authenticated execution claims. Verify fresh
context, effective permissions, terminal/cancellation lifecycle and checks/review/commit readback
in the current environment. Filesystem installation tests and simulated handoffs do not establish
live host acceptance.
