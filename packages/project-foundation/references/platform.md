# Platform checklists

Stack-agnostic questions that must be answered **early** — in bootstrap discovery or
in the audit gap analysis — because retrofitting them is an order of magnitude more
expensive than deciding them up front. Rules are capability-conditional: apply them
when discovery marks the capability applicable; do not build infrastructure for an N/A
capability. A planned capability enters stages or the register with a trigger. Unlabeled
bullets and `Default:` statements are SHOULD unless the rule explicitly says MUST,
never, or only. Record a rationale for a SHOULD deviation; use a mini-ADR when it is
cross-cutting. Promote answers into the
agent contract (Project shape & applicability / Security & platform rules /
Observability rules) and,
where the decision was contested, into an ADR.

## Observability

- **Structured logging** (JSON or equivalent) from day one, everywhere — app, workers,
  scheduled jobs. Default: yes, no plain-text printf logging.
- **Correlation / request id** generated at the edge, propagated through every layer
  (API → DB logs → background jobs → outbound calls), echoed in responses. Default: yes.
- **Health signals for deployed services**: liveness (`/health`) and readiness
  (`/ready`) or the platform's equivalent. Deploy verifies them. Default: yes for a
  long-running deployable service; N/A to packages and local-only tools.
- **Error tracking** (Sentry-compatible or equivalent) wired before real users exist.
  Default: yes.
- **Metrics** for hot paths and queues, scraped by something. Default: yes for anything
  with a worker/queue; a bare CRUD app may defer with a register entry.
- **Two journals, never conflated**: the business **audit log** (who did what — in the
  primary DB, surfaced in the product) vs **ops telemetry** (logs/metrics/traces).
  Default: separate from the start.
- If the domain needs tamper-evidence, define the attacker and the verification anchor.
  An append-only hash chain detects history modification only when its trusted head,
  signature, or key is protected outside the mutable log. A privileged-storage threat
  requires an external anchor, immutable/WORM storage, or an equivalent independently
  protected ledger. Never call an unanchored chain tamper-evident. Retention must
  preserve verifiability. Default: only when the domain demands accountability.

## Security & access

- **Humans vs machines are separate auth channels.** Decide each applicable channel
  explicitly. Default for browser/server systems: revocable server-side sessions for
  humans and scoped keys or service identities for machines. Native or delegated clients
  use an appropriate OAuth/OIDC flow with a revocation story. Choose stateless bearer
  tokens only with an explicit revocation answer. Record the choice in an ADR.
- **Authentication bypasses never ship.** Stubs are allowed only in tests or explicitly
  local development modes, must fail closed elsewhere, and must be absent or unreachable
  in released artifacts. When auth is applicable in phase 0, exercise a minimal real
  authentication path.
- **Instant deactivation path**: one action kills a person's sessions and keys and
  surfaces what they owned. Default: designed in phase 1, not "later".
- **Delegated machine credentials never exceed the delegating principal.** Independent
  workload identities instead receive only the permissions their workload needs and
  have an accountable owner or team, rotation and revocation paths, and audit records.
  For bearer API keys, store hashes, show the secret once, and identify it by prefix.
- **CSRF protection** on state-changing requests for cookie-authenticated web apps.
  Default: yes.
- **Least privilege for workload identities**: separately identifiable, never borrowed
  from a human account, owned by an accountable person or team, rotated or expiring when
  the mechanism supports it, and audited under their own identity.
- **File transfer and storage** follow the execution topology. Networked multi-client
  systems default to client ↔ object storage transfer via short-lived presigned URLs;
  local client applications use platform-native sandboxed storage. Files inherit the
  permission and lifecycle model of the entity they attach to.

## Data & integrity

- **Time (MUST when temporal data is persisted)**: store instants in UTC
  (`timestamptz` or equivalent), display in a configured timezone, and preserve source
  timezone/offset when the domain needs it. Model recurring local-time schedules
  explicitly rather than pretending they are UTC instants.
- **Idempotency**: write APIs with side effects accept an `Idempotency-Key`; the first
  result is stored and replayed on retry; key reuse with a different body is rejected.
  Default: yes for anything a client might retry (payments, task creation, sends).
- **Transactional outbox** for domain events that trigger external delivery (email,
  chat, webhooks): the event is committed with the data, delivery happens from the
  outbox, never directly inside the domain transaction. Default: yes once any
  notification/integration exists.
- **Deletion policy** decided per entity: soft-delete/trash vs hard delete, and who can
  purge. Default: soft-delete for user-created content.
- **Migrations** are forward-only, generated, reviewed, and preceded by an automatic
  backup (see [gates.md](gates.md)).

## Operations

- **Runbooks** exist for deploy, restore-from-backup, and credential rotation — exact
  commands, expected outputs (see [artifacts.md](artifacts.md)).
- **Restore is rehearsed**: a backup that has never been restored is a hope, not a
  backup. Default: rehearse once during phase 0/1, then after any storage change.
- **Single-instance components are named and enforced.** Anything that must not run
  twice (schedulers, cron emitters, migration runners) is identified in the agent contract
  gotchas, and the deployment mechanically prevents duplicates.
- **Bulk external actions** SHOULD be jittered rather than emitted in one burst.
  Suppress self-notifications by default; opt in only when the product requires them.
- **Maintenance mode for user-facing deployed runtimes**: some way to say "down on
  purpose" that is distinguishable from "down by accident". Default: a simple flag or
  page is enough. N/A to packages and local-only tools.
