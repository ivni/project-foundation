# Compatibility sources

Last reviewed: 2026-07-12.

The installer targets currently documented stable skill locations. This is a compatibility snapshot,
not a promise that third-party agents will never change their discovery rules.

| Agent | Stable version checked | Confirmed behavior | Primary source |
| --- | --- | --- | --- |
| Codex | `0.144.1` | Repository and user skills under `.agents/skills`; symlinked skill folders supported | [OpenAI: Build skills](https://developers.openai.com/codex/skills) |
| Claude Code | `2.1.207` | Project `.claude/skills` and personal `~/.claude/skills`; live change detection | [Anthropic: Extend Claude with skills](https://code.claude.com/docs/en/slash-commands) |
| Pi | `0.80.6` | `~/.pi/agent/skills`, `~/.agents/skills`, `.pi/skills`, and `.agents/skills` | [Pi coding agent README](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/README.md#skills) |
| OpenCode | `1.17.18` | Native, Claude-compatible, and agent-compatible project and user paths | [OpenCode: Agent Skills](https://opencode.ai/docs/skills/) |
| Hermes Agent | `0.16.0` | User skills under `~/.hermes/skills` and skill management commands | [Hermes Agent: Working with Skills](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/guides/work-with-skills.md) |

The four JavaScript package versions were read from npm. The Hermes version was read from the
repository's latest GitHub release. Versions are evidence for this review, not runtime pins.

## Maintenance policy

- Re-check all five primary sources before a compatibility-affecting release.
- Update this date and the target table together.
- Treat path removal, discovery precedence changes, and symlink-policy changes as breaking behavior.
- Add an automated filesystem test for every newly supported topology.
- Do not infer undocumented project scope. That is why Hermes project scope is unavailable.
