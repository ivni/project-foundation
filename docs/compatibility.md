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

Four payloads must not fire on their own: both review loops, the discovery interview, and `teach`
act only on the user's explicit instruction. Two mechanisms express that, and a payload carries both
because no single one covers all five targets:

- `disable-model-invocation: true` in `SKILL.md`, honored by Claude Code and Pi.
- `policy.allow_implicit_invocation: false` in `agents/openai.yaml`, honored by Codex.

`verify:skills` fails when the two disagree, so a payload cannot be user-invoked in one harness and
model-invoked in the other.

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
| Codex | Fresh native Codex subagent pinned to Sol/xhigh; a read-only custom agent or sandbox override is required | `agents/openai.yaml` disables implicit invocation |
| Claude Code | `codex exec` through the packaged Bun wrapper | `disable-model-invocation: true` in the payload |
| Pi | `codex exec` through the packaged Bun wrapper | `disable-model-invocation: true` in the payload |
| OpenCode | `codex exec` through the packaged Bun wrapper | Skill permission `ask` plus an instruction-level boundary |
| Hermes Agent | `codex exec` through the packaged Bun wrapper | Instruction-level boundary; no equivalent per-skill hard flag was verified |

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
| Codex | Claude Code CLI through the packaged Bun wrapper | `agents/openai.yaml` disables implicit invocation |
| Claude Code | Fresh native custom subagent when every strict control is provable; otherwise the wrapper after approval | `disable-model-invocation: true` in the payload |
| Pi | Claude Code CLI through the packaged Bun wrapper | `disable-model-invocation: true` in the payload |
| OpenCode | Claude Code CLI through the packaged Bun wrapper | Skill permission `ask` plus an instruction-level boundary |
| Hermes Agent | Claude Code CLI through the packaged Bun wrapper | Instruction-level boundary; no equivalent per-skill hard flag was verified |

The wrapper pins `--model fable` and `--effort xhigh`, removes conflicting model, effort, update, and
content-telemetry inputs from the child environment, enables safe mode and plan permissions, disables session
persistence, and exposes only `Read`, `Grep`, and `Glob`. This prevents model-initiated tests and
edits, while those responsibilities stay with the primary agent. Organization-managed policy hooks
remain outside the model tool allowlist even in safe mode, so a whole-process guarantee additionally
requires verified harmless hooks or OS-level isolation. The wrapper runs a plain-text profile probe,
then requires non-empty Fable model usage from the JSON review result.

This adapter behavior was reviewed on 2026-08-04 against the primary sources above plus
[OpenAI Codex non-interactive mode](https://developers.openai.com/codex/noninteractive/),
[Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference), and
[Claude Code subagents](https://code.claude.com/docs/en/sub-agents), and the
[Pi skills reference](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md).
Lack of a documented hard explicit-only switch is reported as a limitation, not treated as proof
that a host cannot add one later.

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
