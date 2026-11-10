---
name: analyze-tests
description: Analyze a test suite for aggressive removal of low-value tests, consolidation, database and E2E configuration improvements, parallel execution, and other performance improvements, with explicit protection tradeoffs. Report evidence and proposals first; apply selected proposals only on a separate explicit command. Use for test-suite audits and test-runtime optimization, not ordinary feature implementation or a single failing test.
---

# Analyze Tests

Reduce test execution and maintenance costs while keeping protection proportionate to meaningful
product risks. Actively seek low-value tests to remove, not just exact duplicates. Prioritize the
largest costs across removal or consolidation, parallelism, and other speed improvements. Use the
user's language. This skill works without Project Foundation artifacts or any particular test framework.

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

## Database and E2E configuration

Always establish whether tests use a database and an E2E runner. Inspect their actual configuration,
setup code, scripts, container/service definitions and CI overrides; do not infer effective settings
from a config file alone. Report significant local/CI differences, where values come from, and which
runtime values remain unknown. Redact credentials, tokens and connection strings. If either component
is absent or outside the requested scope, say so rather than inventing settings or requiring new tools.

For a test database, examine the engine/version and relevant differences from the supported runtime,
service startup and reuse, storage/resources, connection pools and connection limits, worker-specific
databases/schemas, migrations/schema creation, seeds/fixtures, and reset strategy (rollback, truncate,
recreate). Identify repeated setup, oversized data, slow resets, contention and connection exhaustion
risks. Relate runner/job concurrency to total connections and database capacity. Assess test-only
engine settings when evidence suggests a bottleneck; do not prescribe generic tuning values or change
production/shared database settings. Do not silently replace the engine or relax constraints,
transaction semantics, persistence or durability that the tested behavior relies on.

For E2E, examine browser/device/project matrices and overlapping runs, headless/headed mode, workers,
shards, serial groups, retries, test/assertion/action/navigation/global timeouts, fixed waits, global
setup/teardown, auth/session reuse, data isolation, and application build/startup/reuse/readiness.
Check the target environment and external dependencies without contacting live/shared targets merely
to inspect configuration. Review trace, screenshot, video and coverage capture/retention overhead.
Distinguish configured maximum timeouts from time actually spent waiting; lowering a timeout alone
does not accelerate successful tests that already finish earlier. Reuse must preserve state isolation,
and diagnostics reductions must leave useful failure evidence.

Connect proposed settings changes to measured cost or a concrete mechanism, and state effective
before/after values, test-only scope, correctness tradeoffs and bounded validation. Separate inventory,
measured bottlenecks and tuning hypotheses. Analyze mode does not authorize config edits, service
reconfiguration, new infrastructure or benchmarks with modified settings.

## 1. What can be removed or consolidated

Every retained test should justify its execution and maintenance cost through the future failures it
helps detect. For each candidate or coherent group, identify the requirement, failure mode, relevant
inputs/state, assertions, consequence of a missed failure, and cost. Distinguish:

- removal without material loss of protection: a retired requirement/path, a disposable acceptance
  probe whose purpose has ended, or a named retained check detecting the same failure;
- deliberate reduction of protection: a test, including a unique one, whose execution or maintenance
  cost is disproportionate to the low significance of the risk it covers. Name the failure that could
  now escape, why that risk is acceptable, and what protection remains. Do not demand a replacement
  solely because the test is unique. Selection of this proposal authorizes its stated tradeoff.

Compare environments, triggers, frequency, and blocking status when claiming equivalent protection:
a nightly check is not equivalent to a required PR check. Later or non-blocking detection is a policy
tradeoff, not safe duplicate removal. Security, permissions, data loss/corruption, irreversible actions,
and similarly consequential failures need strong retained protection or an explicit stakeholder risk
decision; do not classify their only protection as low-value based on execution cost alone.

Historical regression tests have no special immunity. Distinguish one-time acceptance evidence,
ongoing regression protection, and temporary transition checks. Reassess after release or the end of
a transition, but neither release, age, nor a history of green runs establishes obsolescence. A
migration check remains useful while supported upgrades, fresh installs, or recovery still need it.

Prioritize expensive E2E groups. Retain end-to-end checks for consequential user journeys and failures
of real component connections. Move business-rule variants, validation, and calculations to cheaper
levels when they can detect the relevant failures there; remove low-value variants where justified.
For each retained expensive E2E group, explain what system-level failure needs the whole chain.
Do not impose an E2E count or percentage, or replace real integration protection with mocks silently.

Similar names, overlapping coverage, and tests at different levels do not establish redundancy. A
unit test and an integration test can protect different failures of the same behavior. Internal
assertions may enforce a real contract such as operation ordering, query count, or resource limits.
Tests that merely mirror incidental implementation details are candidates for deletion or replacement
with behavior checks, according to the significance of the protection they provide.

Group candidates that share a deletion rationale instead of producing a dossier per test. Inspect
representative cases and check for exceptions, especially unique boundaries or consequential error
paths. List exact group members; mark unreviewed members as investigation rather than ready deletions.
Sampling is not evidence that every member is redundant or low-risk.

A test is not unnecessary merely because it fails, is flaky, slow, old, or hard to update. A green run
after deletion does not prove safety. When protection or consequences are unclear, name a bounded
investigation rather than guessing that the risk is low. Distinguish deletion, consolidation, and
moving a test to a slower lane; a lane move changes feedback timing and may require a policy decision.
Do not lower required coverage thresholds, disable assertions, skip failures, or add retries to
manufacture an improvement.

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

Start with the largest observed costs and the strongest concrete decisions: remove, consolidate,
move to a cheaper level, change frequency, accelerate setup/execution, or retain. State scope,
inspected evidence, baseline or its absence, and major limitations. Rank by expected impact and
confidence, not by section order or test count. Distinguish time to required feedback, runner/CPU
cost, and maintenance cost; fewer tests need not make CI faster. Briefly account for all three areas,
including when no justified proposal was found. Give proposals stable IDs (`T-01`, `T-02`, ...);
preserve IDs when updating the same report. Each proposal or coherent group needs:

- category, priority, and concrete file/test/job references;
- evidence: measured, inferred, or needs investigation; confidence and its basis separately;
- proposed change and expected benefit, with units and assumptions when quantified;
- protection retained, any deliberately lost protection and residual risk, prerequisites, and
  dependencies on other proposal IDs;
- a bounded validation plan and a way to undo the change.

Include a concise inventory and assessment of database and E2E settings, including absence or scope
limits, significant local/CI differences, and the highest-impact configuration recommendations.
Do not manufacture a tuning proposal when existing settings are appropriate or evidence is missing.

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
