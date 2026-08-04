# Project Foundation

Project Foundation is a focused Agent Skill suite for moving from uncertainty to an agreed,
durable project foundation:

- **Find Blind Spots** performs a read-only search for consequential unknowns, classifies them by
  product, UX, business, domain, or engineering concern, and routes each to the right owner or
  validation method.
- **Discovery Interview** defaults to a non-technical product-owner track for product value,
  functionality, domain rules, UX, and business constraints. It asks one stakeholder-owned decision
  at a time while writing only one scratch discovery record.
- **Codex Review Loop** explicitly launches an independent read-only Codex reviewer over the current
  task's uncommitted changes, then lets the primary agent validate findings, make bounded fixes, run
  checks, and re-review until clean or honestly blocked.
- **Claude Review Loop** runs the same bounded workflow through an actual Claude Fable/xhigh reviewer
  with only read-only file inspection tools; the primary agent remains responsible for all tests.
- **Project Foundation** turns the resulting product and UX contract into agent-led technical
  synthesis, architecture, delivery process, and a canonical artifact set.

One further skill stands apart from that arc and is installed independently:

- **Teach** treats the current directory as a stateful learning workspace — mission, curated
  sources, glossary, learning records, and lessons — so a topic can be taught across many sessions.
  It shares no artifacts with the engineering skills and never touches a software project's docs.

The package includes an interactive Bun installer for Codex, Claude Code, Pi, OpenCode, and
Hermes Agent.

## Quick start

Install [Bun](https://bun.com/docs/installation), then run:

```bash
bunx @ivni/project-foundation
```

Choose any combination of the six skills, the agent environments, a user or project scope, and a
copy or managed-link installation. All six skills are preselected; deselect the ones you do not
want. The wizard shows a complete preview before writing anything.

The skill registry is the source of truth: each registry key is also the package directory, native
target name, managed-store name, and receipt `skillId`. Adding another skill does not require a new
installer code path.

You can also open a flow directly:

```bash
bunx @ivni/project-foundation install
bunx @ivni/project-foundation@latest update
bunx @ivni/project-foundation remove
```

Nothing is installed globally as an executable. `bunx` downloads and runs the package for that
invocation. Use `@latest` for updates when you want to bypass ambiguity around cached package
resolution.

## Supported environments

| Agent | User scope | Project scope |
| --- | --- | --- |
| Codex | `~/.agents/skills` | `.agents/skills` |
| Claude Code | `~/.claude/skills` | `.claude/skills` |
| Pi | `~/.pi/agent/skills` | `.pi/skills` |
| OpenCode | `~/.config/opencode/skills` | `.opencode/skills` |
| Hermes Agent | `~/.hermes/skills` | Not supported |

The installer understands cross-agent discovery. For example, Codex, Pi, and OpenCode can share
one `.agents/skills` target instead of receiving redundant copies.

## Safety model

- Every mutation is preceded by a preview.
- A multi-skill operation uses an outer compensating transaction, so a later skill failure rolls
  back earlier skill mutations from the same confirmation.
- Existing unmanaged content is never overwritten silently.
- Locally modified managed installs can be shown as a diff, kept, removed, or backed up first.
- Multi-path operations use compensating rollback when a write fails.
- Downgrades are rejected.
- The installer never writes `.git` or mutates the index, branches, commits, or worktrees. Project-scope files can change the working tree and remain the user's Git responsibility.
- No telemetry is collected.

## Documentation

- [Installation](docs/installation.md)
- [Targets and scopes](docs/targets-and-scopes.md)
- [Copy vs link](docs/copy-vs-link.md)
- [Updating](docs/updating.md)
- [Removing](docs/removing.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Compatibility sources](docs/compatibility.md)
- [Development](docs/development.md)
- [Release process](docs/release.md)

## Development

```bash
bun install --frozen-lockfile
bun run check
```

The public package is the repository root. The private workspaces under `packages/` separate the
CLI source from the six raw skill payloads. See [Development](docs/development.md) for the full
layout and verification workflow.

## License

[MIT](LICENSE)
