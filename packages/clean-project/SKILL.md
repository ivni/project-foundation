---
name: clean-project
description: Clean a project's obsolete completed-work materials and disposable files while preserving current documentation, active work, and recoverable data. Use when asked to clean up a project; respect audit-only requests.
---

# Clean Project

Remove obsolete project-local materials and temporary files when their purpose has ended. Keep the
working code, current documentation and everything needed to operate, develop and recover the
project. Work in the user's language. This skill works with or without Project Foundation artifacts.

An explicit request to clean the project authorizes safe local cleanup and the documentation/link
updates necessary for it; a direct invocation with no narrower instruction is such a request.
An audit-only or read-only request means inventory and recommendations only. Do not commit, push,
publish, delete remote issues or resources, change global configuration,
or touch other projects unless separately authorized. A skill invocation is not permission to discard
uncommitted user work or irrecoverable data whose ownership and purpose are unknown.

## Inspect and classify

Resolve the project root and requested boundaries. Read project/agent instructions, Git status,
current documentation and relevant phase, feature and recovery state. Identify active owners and
ongoing work before touching their files. Inspect ignored and untracked files as well as tracked
files, without dumping secrets or scanning outside the project; avoid following symlinks or crossing
mounts. Limit expensive size scans to relevant directories. Report incomplete visibility honestly.

Identify candidates by actual purpose and current references, not by age, name, extension or size:

- Completed-work plans, phase slices, checklists, discovery drafts and similar delivery records can
  become obsolete. Establish the *whole* feature or phase is complete and no open gate, unfinished
  sibling, later work, active owner or recovery depends on the candidate. A checked subphase alone
  does not make its phase obsolete. Inspect current references, scripts, tests and agent workflows.
- Logs, reports, archives, screenshots, videos, scratch data, build/test outputs and temporary
  environments can be removed when generated for finished work and no longer needed. A screenshot,
  video or archive that is a product asset, fixture, source or requested deliverable is not temporary.
- Current requirements, product behavior, ADRs, operations/runbooks, security guidance, migrations,
  test fixtures and live configuration remain when they still describe or support the project, even
  when created during a completed phase. Determine usefulness from content and consumers.

For a candidate with durable information still needed, first move or reconcile that information in
the existing canonical documentation, then update live links, indexes and workflow instructions.
Do not silently drop acceptance obligations, open risks, unresolved decisions or historical context
needed to understand an active design. A checked box or Git history alone does not prove a file has
no remaining consumer. If the necessary canonical home or meaning cannot be established, preserve
the material and identify the precise unresolved issue.

Before changes, present a concise inventory of candidates, reasons, approximate sizes when useful,
what remains, and any uncertainty. An explicit cleanup request allows proceeding with proven safe
candidates without another routine confirmation. Preserve modified/staged or untracked user work and
unknown or irreplaceable data unless its owner and disposal are established or the user explicitly
selects it. Check recoverability of tracked files and any needed untracked data, not just existence of
a Git repository. Never create a backup archive merely to make deletion look safe.

## Clean and verify

Stop and await any task-owned process using disposable resources before removal; do not stop an
unrelated or active user process. Recheck exact paths, ownership, type and current state immediately
before removal. Remove individual proven candidates, not broad directories with mixed or unknown
contents. Do not follow links outside the boundary. Preserve `.git`, secrets, user data, shared
services and volumes; do not prune containers, databases, package caches or dependencies merely
because they are large. Never change Git history or reset unrelated work.

Keep the actual evidence needed until completion/recovery has been verified, then remove disposable
reports, archives, media and logs rather than maintaining a new cleanup archive. If a phase or feature
is still active, keep its plan, traceability, checkpoints, review ledger and anything it still needs.
Reconcile live metadata pointers before removing their targets. A pending delivery gate or a stale
status alone does not establish completion; investigate the authoritative progress and actual state.

Inspect the resulting diff and remaining links and references. Run the project's applicable existing
documentation and verification checks, including checks that consume changed files. If cleanup affects
running services, validate the affected service state. Verify that intended candidates are gone, that
current docs and active-work references remain valid, and report removed items, space recovered when
measured, retained material and concrete blockers. Do not claim an exhaustive cleanup when paths or
ownership could not be assessed.
