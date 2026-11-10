---
name: clean-project
description: Clean a project's obsolete completed-work materials, disposable files, and unnecessary tests while preserving useful protection, current documentation, active work, and recoverable data. Use when asked to clean up a project; respect audit-only requests.
---

# Clean Project

Remove obsolete project-local materials, unnecessary tests, and temporary files when their purpose
has ended. Keep the working code, current documentation and everything needed to operate, develop and recover the
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
- Tests introduced or affected by completed work, and helpers/fixtures they used, are cleanup
  candidates too. Apply the test-maintenance rules below; source tests are not disposable test output.

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

### Test maintenance

Within the requested cleanup boundary, review tests attributable to or affected by completed work.
Remove retired expectations, equivalent duplicates, completed one-time probes without ongoing value,
and tests whose execution or maintenance cost is disproportionate to their low-significance risk.
A unique low-value test may be removed without replacement when that tradeoff is supported within
the authorized cleanup; name the missed failure and residual risk. Historical regression status gives
no immunity. Release, age, green history, or a failing/flaky test alone does not justify deletion.
Keep migration checks still needed for supported upgrades, installs, or recovery.

Prioritize expensive affected E2E. Keep consequential user journeys and real integration protection;
propose moving business-rule variants to cheaper checks when needed rather than silently losing that
protection. Group shared rationales, check exceptions, and identify exact deletions in the inventory.
Remove helpers/fixtures only after checking that no retained test or other consumer needs them.
Preserve strong protection for consequential failures such as permission bypass or data loss;
reducing it requires an explicit stakeholder risk decision. Investigate unclear protection rather
than assuming low risk. Do not weaken required gates or coverage thresholds, or hide test failures.

Routine cleanup does not require a whole-suite audit or a separate `analyze-tests` report/approval.
State retained protection and residual risk in the cleanup summary. Test-source changes require
applicable checks and any project-required independent review before commit/completion; never delete
tests after verification and keep claiming the earlier checked state. Broader test restructuring or
new infrastructure is a separate proposal, not implied by a request to remove project debris.

### Temporary materials and final verification

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
