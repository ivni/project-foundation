# Updating

Use the latest published installer explicitly:

```bash
bunx @ivni/project-foundation@latest update
```

`update` and `install` open the same wizard. It discovers existing user installations and
installations in the current project, and reuses their agents, scope, and installation method.
Updates and optional additions appear in one list. Every choice includes the skill name and agents.
The wizard never replaces a newer installed version with an older package.

## Normal update

1. Choose an existing configuration, or choose different settings to target another project or agents.
2. Review the preselected updates and optionally select absent skills to add in the same run.
3. Resolve local modifications and target conflicts, then review version transitions and physical paths.
4. Apply the combined plan, or change the selection or configuration from the preview.

If installed skills are already current, the wizard still offers absent skills. Additions are not
preselected for an existing configuration, so deliberately omitted skills are not restored by default.

Link installations update their per-skill shared managed payload. Native links remain in place. Copy
installations update each selected physical payload. New files use the selected configuration's
method; existing installations retain theirs. Updating and adding several skills uses one outer
rollback boundary. Updates and additions to the same skill are prepared in one transaction.

Updating skills does not rewrite existing project contracts, runbooks, or documents created from
templates. When adopting revised process guidance, inspect the project's own `AGENTS.md` and any
existing canonical contract for older requirements. Resolve conflicts within the authorized task;
do not silently ignore project rules or bulk-rewrite unrelated repositories.

Schema 1 content is not a managed update candidate because it has no required `skillId`. Select its
skill as an addition in the same wizard; the existing target appears as unmanaged content and must
be explicitly replaced, backed up and replaced, or kept.

## Local modifications

When installed files no longer match their receipt, the wizard pauses and offers:

- Show diff
- Update and discard local modifications
- Back up the modified payload, then update
- Skip this installation

Keeping local changes in a shared link store also skips additions that would reuse that modified
store. Other selected updates and additions can still proceed. Local modifications in a current
installation are kept unless that installation needs a selected package update or repair.

If `$PAGER` names an available pager, the full diff opens there. Otherwise the built-in viewer pages
through the diff inside the wizard.

## Breaking releases

Major SemVer updates display a warning and default the final confirmation to cancel. While the
package is below 1.0, minor updates are also treated as breaking. Read
[CHANGELOG.md](../CHANGELOG.md) before explicitly choosing `Apply changes` for a breaking update.

## Updating the installer itself

There is no globally installed Project Foundation executable to maintain. `bunx` resolves and runs the
package. Adding `@latest` makes the desired package version explicit.
