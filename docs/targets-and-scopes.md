# Targets and scopes

Every installed skill lives in an immediate child directory under one of the roots below. The
packaged child names are `project-foundation`, `find-blind-spots`, `run-discovery-interview`,
`run-subphase`, `run-codex-review-loop`, `run-claude-review-loop`, and `teach`.

| Agent | User root | Project root | Shared discovery |
| --- | --- | --- | --- |
| Codex | `~/.agents/skills` | `.agents/skills` | Also discovered by Pi and OpenCode |
| Claude Code | `~/.claude/skills` | `.claude/skills` | Also discovered by OpenCode |
| Pi | `~/.pi/agent/skills` | `.pi/skills` | Native Pi target |
| OpenCode | `~/.config/opencode/skills` | `.opencode/skills` | Native OpenCode target |
| Hermes Agent | `~/.hermes/skills` | Not available | User scope only |

On Linux, OpenCode honors `XDG_CONFIG_HOME` when set.

## User scope

Use user scope when the selected skills should be available in all projects for the current OS user.
Every selected skill uses the same managed-store rule:

- Windows: `%LOCALAPPDATA%\project-foundation\store\skills\<skill-id>`
- macOS: `~/Library/Application Support/project-foundation/store/skills/<skill-id>`
- Linux: `${XDG_DATA_HOME:-~/.local/share}/project-foundation/store/skills/<skill-id>`

## Project scope

Use project scope when selected skills should be discovered only from one project. Every selected
skill uses the same managed-store rule:

```text
<project>/.agents/project-foundation/skills/<skill-id>
```

The installer uses `git rev-parse --show-toplevel` only as a read-only hint for the project root. It
never writes `.git`, stages files, creates commits, switches branches, or manages worktrees. Project
scope does write normal files under the selected project, so it can add untracked files or modify a
tracked skill directory. Reviewing and committing those working-tree changes is the user's
responsibility. You can replace the detected path before installation.

Hermes Agent does not currently document a project-scoped skill root, so it is disabled when project
scope is selected.

## Deduplication

The installer plans the smallest native topology that remains discoverable:

- Selecting Codex, Pi, and OpenCode can produce one `.agents/skills/<skill-id>` target per selected
  skill.
- Selecting Claude Code and OpenCode can produce one `.claude/skills/<skill-id>` target per selected
  skill.
- Removing one agent from a shared installation can migrate the target so remaining agents continue
  to discover it.

Each skill has its own receipt, target topology, and managed store. A receipt records the intended
agents even when several agents share that physical payload. A multi-skill confirmation adds an outer
rollback boundary across those independent operations.
