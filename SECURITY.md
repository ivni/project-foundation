# Security policy

## Supported versions

Security fixes are released for the latest published major version.

## Reporting a vulnerability

Do not open a public issue containing vulnerability details. Email the maintainer at
[rus.nikiv@gmail.com](mailto:rus.nikiv@gmail.com) with the subject `Project Foundation security`.
Include the affected version, operating system, reproduction steps, impact, and any suggested
mitigation.

If email is unavailable, open a minimal GitHub issue asking the maintainer to establish a private
contact channel. Do not include technical details in that issue.

Do not include real credentials or private repository data. Use isolated temporary directories in
proofs of concept.

## Installer trust model

The CLI writes only to previewed skill targets, its managed user-data store, and its backup directory.
It does not collect telemetry, write `.git`, run mutating Git commands, elevate privileges, or execute
installed agent CLIs. Project-scope installation writes ordinary working-tree files, which remain
under the user's Git review and version-control responsibility.
Published skill content should be reviewed with the same care as executable automation because agents
may follow its instructions and run referenced tools.
