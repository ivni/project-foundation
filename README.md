# Project Foundation

Project Foundation is an opinionated, stack-agnostic Agent Skill for establishing a durable
project architecture, delivery process, and artifact set. It supports greenfield bootstrap,
brownfield audit, and focused work such as ADRs, phase slices, risk registers, and docs-to-code
consistency checks.

The package includes an interactive Bun installer for Codex, Claude Code, Pi, OpenCode, and
Hermes Agent.

## Quick start

Install [Bun](https://bun.com/docs/installation), then run:

```bash
bunx @ivni/project-foundation
```

Choose the agent environments, a user or project scope, and a copy or managed-link installation.
The wizard shows a complete preview before writing anything.

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
CLI source from the raw skill payload. See [Development](docs/development.md) for the full layout
and verification workflow.

## License

[MIT](LICENSE)
