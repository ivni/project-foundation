## Fix at the root cause

Fix each validated defect at its cause within the agreed task. Identify the violated behavior and
the callers, data, and contracts affected by the fix. Check those paths rather than only the reported
line. A recurrence is evidence that the earlier fix or its assumptions need reconsideration.

Use proportionate evidence:

- For an ordinary local defect, use a focused regression test or an existing check that observes the
  failure. When practical, reproduce it before editing and confirm the fix with the same check.
- For permissions, concurrency, migrations, irreversible operations, and recovery, exercise the
  relevant failure states and operation ordering. Isolate mutable test state when another process
  could change the result; do not treat interference as evidence of a defect or a fix.
- If a check is the only evidence for a fix, establish that it detects the failure. Reuse an applicable
  red/green result; do not repeat mutation testing of unchanged checks on every pass. If mutation is
  needed, use an isolated copy and preserve the working tree.
- When execution is unavailable, distinguish code evidence from unverified runtime claims. Explain
  the gap and escalate or defer under the blocking rules if the fix cannot be established reliably.

Reuse or adapt existing tests before adding one for a concrete gap in regression protection. A
temporary diagnostic does not automatically need to become a permanent test. Maintain tests affected
by the fix: remove obsolete expectations when their contract has changed, and consolidate duplicates
only when a retained check detects the same failure under the relevant conditions. Preserve unique
boundaries, error paths, and regression cases; different test levels may protect different failures.
Prefer observable outcomes, while retaining internal checks that enforce a real contract such as
operation ordering. Do not delete or weaken tests merely because they fail, are flaky, slow, or hard
to update; a green suite after deletion does not establish redundancy. If protection is unclear,
retain it. Briefly explain removals and retained protection in the existing fix record and run
applicable checks. During the loop, change tests only as needed to fix a validated defect; optional
cleanup, even in affected tests, remains advisory work under **Classify what blocks**. Test count and
coverage growth are not goals; required project gates and coverage thresholds remain in force.

Search for related instances when the root cause gives a concrete reason to expect them. Inspect
relevant callers or occurrences, and fix only demonstrated defects within scope. Summarize affected
paths and unresolved instances; a complete repository-wide hit ledger is not required for every fix.
Repeated syntax or a second similar implementation is not, by itself, evidence of a defect class.

Removing the cause does not require a universal detector of every future instance. Add shared types,
constraints, or checks when they provide a bounded, reliable defense for an actual recurring risk.
Building or broadening a language parser, a general policy checker, or another prevention framework is
separate scope, not an automatic condition for closing a finding. Do not widen a check's promise beyond
what it can establish. Existing checks that the fix relies on must still support their stated claims.

A fix may add a focused test or assertion. Ask before expanding the agreed task through a new public
interface, dependency, architecture, data model or migration, security policy, or production action.
Preserve unrelated work. A lack of permission for a broad redesign is not permission for an unsafe
local patch.

Update a document when a reader's decision, action, or contract would otherwise become wrong. A
decision-only finding needs a bounded decision, routed open question, or corrected statement, not a
description of the implementation. Operational commands and external contracts remain substantive
even in Markdown. Do not add a permanent invariant or ADR merely because a review found a defect;
use one only when it records a lasting rule or decision. Deferred defects still follow the register
requirements in **Classify what blocks**.

Before requesting another pass, inspect the fix diff and its affected interactions, and run relevant
available checks. Reuse trustworthy results for unaffected behavior; run the required full gate at the
repository's commit, merge, or release boundary. Keep the ledger concise: cause, changed paths,
evidence, disposition, and any remaining limitation. Reference existing tests, commands, and CI results
instead of copying their contents into permanent project documents.

Write comments for a reader who never saw the review. Explain the non-obvious reason or constraint;
keep pass numbers and finding history in the review record.
