# Updating

Use the latest published installer explicitly:

```bash
bunx @ivni/project-foundation@latest update
```

The update flow asks for a scope, discovers managed receipts for all eight packaged skills, and
preselects installations older than the package being run. Every choice includes the skill name. It
never replaces a newer installed version with an older package.

## Normal update

1. Choose user or project scope.
2. Select the outdated managed installations.
3. Review the version transitions and physical paths.
4. Confirm the operation.

Link installations update their per-skill shared managed payload. Native links remain in place. Copy
installations update each selected physical payload. Updating several skills uses the same outer
rollback boundary as installation.

Schema 1 content is not an update candidate because it has no required `skillId`. Run the install
flow instead; the existing target appears as unmanaged content and must be explicitly replaced,
backed up and replaced, or kept.

## Local modifications

When installed files no longer match their receipt, the wizard pauses and offers:

- Show diff
- Update and discard local modifications
- Back up the modified payload, then update
- Skip this installation

If `$PAGER` names an available pager, the full diff opens there. Otherwise the built-in viewer pages
through the diff inside the wizard.

## Breaking releases

Major SemVer updates require an additional confirmation. While the package is below 1.0, minor
updates are also treated as breaking. Read [CHANGELOG.md](../CHANGELOG.md) before accepting a breaking
update.

## Updating the installer itself

There is no globally installed Project Foundation executable to maintain. `bunx` resolves and runs the
package. Adding `@latest` makes the desired package version explicit.
