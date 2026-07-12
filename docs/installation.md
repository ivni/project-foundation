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

1. Choose one or more agent environments. Detected agents are preselected.
2. Choose `User` or `Project` scope.
3. Confirm the project root when using project scope.
4. Choose `Link` or `Copy`.
5. Review every target path.
6. Confirm the installation.

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
both the installer and the exact Project Foundation skill payload. The selected skill directories
remain after `bunx` exits.

## Existing content

If a destination already exists, the installer compares its payload before changing anything.
Matching content can be adopted. Different content offers only explicit actions:

- Show diff
- Remove and replace
- Remove, back up, and replace
- Keep the existing content and skip that target

Backups are stored in the platform user-data directory, never inside the user's repository.
