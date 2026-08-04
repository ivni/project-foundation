# Blind-spot lenses

Select lenses by relevance. Do not copy this list into the report and do not manufacture a finding
for every heading. The purpose is to change perspective until hidden dependencies and assumptions
become visible.

## Product and outcome

- **Problem reality:** What evidence shows the problem exists, for whom, and at what frequency or
  severity? Is the proposed feature solving a cause, a symptom, or an internal preference?
- **Success and guardrails:** What observable outcome would count as success? What must not worsen?
- **Alternatives:** What do users do today, including doing nothing? Why would they switch?
- **Incentives:** Which user, buyer, operator, or partner benefits, pays, bears risk, or can block the
  change?
- **Non-goals:** Which adjacent expectations will the proposal accidentally create?

## User experience and behavior

- **Primary journey:** Can a named user move from trigger to value without an unexplained step?
- **First use and return use:** Do onboarding, empty state, learned behavior, and repeat workflows
  require different designs?
- **Failure and recovery:** What does the user see when input is partial, stale, duplicated, delayed,
  unauthorized, or rejected? Can they recover without support?
- **Trust and comprehension:** Which irreversible or surprising effects need preview, explanation,
  consent, confirmation, or undo?
- **Accessibility and environment:** Keyboard, screen reader, contrast, localization, time zones,
  slow networks, offline use, small screens, and interruption.
- **Exit:** Export, cancellation, deletion, account closure, and the experience after the user stops
  using the feature.

## Scope and domain boundaries

- **Ownership:** Which component, team, vendor, or user owns each state transition and source of
  truth?
- **Vocabulary:** Do the same terms mean different things to product, users, code, and integrations?
  A term carrying two meanings is an upstream unknown, not a naming nit — report the ambiguity and
  route the resolution to the project's glossary.
- **Lifecycle:** Creation, draft, approval, activation, change, expiry, suspension, deletion,
  restoration, and audit.
- **Invariants:** What must remain true across retries, concurrency, partial failure, and migration?
- **Out-of-scope behavior:** What happens when inputs or use cases cross the intended boundary?

## Data, identity, and trust

- **Data classification:** Personal, sensitive, regulated, confidential, derived, or user-owned data.
- **Minimization and retention:** Why is each field collected, how long is it retained, and how is it
  deleted from primary stores, logs, caches, analytics, and backups?
- **Identity model:** Human versus machine identity, tenants, roles, delegated access, impersonation,
  session lifetime, and revocation.
- **Authorization location:** Where is access enforced, and can indirect paths bypass it?
- **Auditability:** Which actions need provenance, tamper evidence, or an explanation to users and
  operators?
- **Abuse:** Spam, enumeration, scraping, resource exhaustion, privilege escalation, poisoned input,
  and unsafe generated output.

## Systems and integrations

- **Contracts:** Schema/version ownership, compatibility policy, limits, ordering, duplicate delivery,
  and deprecation.
- **Failure domains:** Timeout, rate limit, partial response, stale data, dependency outage, clock
  skew, and inconsistent success acknowledgement.
- **Consistency:** Which operations need strong consistency, monotonic reads, or eventual convergence?
- **Idempotency and retries:** Can an action repeat safely after an unknown outcome?
- **Capacity:** Peak rather than average load, fan-out, payload size, storage growth, hot keys, and
  cost ceilings.
- **Replaceability:** What happens if the vendor, API, model, platform, or license changes?

## Delivery and operations

- **Observability:** Can operators distinguish user error, product defect, dependency failure, abuse,
  and capacity pressure? Are sensitive values excluded from telemetry?
- **Support:** What evidence can support inspect, and what safe remediation can they perform?
- **Rollout:** Feature flags, cohorts, dark launch, compatibility window, success/abort signals, and
  kill switch.
- **Migration:** Backfill, dual read/write, old clients, interrupted migration, validation, and
  rollback after new data has been written.
- **Ownership:** Who responds, approves risky actions, maintains the dependency, and decides when to
  disable the feature?
- **Economics:** Variable cost, worst-case cost, operational load, and incentives that can drive
  unexpected usage.

## Perspective shifts

Use these when the direct review stops producing useful findings:

- **Demo script:** Walk through the exact first successful use. Every hand-wave is a candidate
  unknown.
- **Support article:** Explain setup, common failure, recovery, cancellation, and deletion. Missing
  explanations often expose missing product behavior.
- **Launch announcement:** State who receives value and what changes. Vague claims expose an unclear
  outcome or audience.
- **Pre-mortem:** Imagine the launch failed six months later. Identify the earliest observable signal
  and the decision that could have prevented it.
- **Time travel:** Inspect day one, first scale event, first incident, first migration, and end of life.
- **Hostile environment:** Assume stale clients, duplicated requests, malicious input, dependency
  outage, and an interrupted operator.
- **Downstream consumer:** Review the design from the perspective of analytics, support, finance,
  compliance, another API client, and the next engineer.
- **Reverse path:** Start from deletion, rollback, refund, revocation, or recovery and work backward to
  the state that makes it possible.

## Distinguish the output types

- An **unknown** is missing information that can change a decision.
- An **assumption** is an unverified proposition currently being treated as true.
- A **contradiction** is incompatible evidence or requirements.
- A **risk** is an uncertain event with impact; it may remain after the relevant unknown is answered.
- A **task** is work already justified by a decision; it is not a blind spot.
- An **idea** is a possible solution; it should not displace the question being analyzed.

When a candidate is only a task or idea, omit it or restate the upstream unknown that makes it
relevant.
