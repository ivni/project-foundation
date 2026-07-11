# Platform checklists

Stack-agnostic questions that must be answered **early** — in bootstrap discovery or
in the audit gap analysis — because retrofitting them is an order of magnitude more
expensive than deciding them up front. Each question ships with a hard default;
answering differently is fine, silently not answering is not. Record the answers in
`CLAUDE.md` (Security & platform rules / Observability rules) and, where the decision
was contested, in an ADR.

## Observability

- **Structured logging** (JSON or equivalent) from day one, everywhere — app, workers,
  scheduled jobs. Default: yes, no plain-text printf logging.
- **Correlation / request id** generated at the edge, propagated through every layer
  (API → DB logs → background jobs → outbound calls), echoed in responses. Default: yes.
- **Health endpoints**: liveness (`/health`) and readiness (`/ready`) or the platform's
  equivalent. Deploy verifies them. Default: yes.
- **Error tracking** (Sentry-compatible or equivalent) wired before real users exist.
  Default: yes.
- **Metrics** for hot paths and queues, scraped by something. Default: yes for anything
  with a worker/queue; a bare CRUD app may defer with a register entry.
- **Two journals, never conflated**: the business **audit log** (who did what — in the
  primary DB, surfaced in the product) vs **ops telemetry** (logs/metrics/traces).
  Default: separate from the start.
- If the domain needs tamper-evidence: audit log is append-only, hash-chained, and
  retention never deletes individual records from an open chain. Default: only when
  the domain demands accountability (HR, finance, access control).

## Security & access

- **Humans vs machines are separate auth channels.** Decide each explicitly, e.g.
  server-side sessions for humans (instant revocation) vs API keys for machines.
  Record the choice and its revocation story in an ADR. Default: sessions + keys;
  choose stateless tokens only with an explicit revocation answer.
- **Instant deactivation path**: one action kills a person's sessions and keys and
  surfaces what they owned. Default: designed in phase 1, not "later".
- **A machine credential is never broader than its owner**; scopes narrow, never widen.
  Store hashes, show secrets once, identify by prefix.
- **CSRF protection** on state-changing requests for cookie-authenticated web apps.
  Default: yes.
- **Least privilege for service accounts**: admin-created, owned by a human, expiring,
  audited under their own identity.
- **File uploads/downloads** go client ↔ object storage via short-lived presigned URLs;
  files inherit the permission model of the entity they attach to. Default: yes when
  files exist at all.

## Data & integrity

- **Time**: store UTC (`timestamptz` or equivalent), display in a configured timezone.
  Default: yes, no exceptions; local-time storage is a permanent tax.
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
  twice (schedulers, cron emitters, migration runners) is identified in `CLAUDE.md`
  gotchas, and the deployment mechanically prevents duplicates.
- **Bulk external actions are jittered** (notifications, emails) — never one burst;
  never notify a user about their own action.
- **Maintenance mode**: some way to say "down on purpose" that is distinguishable from
  "down by accident". Default: a simple flag/page is enough; having none is not.
