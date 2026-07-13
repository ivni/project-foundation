# Installation

## Requirements

- Bun 1.3 or newer
- An interactive terminal (TTY)
- At least one supported agent environment

Install Bun using the [official instructions](https://bun.com/docs/installation). Confirm it is
available:

```bash
bun --version
```

## Run the installer

```bash
bunx @ivni/project-foundation
```

The no-argument command opens the main menu. Select `Install`, then:

1. Choose one or more skills. All packaged skills are preselected.
2. Choose one or more agent environments. Detected agents are preselected.
3. Choose `User` or `Project` scope.
4. Confirm the project root when using project scope.
5. Choose `Link` or `Copy`.
6. Review every skill and target path.
7. Confirm the installation.

The wizard can edit any selection from the preview screen. It performs its full conflict preflight
before the first mutation.

## Direct command

```bash
bunx @ivni/project-foundation install
```

The command is still interactive. There is intentionally no unattended mutation mode in the first
release.

## What bunx installs

`bunx` runs the package without creating a permanent global CLI installation. The package contains
the installer and exact payloads for `project-foundation`, `find-blind-spots`, and
`run-discovery-interview`. The selected skill directories remain after `bunx` exits.

Each skill is installed as an independent immediate child of the agent's skill root, so agent
discovery does not depend on nested-skill behavior. Its package directory, target directory,
managed-store directory, and receipt all use the same `skillId`.

Schema 1 installations from older releases are not managed by this architecture. If an old target
occupies a selected path, installation uses the normal conflict screen and requires an explicit
choice to show the diff, replace it, back it up and replace it, or keep it.

## Existing content

If a destination already exists, the installer compares its payload before changing anything.
Matching content can be adopted. Different content offers only explicit actions:

- Show diff
- Remove and replace
- Remove, back up, and replace
- Keep the existing content and skip that target

Backups are stored in the platform user-data directory, never inside the user's repository.

When several skills are selected, the wizard preflights all of them before confirmation and wraps
their per-skill transactions in a suite transaction. If a later skill fails, earlier mutations from
the same confirmed operation are restored.
