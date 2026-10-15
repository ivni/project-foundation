# Compatibility sources

Last reviewed: 2026-08-04.

The installer targets currently documented stable skill locations. This is a compatibility snapshot,
not a promise that third-party agents will never change their discovery rules.

| Agent | Stable version checked | Confirmed behavior | Primary source |
| --- | --- | --- | --- |
| Codex | `0.144.3` | Repository and user skills under `.agents/skills`; symlinked skill folders supported | [OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills) |
| Claude Code | `2.1.207` | Project `.claude/skills` and personal `~/.claude/skills`; live change detection | [Anthropic: Extend Claude with skills](https://code.claude.com/docs/en/slash-commands) |
| Pi | `0.80.6` | `~/.pi/agent/skills`, `~/.agents/skills`, `.pi/skills`, and `.agents/skills` | [Pi coding agent README](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md#skills) |
| OpenCode | `1.17.18` | Native, Claude-compatible, and agent-compatible project and user paths | [OpenCode: Agent Skills](https://opencode.ai/docs/skills/) |
| Hermes Agent | `2026.7.7.2` | User skills under `~/.hermes/skills` and skill management commands | [Hermes Agent: Working with Skills](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/guides/work-with-skills.md) |

The npm versions were read from `@openai/codex`, `@anthropic-ai/claude-code`,
`@earendil-works/pi-coding-agent`, and `opencode-ai`. The Hermes version was read from the
[latest GitHub release](https://github.com/NousResearch/hermes-agent/releases/tag/v2026.7.7.2).
Versions are evidence for this review, not runtime pins.

## Invocation control

Six payloads must not fire on their own: the three review loops, the discovery interview,
`run-subphase`, and `teach` act only on the user's explicit instruction. That boundary is now
instruction-level, not harness-enforced: hosts that honored the hard flags also refused to start
these skills from a prompt that named them — a loop or recurring prompt in particular — and demanded
a slash command, which broke the intended "named in a prompt counts as explicit" contract. So:

- `SKILL.md` omits `disable-model-invocation`; the description is cut to a minimum and ends with
  "Use only when invoked by name," and the skill body's invocation section forbids uninvited starts.
- `agents/openai.yaml` sets `policy.allow_implicit_invocation: true` for the same reason.

`verify:skills` still fails when the two mechanisms disagree, so a payload cannot be user-invoked in
one harness and model-invoked in the other. The host-behavior evidence below is kept for the day a
payload wants the hard flag back.

| Agent | Honors `disable-model-invocation` | Tolerates it | Evidence |
| --- | --- | --- | --- |
| Claude Code | Yes — the description is kept out of context and only the user can invoke | Yes | [Extend Claude with skills](https://code.claude.com/docs/en/skills), invocation-control table, read 2026-08-04 |
| Pi | Yes — the skill is hidden from the system prompt and needs `/skill:name` | Yes; unknown fields ignored | [Pi skills reference](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md) |
| Codex | No — `agents/openai.yaml` carries the policy instead | Yes; verified on `codex-cli 0.146.0` with `codex debug prompt-input`, which loaded a probe skill carrying the field without warning or error | Local probe, 2026-08-04 |
| OpenCode | No | Yes — "Unknown frontmatter fields are ignored" | [OpenCode: Agent Skills](https://opencode.ai/docs/skills/) |
| Hermes Agent | No documented equivalent | Undocumented; Hermes reads its own non-standard fields (`version`, `platforms`, `author`), which indicates a permissive parser | [Hermes: Skills System](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/skills.md) |

Hermes unknown-field handling is the one gap. It is reported as a limitation rather than inferred,
consistent with the policy below. Nothing is lost there either way: Hermes has no per-skill explicit-only
flag, so its boundary was already instruction-level before this field was added.

The [Agent Skills specification](https://agentskills.io/specification) does not define
`disable-model-invocation`; Claude Code documents it as an extension to the standard.

## Managed-link evidence

The installer creates symbolic directory links on macOS and Linux and directory junctions on
Windows. Target discovery and link following are separate compatibility questions:

| Agent | Upstream link-support evidence |
| --- | --- |
| Codex | Symlinked skill folders are explicitly documented |
| Claude Code | Symlink support is explicitly documented |
| Pi | Skill paths are documented; link following is not explicitly documented |
| OpenCode | Skill paths are documented; link following is not explicitly documented |
| Hermes Agent | User skill path is documented; link following is not explicitly documented |

An undocumented entry does not mean links are known to fail. Use the copy strategy when an agent or
managed endpoint does not follow directory links reliably.

## Codex Review Loop adapter boundary

The `run-codex-review-loop` payload uses one workflow but not one delegation mechanism:

| Primary host | Reviewer runtime | Explicit-only enforcement |
| --- | --- | --- |
| Codex | Fresh native Codex subagent pinned to Sol/xhigh; a read-only custom agent or sandbox override is required | Instruction-level boundary in the payload |
| Claude Code | `codex exec` through the packaged Bun wrapper | Instruction-level boundary in the payload |
| Pi | `codex exec` through the packaged Bun wrapper | Instruction-level boundary in the payload |
| OpenCode | `codex exec` through the packaged Bun wrapper | Skill permission `ask` plus an instruction-level boundary |
| Hermes Agent | `codex exec` through the packaged Bun wrapper | Instruction-level boundary; no equivalent per-skill hard flag was verified |

The reviewer uses `gpt-6.1-sol` with `xhigh` reasoning, supported by the
[official model documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol). A local
probe on 2026-09-30 with `codex-cli 0.159.2` completed a structured-output request using that model
and reasoning effort with `--ephemeral`, `--strict-config`, and the `read-only` sandbox.

The external adapters intentionally do not relabel host-native agents configured with OpenAI models
as Codex. Their wrapper pins the model, reasoning effort, ephemeral mode, read-only sandbox, output
schema, and timeout without shell interpolation. Codex's read-only sandbox enforces filesystem
access, while the prohibition on test and validation commands is reviewer-contract-only. The primary
host retains all edits and test execution.

The payload does not install a global Codex custom-agent profile. A Codex host whose delegation
interface only inherits the writable parent sandbox must block before pass 1 and ask whether the user
approves the external wrapper fallback.

## Claude Review Loop adapter boundary

The `run-claude-review-loop` payload keeps the same workflow and selects the actual Claude runtime:

| Primary host | Reviewer runtime | Explicit-only enforcement |
| --- | --- | --- |
| Codex | Claude Code CLI through the packaged Bun wrapper | Instruction-level boundary in the payload |
| Claude Code | Fresh native custom subagent when every strict control is provable; otherwise the wrapper after approval | Instruction-level boundary in the payload |
| Pi | Claude Code CLI through the packaged Bun wrapper | Instruction-level boundary in the payload |
| OpenCode | Claude Code CLI through the packaged Bun wrapper | Skill permission `ask` plus an instruction-level boundary |
| Hermes Agent | Claude Code CLI through the packaged Bun wrapper | Instruction-level boundary; no equivalent per-skill hard flag was verified |

The wrapper pins `--model fable` and `--effort xhigh`, removes conflicting model, effort, update, and
content-telemetry inputs from the child environment, enables safe mode and plan permissions, disables session
persistence, and exposes only `Read`, `Grep`, and `Glob`. This prevents model-initiated tests and
edits, while those responsibilities stay with the primary agent. Organization-managed policy hooks
remain outside the model tool allowlist even in safe mode, so a whole-process guarantee additionally
requires verified harmless hooks or OS-level isolation. The wrapper runs a plain-text profile probe,
then requires non-empty Fable model usage from the JSON review result.

The Codex and Claude adapter behavior was reviewed on 2026-08-04 against the primary sources above
plus [OpenAI Codex non-interactive mode](https://developers.openai.com/codex/noninteractive/),
[Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference), and
[Claude Code subagents](https://code.claude.com/docs/en/sub-agents), and the
[Pi skills reference](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md).
Lack of a documented hard explicit-only switch is reported as a limitation, not treated as proof
that a host cannot add one later.

## Qwen Review Loop adapter boundary

The `run-qwen-review-loop` payload keeps the same workflow with no native-subagent path: every host
launches the actual Qwen Code CLI through the packaged Bun wrapper.

| Primary host | Reviewer runtime | Explicit-only enforcement |
| --- | --- | --- |
| Codex | Qwen Code CLI through the packaged Bun wrapper | Instruction-level boundary in the payload |
| Claude Code | Qwen Code CLI through the packaged Bun wrapper | Instruction-level boundary in the payload |
| Pi | Qwen Code CLI through the packaged Bun wrapper | Instruction-level boundary in the payload |
| OpenCode | Qwen Code CLI through the packaged Bun wrapper | Skill permission `ask` plus an instruction-level boundary |
| Hermes Agent | Qwen Code CLI through the packaged Bun wrapper | Instruction-level boundary; no equivalent per-skill hard flag was verified |

The wrapper pins `--model qwen3.8-max` as a CLI argument and pins `xhigh` reasoning through a
wrapper-owned system settings file passed via `QWEN_CODE_SYSTEM_SETTINGS_PATH`, which Qwen Code
documents as overriding all other settings files. The same file re-pins the `plan` approval mode and
empties the MCP server list, so a workspace `.qwen/settings.json` cannot hand the reviewer a mutation
tool. The child environment keeps the user's configured authentication while stripping model,
settings-path, and sandbox overrides. Plan approval mode is enforced by the Qwen Code runtime on its
tool surface — it is not an OS sandbox — and the prohibition on tests and validation commands is
reviewer-contract-only. Model usage reported in the CLI's JSON stats is corroborating evidence:
present data naming another model fails the pass, while absent data is surfaced as an empty
`reported_models` list and must not be claimed as attestation. Qwen Code has no structured-output flag, so the output schema
travels inside the prompt and the wrapper validates the parsed response locally, accepting at most
one wrapping Markdown fence.

This adapter behavior was reviewed on 2026-08-19 against the
[Qwen Code headless mode](https://qwenlm.github.io/qwen-code-docs/en/users/features/headless/) and
[Qwen Code configuration](https://qwenlm.github.io/qwen-code-docs/en/users/configuration/settings/)
documentation. The `--output-format json` envelope shape and the stats model inventory were taken
from that documentation, not verified against a local `qwen` installation, and the wrapper rejects
any envelope that does not match them instead of guessing.

## Feature orchestration research (S1)

Reviewed: 2026-10-12, for [feature issue #1](https://github.com/ivni/project-foundation/issues/1).
This section records the S1 route selection. The local S2/S3 implementation is described below;
release and full authenticated runtime acceptance remain separate gates.
It does not change the installer snapshot above or the existing stage/review authority boundaries.
Documentation, capability probes, and full feature acceptance are separate evidence levels.

### Selected executor routes

Every dispatch names the installed `run-feature-stage`, its resolved skill root, the exact checkout,
feature record, issue URL, expected stage, and orchestration/attempt identity. The worker reads the
live issue, published discovery and recovery/review pointers itself. It receives no prior worker
conversation. Preserve the effective executor model, reasoning, tools and permissions; preflight
must identify any settings a fresh process needs explicitly rather than choose a different profile.
All routes need project checks, local Git operations and authenticated access to the selected forge.

| Host | Selected fresh-worker mechanism and completion | Independent Codex reviewer | S1 observation / validation dependency |
| --- | --- | --- | --- |
| Codex | Native spawn with no inherited turns (`fork_turns: "none"` on this Desktop surface); await terminal result before another spawn. Retain the handle for interruption; close completed agents when that host exposes a close operation. | Native pinned Sol/xhigh only when a real read-only override/profile is selectable; otherwise use the existing wrapper after the installed review adapter's required approval. | Three distinct sequential native agents read a disposable fixture; later agents received no first-prompt canary, and the third read the installed stage skill. CLI `0.162.1` completed the external read-only wrapper probe after approved fallback. Complete worker → review → commit → issue journey remains S2/S4 work. |
| Claude Code | A new non-fork delegation call per stage (Agent in current docs; Task in this CLI's reported tool inventory); never resume the previous agent or choose the conversation-fork type. Use an available full worker, with `model: inherit` when defining it; no permanent global agent file. Foreground result or background completion notification is the completion seam. | Worker launches the packaged Bun/Codex wrapper through permitted Bash. No nested reviewer Agent is necessary. | CLI `2.1.296` loaded the transient probe definition, but both bounded launches returned `is_error: true`, OAuth expired and refresh failed, before delegation. Authenticated execution is unverified (E-CLAUDE). |
| Pi | Fresh same-host subprocess in the selected checkout: argument array `pi --mode json -p --no-session <brief>`, with effective model/thinking passed when needed. Wait for exit and parse terminal output. No delegation extension is required. | Worker runs the existing Bun/Codex wrapper through its permitted shell tool. | No `pi` executable on PATH (E-PI). Source supports the process mechanism; no local runtime result. |
| OpenCode | New native child session through the installed delegation tool, with no prior session identifier; await its completed result. Inspect the actual tool schema: public docs call it Task, while the inspected upstream `dev` implementation uses `subagent` and `sessionID`. Do not pin a development API as a stable-runtime guarantee. | Worker launches the existing Bun/Codex wrapper through permitted shell access. | No `opencode` executable on PATH (E-OPENCODE). Tool/skill permission checks and actual child schema remain runtime preflight, not permission overrides. |
| Hermes | Fresh same-host CLI worker per stage: argument array `hermes chat --in <checkout> --query-file <packet> --oneshot --format stream-json`; no resume/continue/worktree flag. Wait for process exit and terminal result. Preserve the active profile/provider/model/reasoning/toolsets and effective permissions. | Worker runs the existing Bun/Codex wrapper through its inherited terminal capability, without native reviewer delegation. | No `hermes` executable on PATH (E-HERMES). Source selects an explicit checkout and independent session; execution remains unverified. |

Route evidence:

- [OpenAI subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) documents lifecycle,
  inherited permissions and custom-agent controls. The actual Desktop delegation schema here offers
  no sandbox override. An instruction to stay read-only cannot satisfy the native reviewer adapter.
- [Claude subagents](https://code.claude.com/docs/en/sub-agents) distinguishes non-fork fresh context
  from full-history forks, chaining, skill access and tool inheritance. Current default nesting is
  three layers; the stage worker uses an external reviewer process and needs no extra Agent depth.
  [CLI reference](https://code.claude.com/docs/en/cli-reference) documents transient `--agents`
  definitions and structured print output. The probe narrowed tools to Read/Agent and used dontAsk;
  those probe restrictions are not the implementation worker profile.
- [Pi's upstream extension](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/README.md)
  and its [launcher source](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts)
  establish separate processes, JSON/no-session flags, cwd and dispatch model/thinking propagation.
  The new workflow will own termination/wait/cleanup for its subprocesses, without installing the
  example extension. [Pi skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md)
  describes exact-name invocation and reading the resolved skill file.
- [OpenCode agents](https://opencode.ai/docs/agents/) documents child sessions and `permission.task`;
  [skills](https://opencode.ai/docs/skills/) documents skill allow/ask/deny. The inspected
  [upstream delegation source](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/tool/plugin/subagent.ts)
  creates a fresh child when its session identifier is omitted and enforces dispatch permissions.
  S3 must bind the adapter to the installed schema and its permission key, preserving ask/deny;
  neither a hidden/denied tool nor a denied skill authorizes a CLI bypass.
- [Hermes CLI](https://hermes-agent.nousresearch.com/docs/user-guide/cli) and its
  [parser](https://github.com/NousResearch/hermes-agent/blob/main/hermes_cli/_parser.py) support the
  selected file/JSON/checkout route. [Delegation](https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation)
  has different interactive/background delivery and a default total of two children in a one-shot
  native delegation run. The selected independent CLI-worker route needs no nested native children,
  depth increase or change to that limit. It also avoids native worktree isolation creating a
  different stage checkout. No session-closure durability or scheduler is promised.

For subprocess routes, cancellation stops the owned process tree, waits for termination, and
reconciles Git/issue state before any retry. Temporary packets are removed after the awaited run,
including error/timeout paths; durable review/result evidence is retained first. Native routes use
their actual cancellation/completion surface. A running handle or exit zero is not stage completion.

### Validation environments at S1

The original plan assigned the following runtime dependencies to the engineering agent before S4.
The owner replaced their acceptance method on 2026-10-13; see
[Feature orchestration acceptance](#feature-orchestration-acceptance) for the current decision.
Source of access is the current authenticated installation or a user-provided execution environment;
discover available access first and ask only for concrete missing environment/auth information.
Do not install runtimes, refresh credentials interactively, widen permissions or change global config
without the separately required authority.

| Dependency | Missing capability / source | Due and required proof |
| --- | --- | --- |
| E-CLAUDE | Working Claude authentication in the installed `2.1.296` runtime or another named compatible authenticated environment; current OAuth cannot refresh. | Agent, before S4: three fresh workers with real Codex review, checks, commits and issue readback; record runtime version. |
| E-PI | Available authenticated Pi installation and permitted process/shell/skill access. | Agent, before S4: same complete three-stage proof on the actual runtime. |
| E-OPENCODE | Available authenticated OpenCode installation with actual delegation schema, permitted worker and skill/shell access. | Agent, before S4: same proof, including ask/deny behavior without rewriting policy. |
| E-HERMES | Available authenticated Hermes CLI, selected effective profile and permitted terminal/skill access. | Agent, before S4: same proof through three independent workers with default native child limits unchanged. |

The Codex probe establishes fresh-context dispatch and the wrapper's capability, not FA-06 or the
complete future workflow. At S1 no host had passed the full feature journey. An absent validation
environment can be a dependency of S4 while a selected source-backed adapter is implemented in S3;
an unknown mechanism must be resolved before its dependent implementation starts.

### Result and recovery decisions for S2/S3

UNK-003 and UNK-005 use a small JSON result, validated by the parent against real persisted evidence.
The chosen fields are `schema: 1`, orchestration/attempt IDs, feature ID, canonical repository and
issue URLs, original base commit, checkout, stage ID, outcome, optional commit SHA, and evidence
pointers (checks/tested state, review ledger/run/pass, issue result). The outcomes are:

| Outcome | Parent action |
| --- | --- |
| `stage-complete` | Verify stage contract, commit presence/ancestry in the selected checkout, checks/review tied to that state, latest issue/result readback and cleared stage checkpoint; then select the next unfinished stage from this same issue. |
| `retryable-error` | Inspect cause and side effects, repair permitted failures or change approach, then launch a fresh attempt of the same stage. No mechanical retry-count stop. |
| `review-exhausted` | End the current bounded review run; carry its ledger, dispositions, fixes/tested states and task-wide history into an explicitly identified new run for the same stage. Never pass 11 in the old run. |
| `needs-user-input` | Persist the exact missing information, question and why available sources cannot supply it; stop for that answer. A sufficient answer resumes the same stage. |
| `interrupted` | Preserve the current action and evidence; reconcile side effects before resuming. Usage/runtime interruption and explicit cancellation do not mean done; explicit cancellation needs an explicit resume. |

Missing/malformed output, stale identity, mismatched SHA or false child success cannot authorize
advancement. Diagnose them using the record, Git and issue; do not blindly re-run writes or label
every error a stakeholder blocker. A worker without a clarification tool returns its question.

Use the existing feature record for stage recovery and a minimal
`.agents/work/features/<feature-id>.orchestrator.json` sidecar for parent recovery: fixed selected
identity, run/attempt, active handle, action, result/review pointers and cancellation/question facts.
The sidecar contains no copied plan or completed-stage list. Parent and worker own their respective
records; serialize dispatch so there is one active stage executor for this feature. Atomic sibling
write/rename, identity/path validation and ownership reconciliation precede replacement or resumption.
An existing active owner must be inspected/waited/stopped before another dispatch, never overwritten
as stale solely on elapsed time. A changed active-feature pointer does not retarget a running feature.

Recover `committed-awaiting-issue` as the same stage's missing publication, with no second commit or
implementation. Refetch before merging status/checkbox edits, preserve concurrent authors' content,
find uncertain writes by saved stage/commit identity, and verify readback. Resolve consequential plan
changes before claiming completion. Carry only short results/pointers through parent compaction.

### Scoped authority decision for S2

Extend `run-feature-stage` and canonical `shared/feature-workflow.md` to recognize an explicit
user-started `run-feature` invocation and its pinned child packet as delegated stage authority.
Each worker still consumes one stage, including committed-result recovery; the parent may dispatch
the next worker. Standalone stage invocation still stops after one stage. No delivery or installation
authority is added. Existing review fallback approvals must be carried explicitly, not invented.

Add a Codex-review-only orchestration continuation rule: a terminal exhausted/disputed/non-converged
review run returns its cause to the parent. The parent diagnoses it, preserves blocking findings and
history, and chooses a permitted recovery/new run rather than treating repetition itself as a user
blocker. A genuine missing permission/scope decision or unreliable unavailable capability still needs
the specific user information it cannot obtain. Review requirements are never waived.
Preserve the ten-completed-pass limit per run and standalone review stops. Scope the exception in the
Codex payload and shared registry/template hooks; do not silently change the shared manual
Claude/Qwen loops. Any canonical changes require `bun run sync:shared`.

S2 must exercise the protocol and authority changes with fault injection at the local issue seam;
S3 implements the selected other-host routes. The original S4 required actual full journeys on all
five hosts; the owner amended non-Codex acceptance on 2026-10-13 as recorded below.
The live plan and completion evidence remain in issue #1.

## Feature orchestration adapters (S3)

Reviewed: 2026-10-13 against the primary sources linked in the S1 matrix and the installed runtime.
`packages/run-feature` now routes all five hosts. Codex uses its native fresh delegation;
Claude Code/OpenCode use observed native schemas, and Pi/Hermes use fresh same-host CLI processes.
The non-Codex packet helper reads pinned feature/attempt state and names exact stage/review skills;
it never invokes guessed native APIs or changes permission policy. Every non-Codex worker uses the
actual Codex CLI wrapper for independent review. The same state/result guards own advancement,
error diagnosis, necessary questions, review-history continuation and committed-result recovery.

Effective runtime configuration is a preflight requirement. Native workers must already be
compatible with the parent's model/effort, tools and permissions; omitting overrides alone is not
proof of inheritance for a custom agent. Fresh CLI workers must reproduce effective config/env and
session restrictions without installing extensions, granting trust, widening permissions or
changing persistent profiles. The helper accepts only known scalar configuration fields and keeps
credentials out of packets. OpenCode retains native task/skill ask/deny; no CLI bypass is provided.

Pi/Hermes transport uses argument arrays, exclusive per-attempt artifacts and a private temporary
brief. It awaits the host process, terminates owned background descendants and observes terminal
owned descendant state before reporting transport completion, including shells/reviewers that
create independent process groups/sessions. Cancellation requires the owning runner
handle and `stop` before interruption; a crashed/killed runner leaves ownership for reconciliation.
This process-tree implementation uses a dedicated Linux subreaper with readable owned `/proc`
records and Bun FFI/libc `prctl`/pidfd functions; macOS/Windows execution is explicitly unavailable
until a verified equivalent lifecycle exists. Stable descriptors prevent signalling recycled PIDs;
the supervisor does not adopt or terminate unrelated children of an importing caller. Installer OS support does not
claim worker-process support. Native cancellation likewise requires the actual host's lifecycle.
Hermes leaf workers create no native children and keep the native one-shot two-child limit intact.

Evidence levels remain distinct: executable native-schema/permission contracts and real POSIX
process doubles exercise the adapter, not authenticated Claude/Pi/OpenCode/Hermes execution.
On this checkout, Claude Code `2.1.296` reports `loggedIn: false`; the bounded no-tools startup probe
cannot authenticate. Pi, OpenCode and Hermes are absent from PATH and checked standard locations.
Kernel mechanism sources: [subreaper](https://man7.org/linux/man-pages/man2/PR_SET_CHILD_SUBREAPER.2const.html),
[/proc](https://docs.kernel.org/filesystems/proc.html),
[pidfd](https://man7.org/linux/man-pages/man2/pidfd_send_signal.2.html),
[Bun FFI](https://bun.com/docs/runtime/ffi).
No runtime, extension or global configuration was installed/changed. Those S3 observations remain
runtime limitations; the owner subsequently changed their acceptance requirement below.

## Feature orchestration acceptance

Reviewed on **2026-10-13**. The feature owner explicitly requested proceeding from documentation
without checks of the unavailable Claude Code, Pi, OpenCode and Hermes installations. The
[issue amendment](https://github.com/ivni/project-foundation/issues/1#issuecomment-6145220940)
replaces those four authenticated journeys with primary-source reconciliation and contract evidence.
The original discovery snapshot remains unchanged. This is acceptance of unverified runtime behavior;
it does not disable auth, permissions, independent review or completion checks when the skill runs.

| Host | Route and current primary source | Evidence and limit |
| --- | --- | --- |
| Codex | Fresh native executor with a minimal packet; [official subagents documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents). Actual read-only reviewer override or the review skill's approved CLI fallback. | S2 observed three distinct native executors, three actual Codex CLI review passes, local checks/commits and issue readback through a controllable local forge seam. The seam was not a live forge. |
| Claude Code | Native Agent with a compatible worker and fresh prompt; [subagents](https://code.claude.com/docs/en/sub-agents) documents context, model/effort, permissions and lifecycle. | Documentation and native-packet contracts; authenticated execution omitted by owner. Select the effective worker configuration, await its terminal result and use actual Codex CLI review. |
| Pi | Fresh CLI `--mode json -p --no-session`; [argument parser](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/cli/args.ts) and [upstream process example](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts). | Documentation and process doubles; authenticated execution omitted by owner. The bundled supervisor requires Linux. No delegation extension is installed. |
| OpenCode | Classic `task` or V2 `subagent`; [classic agents](https://opencode.ai/docs/agents/), [V2 agents](https://opencode.ai/v2/docs/agents) and [delegation source](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/tool/plugin/subagent.ts). | Documentation and native-packet contracts; authenticated execution omitted by owner. V2 uses `agents` and `permissions` action/resource/effect rules; classic `permission.task` is not its configuration schema. Actual tool/schema, worker permissions and cancellation still require preflight. |
| Hermes | Fresh same-checkout CLI leaf with `--query-file`, `--oneshot`, `--format stream-json`; [CLI reference](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/reference/cli-commands.md) and [delegation](https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation). | Documentation and process doubles; authenticated execution omitted by owner. Linux supervisor; leaf uses zero native children and retains the documented one-shot total-child cap. |

Local acceptance covers the shared state/result guards, recovery after commit/publication failure,
necessary answers, cancellation and review-history continuation. A synthetic ten-pass history tests
rollover ordering; it is not ten actual reviewer calls. Contract fixtures preserve unrelated work
and distinguish successful worker results from transport exits. Isolated filesystem tests cover
real payload copy/link install, update and removal for every supported agent/scope combination,
preserving other payloads. No new installer topology was introduced, so these are local filesystem
checks rather than a new OS execution matrix or pending CI claim.

All four non-Codex routes remain unverified with authenticated runtimes. Unsupported or unavailable
runtime permissions/lifecycle must still produce an honest checkpoint during use. Merge, required
CI and authorized issue closure remain separate delivery gates.

## Maintenance policy

- Re-check all five primary sources before a compatibility-affecting release.
- Update this date and the target table together.
- Re-check frontmatter field tolerance whenever a payload adds a field outside the Agent Skills
  specification. Probe the installed CLI where one exists; report an undocumented target as a
  limitation.
- Treat path removal, discovery precedence changes, and directory-link policy changes as breaking
  behavior.
- Add an automated filesystem test for every newly supported topology.
- Do not infer undocumented project scope. That is why Hermes project scope is unavailable.

## Phase orchestration

Added: 2026-10-15. `run-phase` uses the same fresh-worker boundary as `run-feature`, with
`run-subphase` as its executor and the prepared phase slice as the canonical plan/progress store.
Its lifecycle is instruction-driven: parent-owned recovery metadata, one reserved writer, actual
terminal observation, independent evidence readback, retries and diagnosed new review runs.
It adds no feature issue/forge dependency and never automatically opens the next phase.

Codex, Claude Code and OpenCode use observed native fresh-context delegation tools when available;
actual effective model/tool/permission and cancellation semantics must be checked before dispatch.
Pi/Hermes require an already available supervisor that can preserve session restrictions and await
and cancel the whole owned process tree. This payload does not bundle that supervisor. The bundled
`run-feature` scripts accept feature records and issue state only; they cannot run phase packets.
An unavailable lifecycle is a capability checkpoint, not permission to launch an unmanaged worker.

Local validation covers skill/shared-text/package integrity, isolated payload install/update/removal
and independent simulated handoff decisions. It does not establish authenticated multi-subphase
execution or cancellation on any host. The earlier feature-orchestration runtime/acceptance evidence
above is evidence for that workflow only. Use the installed runtime's actual capability checks and
the selected review loop's host adapter before running a phase.
