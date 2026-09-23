---
name: analyze-tests
description: Analyze a test suite for safe removal or consolidation, parallel execution, and other performance improvements. Report evidence and proposals first; apply selected proposals only on a separate explicit command. Use for test-suite audits and test-runtime optimization, not ordinary feature implementation or a single failing test.
---

# Analyze Tests

Assess what protection a suite provides and what its execution costs. Return actionable proposals in
three areas: removal or consolidation, parallelism, and other speed improvements. Use the user's
language. This skill works without Project Foundation artifacts or any particular test framework.

## Modes and authority

**Analyze is the default.** Inspect code, configuration, and existing results. Return the report in
the response; do not edit tests, source, configuration, snapshots, baselines, or project documents.
Do not install dependencies, trigger remote CI, commit, or create a permanent report unless requested.
Even a request to "optimize the tests" starts with a report. Do not apply proposals in the same turn.

Analysis permits bounded existing test and profiling commands in a safe local environment without
another confirmation. Prefer existing evidence when it is sufficient. Before running commands, check
their setup, teardown, services, credentials, and write targets. Use disposable local resources and
direct logs, caches, and generated artifacts outside the working tree where practical. Measurement
does not authorize changing the suite or using live shared data. If safe isolation is unavailable,
continue with static evidence, report the limitation, and propose the measurement. Do not benchmark
modified implementations during Analyze mode; those experiments belong to separately selected work.
Respect a stricter static-only or read-only request: it rules out even temporary output and test-side
mutations.

**Apply requires a later explicit user command** identifying proposals from a report, such as
"apply T-02 and T-05" or "apply all recommendations in that report." That authorizes the selected
changes and their local verification, without another routine confirmation. It does not authorize
unselected work, publishing, production actions, or spending on additional CI capacity. If the report
or selection is ambiguous or unavailable, ask for it before editing. Read
[references/apply.md](references/apply.md) only when entering Apply mode.

## Establish scope and evidence

Identify the requested suite or use the current repository. Read its agent instructions and test
commands, runner configuration, relevant CI jobs, fixtures, setup/teardown, helpers, and implementation
contracts. Include default and slow suites, retries, skips, sharding, coverage, and required gates.
Do not assume the default command discovers every test. Distinguish test files, collected test cases,
and parameterized executions when reporting counts.

Prefer existing timing reports, CI logs, profiles, coverage, and failure history. State their date,
revision or working-tree state, command, environment, worker count, and cache conditions when known.
Do not call old CI data a current baseline. Separate measured facts, code-based inference, and unknowns.
If the suite is large, prioritize expensive jobs and shared setup, then inspect representative tests;
state what was sampled and what remains unreviewed. Do not claim an exhaustive audit from a sample.

Distinguish total CPU/runner time, test execution wall time, and time to required CI completion. Map
job dependencies and the critical path before claiming a change will accelerate feedback. Account for
setup, queueing, service startup, retries, teardown, and artifact merging where evidence permits.
Without timing evidence, give a ranked hypothesis and measurement plan, not invented seconds or
speedup percentages. A single run is an observation, not a stable performance estimate.

## 1. What can be removed or consolidated

For each candidate, identify the requirement, failure mode, relevant inputs and state, and assertions.
Recommend removal only when the requirement or supported path has actually been retired, or a named
retained check detects the same failure under the relevant conditions. Compare its environments,
triggers, frequency, and blocking status too: a nightly check is not equivalent to a required PR check.
Later or non-blocking detection is a policy tradeoff requiring explicit selection of that tradeoff,
not safe duplicate removal. Preserve unique boundaries, error paths, historical regression cases,
and security or data-integrity protection.

Similar names, overlapping coverage, and tests at different levels do not establish redundancy. A
unit test and an integration test can protect different failures of the same behavior. Internal
assertions may enforce a real contract such as operation ordering, query count, or resource limits.
Tests that merely mirror incidental implementation details are candidates for replacement with
behavior checks; identify the protection the replacement must retain.

A test is not unnecessary merely because it fails, is flaky, slow, old, or hard to update. A green run
after deletion does not prove safety. When protection is unclear, recommend retaining it pending a
specific investigation. Distinguish deletion, consolidation, and moving a test to a slower lane; a
lane move changes feedback timing and may require a policy decision. Do not lower required coverage
thresholds, disable assertions, skip failures, or add retries to manufacture an improvement.

## 2. What can run in parallel

Inspect actual isolation at test, file, process, job, and shard boundaries. Trace shared database
schemas and cleanup, filesystem paths, ports, accounts, environment variables, process globals,
clocks, caches, external quotas, fixtures, and ordered dependencies. Separate:

- independent work with evidence it can run concurrently;
- work that needs specific isolation changes first;
- work that should remain serial, with the concrete shared constraint.

Name the boundary, proposed worker or shard strategy, prerequisites, and resource limits. Consider
nested runner/job concurrency, CPU and memory contention, database connection pools, duplicated setup,
startup costs, and uneven shard duration. More workers are not automatically faster. Preserve required
checks, complete test discovery, failure propagation, and coverage/artifact aggregation across shards.
Distinguish faster feedback from increased runner cost; respect existing capacity and budget.

Suggest a bounded validation comparing serial and proposed concurrent execution, including collision
and order-dependence checks for shared state. Treat untested isolation as a hypothesis, not a guarantee.
Do not run experimental parallel commands during static analysis.

## 3. What else can be faster

Tie each proposal to observed cost or a concrete mechanism: repeated service/process startup, costly
fixtures, excessive database resets, oversized datasets, fixed sleeps, polling, unnecessary builds,
repeated compilation, coverage overhead, or incorrect cache boundaries. Prefer the smallest effective
change; do not introduce a new runner or infrastructure without evidence that simpler changes fail.

Explain correctness tradeoffs. Fixture reuse must reset mutable state; caches need invalidation for
relevant inputs; condition-based waits need bounded timeouts and useful failures. Mocking an external
boundary or moving an assertion to a cheaper test level must retain the integration protection that
matters. Reducing tested environments or coverage frequency is a policy tradeoff, not a free speedup.
Do not move production behavior solely to make tests cheap without identifying the wider change.

## Report

Return a concise report with all three areas present; say when no justified proposal was found.
Start with scope, inspected evidence, baseline or its absence, and major limitations. Give proposals
stable IDs (`T-01`, `T-02`, ...); preserve IDs when updating the same report. Each proposal needs:

- category, priority, and concrete file/test/job references;
- evidence and confidence: measured, inferred, or needs investigation;
- proposed change and expected benefit, with units and assumptions when quantified;
- protection retained, risks, prerequisites, and dependencies on other proposal IDs;
- a bounded validation plan and a way to undo the change.

Group overlapping proposals so benefits are not double-counted. Rank by expected feedback benefit,
maintenance reduction, effort, and risk; do not invent numeric scores. Separate ready recommendations
from investigations and policy decisions. Include a short "retain" list when tempting removals or
parallelization would lose useful protection. Do not impose a test-count or deletion target.

When ready proposals exist, end with their recommended order and an example command selecting their
IDs; do not execute it. Otherwise, state that no change is currently justified and name a bounded next
investigation only if useful. Do not invent a proposal to satisfy the report format. Before returning,
check that no proposal was applied, no promised protection disappeared, and measurements are clearly
distinguished from estimates. Disclose any temporary measurement artifacts or side effects; never
claim a measurement run was purely read-only.
