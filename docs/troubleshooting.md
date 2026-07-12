# Troubleshooting

## `bun` or `bunx` is not found

Install Bun from [bun.com](https://bun.com/docs/installation), restart the terminal, and run:

```bash
bun --version
```

Project Foundation requires Bun 1.3 or newer.

## The installer says a terminal is required

Install, update, and remove are intentionally interactive. Run the command directly in a terminal,
not through a pipe, redirected input, or a non-interactive CI step.

## Windows cannot create links

Choose `Install copies instead` in the wizard, or enable Windows Developer Mode and retry. The
installer does not elevate itself. If an endpoint policy blocks symbolic links, use copy strategy.

Because every operation is transactional, a failed link attempt should leave the original targets
unchanged.

## A target already contains a skill

Use `Show diff` before deciding. Choose `Keep` to leave it untouched, or `Remove and back up` to save
the existing directory before replacement. The installer will not classify an unmanaged directory as
safe merely because it has the same name.

## The skill does not appear in an agent

1. Confirm the target contains `project-foundation/SKILL.md`.
2. Check the agent's skill permissions or exclusions.
3. Restart the agent if the top-level skill directory was created after the session started.
4. Use the optional discovery checks shown at the end of installation.

Agent-specific checks:

- Codex: run `/skills` or type `$project-foundation`.
- Claude Code: run `/project-foundation`.
- Pi: run `/skill:project-foundation`.
- OpenCode: verify skill permissions and ask it to use `project-foundation`.
- Hermes Agent: run `/skills`, then invoke `/project-foundation`.

## Update reports local changes

The receipt hash differs from the current files. Review the diff. If those edits matter, choose
`Back up and update` or `Skip`. Backups preserve the complete physical skill directory.

## An operation reports incomplete rollback

This means both the requested operation and at least one compensating restore failed. Do not rerun
immediately. Record every path in the error, inspect the filesystem and backup directory, then open a
GitHub issue with the OS, Bun version, command, and redacted error output.

## Reporting a problem

Open an issue at <https://github.com/ivni/project-foundation/issues>. Include:

- OS and version
- `bun --version`
- agent environments and selected scope
- copy or link strategy
- exact command
- redacted error output

Do not include credentials, private repository contents, or full skill diffs from confidential work.

For an unexpected internal error, rerun the same interactive command with `--debug` to include a stack
trace. Review and redact that trace before sharing it.
